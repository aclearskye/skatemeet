-- Store accounts, Phase 3: the Stripe subscription (docs/ACCOUNT_TYPES.md,
-- "Store", Billing / Unpaid stores).
--
--   * During onboarding the store saves a card with Stripe Checkout (setup
--     mode, so nothing is charged). A claim can't be submitted without one.
--   * On approval the store-billing edge function creates the subscription,
--     with a trial ending 14 days after the approval.
--   * Stripe bills monthly and retries a failed payment weekly (configured
--     in the Stripe dashboard: 2 retries, 7 days apart, then "mark the
--     subscription as unpaid"). Stripe's 'unpaid' is SkateMeet's "officially
--     unpaid". 'past_due' (still retrying) counts as paid.
--   * An unpaid store keeps its claim. Its owner can only update opening
--     hours, and purchasing (Phase 4) is blocked. Resubscribing restores both.
--
-- Only the edge functions (service role) write store_billing. Stripe ids
-- never reach other users.

-- ── 1. Billing state ───────────────────────────────────────────────────────

CREATE TABLE store_billing (
  profile_id             UUID PRIMARY KEY REFERENCES profiles(profile_id) ON DELETE CASCADE,
  stripe_customer_id     TEXT NOT NULL UNIQUE,
  payment_method_ready   BOOLEAN NOT NULL DEFAULT false,
  stripe_subscription_id TEXT UNIQUE,
  -- Stripe's subscription status, or NULL before a subscription exists.
  status                 TEXT CHECK (status IN (
                           'trialing', 'active', 'past_due', 'unpaid', 'canceled',
                           'incomplete', 'incomplete_expired', 'paused')),
  trial_end              TIMESTAMPTZ,
  current_period_end     TIMESTAMPTZ,
  cancel_at_period_end   BOOLEAN NOT NULL DEFAULT false,
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE store_billing ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON store_billing FROM anon, authenticated;
-- Read through get_my_store_billing(); the raw row stays server-side.

-- ── 2. Paid / unpaid ───────────────────────────────────────────────────────

-- When the claim was approved (the trial clock starts here).
CREATE FUNCTION _store_approved_at(p_profile_id UUID) RETURNS TIMESTAMPTZ
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT reviewed_at FROM store_claims WHERE profile_id = p_profile_id AND status = 'approved' LIMIT 1;
$$;

-- An approved store in good standing. Before the subscription exists (the
-- edge function creates it just after approval) the 14-day trial window
-- still counts, so a slow or failed Stripe call never locks a new store.
CREATE FUNCTION _store_is_paid(p_profile_id UUID) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _is_approved_store(p_profile_id) AND (
    EXISTS (
      SELECT 1 FROM store_billing
      WHERE profile_id = p_profile_id AND status IN ('trialing', 'active', 'past_due')
    )
    OR (
      NOT EXISTS (SELECT 1 FROM store_billing WHERE profile_id = p_profile_id AND status IS NOT NULL)
      AND _store_approved_at(p_profile_id) > now() - INTERVAL '14 days'
    )
  );
$$;

-- Phase 2 left this as "approved and not banned"; unpaid stores lose it.
CREATE OR REPLACE FUNCTION _store_can_edit_page(p_profile_id UUID) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _is_approved_store(p_profile_id) AND NOT _is_banned(p_profile_id) AND _store_is_paid(p_profile_id);
$$;

-- ── 3. The owner's billing view ────────────────────────────────────────────

CREATE FUNCTION get_my_store_billing() RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := _assert_store_caller();
  v_billing store_billing%ROWTYPE;
  v_approved_at TIMESTAMPTZ := _store_approved_at(v_uid);
BEGIN
  SELECT * INTO v_billing FROM store_billing WHERE profile_id = v_uid;
  RETURN jsonb_build_object(
    'payment_method_ready', coalesce(v_billing.payment_method_ready, false),
    'status', v_billing.status,
    'has_subscription', v_billing.stripe_subscription_id IS NOT NULL,
    'trial_end', coalesce(v_billing.trial_end,
                          CASE WHEN v_approved_at IS NOT NULL THEN v_approved_at + INTERVAL '14 days' END),
    'current_period_end', v_billing.current_period_end,
    'cancel_at_period_end', coalesce(v_billing.cancel_at_period_end, false),
    'is_approved', v_approved_at IS NOT NULL,
    'is_paid', _store_is_paid(v_uid)
  );
END;
$$;

-- ── 4. A claim needs a saved card ──────────────────────────────────────────

DO $do$
DECLARE
  v_def TEXT := pg_get_functiondef('submit_store_claim(text[], text)'::REGPROCEDURE);
BEGIN
  v_def := replace(v_def,
    $a$IF coalesce(array_length(p_evidence_paths, 1), 0) NOT BETWEEN 1 AND 5 THEN$a$,
    $b$IF NOT EXISTS (SELECT 1 FROM store_billing WHERE profile_id = v_uid AND payment_method_ready) THEN
    RAISE EXCEPTION 'BILLING_REQUIRED';
  END IF;
  IF coalesce(array_length(p_evidence_paths, 1), 0) NOT BETWEEN 1 AND 5 THEN$b$);
  IF position('BILLING_REQUIRED' IN v_def) = 0 THEN
    RAISE EXCEPTION 'submit_store_claim rewrite did not apply';
  END IF;
  EXECUTE v_def;
END;
$do$;

-- ── 5. Unpaid stores: opening hours only ───────────────────────────────────

DO $do$
DECLARE
  v_def TEXT;
BEGIN
  -- update_store_page already refuses when _store_can_edit_page is false;
  -- this just tells an unpaid owner why.
  v_def := pg_get_functiondef('update_store_page(text, text, text, text, text, text, text, text)'::REGPROCEDURE);
  v_def := replace(v_def,
    $a$IF NOT _store_can_edit_page(v_uid) THEN
    RAISE EXCEPTION 'STORE_NOT_APPROVED';$a$,
    $b$IF NOT _store_can_edit_page(v_uid) THEN
    RAISE EXCEPTION '%', CASE WHEN _is_approved_store(v_uid) THEN 'STORE_UNPAID' ELSE 'STORE_NOT_APPROVED' END;$b$);
  IF position('STORE_UNPAID' IN v_def) = 0 THEN
    RAISE EXCEPTION 'update_store_page rewrite did not apply';
  END IF;
  EXECUTE v_def;

  -- upsert_store_metadata: an unpaid owner can change opening hours and
  -- nothing else.
  v_def := pg_get_functiondef('upsert_store_metadata(uuid, text, jsonb, text[], text, boolean, boolean, boolean)'::REGPROCEDURE);
  v_def := replace(v_def,
    $a$  IF p_store_id IS NOT NULL THEN
    UPDATE store_metadata SET$a$,
    $b$  IF v_owner = v_uid AND NOT _store_is_paid(v_uid) AND EXISTS (
    SELECT 1
    FROM (SELECT 1) x
    LEFT JOIN store_metadata m
      ON (p_store_id IS NOT NULL AND m.store_id = p_store_id)
      OR (p_osm_place_id IS NOT NULL AND m.osm_place_id = p_osm_place_id)
    WHERE coalesce(m.facilities, '{}') IS DISTINCT FROM coalesce(p_facilities, '{}')
       OR m.parking IS DISTINCT FROM p_parking
       OR m.pet_friendly IS DISTINCT FROM p_pet_friendly
       OR m.paid IS DISTINCT FROM p_paid
       OR m.well_lit IS DISTINCT FROM p_well_lit
  ) THEN
    RAISE EXCEPTION 'STORE_UNPAID';
  END IF;

  IF p_store_id IS NOT NULL THEN
    UPDATE store_metadata SET$b$);
  IF position('STORE_UNPAID' IN v_def) = 0 THEN
    RAISE EXCEPTION 'upsert_store_metadata rewrite did not apply';
  END IF;
  EXECUTE v_def;
END;
$do$;

-- ── 6. Data export ─────────────────────────────────────────────────────────

DO $do$
DECLARE
  v_def TEXT := pg_get_functiondef('export_my_data()'::REGPROCEDURE);
BEGIN
  v_def := replace(v_def,
    $old$'store_public_details', _export_rows('store_public_details', 'profile_id', v_uid),$old$,
    $new$'store_public_details', _export_rows('store_public_details', 'profile_id', v_uid),
    'store_billing', _export_rows('store_billing', 'profile_id', v_uid),$new$);
  IF position('''store_billing''' IN v_def) = 0 THEN
    RAISE EXCEPTION 'export_my_data rewrite did not apply';
  END IF;
  EXECUTE v_def;
END;
$do$;

-- ── 7. Function access ─────────────────────────────────────────────────────

REVOKE EXECUTE ON FUNCTION
  _store_approved_at(UUID), _store_is_paid(UUID), _store_can_edit_page(UUID), get_my_store_billing()
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION get_my_store_billing() TO authenticated;
