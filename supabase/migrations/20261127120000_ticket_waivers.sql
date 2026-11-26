-- Store tickets, part 2b (docs/ACCOUNT_TYPES.md, "Store", Tickets):
-- waivers.
--
--   * A store writes its waiver text. Each save is a new version, so a
--     signed waiver always points at the exact text that was agreed to.
--   * When a store has a waiver, a skater signs it when buying: full name,
--     date of birth, an emergency contact, a typed signature and an "I
--     agree" tick. One waiver per ticket (one ticket per skater per type).
--   * Staff see the signed waiver at the scan.
--   * The store owns the waivers; SkateMeet keeps each one for 30 days
--     after its ticket is finished, then deletes it (purge_ticket_waivers,
--     daily). Finished: a used or refunded ticket, or a pass past its last
--     day. A paid, unused session ticket keeps its waiver. A waiver for a
--     checkout that was never paid goes after a day.
--
-- Parental consent by email for Child buyers is part 2b-ii (Resend), once
-- Child accounts exist.

-- ── 1. The store's waiver text ─────────────────────────────────────────────

CREATE TABLE store_waivers (
  waiver_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_owner_id  UUID NOT NULL REFERENCES profiles(profile_id) ON DELETE CASCADE,
  version         INT NOT NULL CHECK (version >= 1),
  body            TEXT NOT NULL CHECK (char_length(btrim(body)) BETWEEN 20 AND 20000),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (store_owner_id, version)
);

ALTER TABLE store_waivers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON store_waivers FROM anon, authenticated;

-- The store's current (latest) waiver, or no row.
CREATE FUNCTION _current_store_waiver(p_owner UUID) RETURNS store_waivers
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT * FROM store_waivers WHERE store_owner_id = p_owner ORDER BY version DESC LIMIT 1;
$$;

CREATE FUNCTION get_my_store_waiver() RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := _assert_store_caller();
  v_waiver store_waivers;
BEGIN
  v_waiver := _current_store_waiver(v_uid);
  IF v_waiver.waiver_id IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN jsonb_build_object('version', v_waiver.version, 'body', v_waiver.body, 'updated_at', v_waiver.created_at);
END;
$$;

-- Saves a new version when the text changed. Returns the current version.
CREATE FUNCTION save_store_waiver(p_body TEXT) RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := _assert_store_caller();
  v_current store_waivers;
  v_body TEXT := btrim(coalesce(p_body, ''));
BEGIN
  IF NOT _store_can_edit_page(v_uid) THEN
    RAISE EXCEPTION '%', CASE WHEN _is_approved_store(v_uid) THEN 'STORE_UNPAID' ELSE 'STORE_NOT_APPROVED' END;
  END IF;
  IF char_length(v_body) NOT BETWEEN 20 AND 20000 THEN
    RAISE EXCEPTION 'INVALID_WAIVER_TEXT';
  END IF;
  v_current := _current_store_waiver(v_uid);
  IF v_current.waiver_id IS NOT NULL AND v_current.body = v_body THEN
    RETURN v_current.version;
  END IF;
  INSERT INTO store_waivers (store_owner_id, version, body)
  VALUES (v_uid, coalesce(v_current.version, 0) + 1, v_body);
  RETURN coalesce(v_current.version, 0) + 1;
END;
$$;

-- ── 2. Signed waivers ──────────────────────────────────────────────────────

CREATE TABLE ticket_waivers (
  ticket_id        UUID PRIMARY KEY REFERENCES tickets(ticket_id) ON DELETE CASCADE,
  waiver_id        UUID NOT NULL REFERENCES store_waivers(waiver_id) ON DELETE CASCADE,
  store_owner_id   UUID NOT NULL REFERENCES profiles(profile_id) ON DELETE CASCADE,
  buyer_id         UUID NOT NULL REFERENCES profiles(profile_id) ON DELETE CASCADE,
  full_name        TEXT NOT NULL CHECK (char_length(full_name) BETWEEN 2 AND 120),
  date_of_birth    DATE NOT NULL CHECK (date_of_birth > DATE '1900-01-01'),
  emergency_name   TEXT NOT NULL CHECK (char_length(emergency_name) BETWEEN 2 AND 120),
  emergency_phone  TEXT NOT NULL CHECK (emergency_phone ~ '^\+?[0-9 ()-]{6,30}$'),
  signed_name      TEXT NOT NULL CHECK (char_length(signed_name) BETWEEN 2 AND 120),
  signed_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ticket_waivers_store_idx ON ticket_waivers (store_owner_id, signed_at DESC);
CREATE INDEX ticket_waivers_buyer_idx ON ticket_waivers (buyer_id, signed_at DESC);

ALTER TABLE ticket_waivers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ticket_waivers FROM anon, authenticated;

-- What a buyer sees before paying: the store's current waiver (NULL when it
-- has none, so no signing is needed) and their own details from the last
-- waiver they signed anywhere, to fill the form in.
CREATE FUNCTION get_ticket_waiver_form(p_owner UUID) RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_waiver store_waivers;
  v_last ticket_waivers%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;
  v_waiver := _current_store_waiver(p_owner);
  IF v_waiver.waiver_id IS NULL OR NOT _is_approved_store(p_owner) OR is_blocked_between(v_uid, p_owner) THEN
    RETURN NULL;
  END IF;
  SELECT * INTO v_last FROM ticket_waivers WHERE buyer_id = v_uid ORDER BY signed_at DESC LIMIT 1;
  RETURN jsonb_build_object(
    'version', v_waiver.version,
    'body', v_waiver.body,
    'prefill', CASE WHEN v_last.ticket_id IS NULL THEN NULL ELSE jsonb_build_object(
      'full_name', v_last.full_name, 'date_of_birth', v_last.date_of_birth,
      'emergency_name', v_last.emergency_name, 'emergency_phone', v_last.emergency_phone) END
  );
END;
$$;

-- Called by the tickets edge function right after _begin_ticket_purchase,
-- before Stripe Checkout opens. When the store has a waiver, a signed one
-- for the current version is required; when it has none, p_waiver is
-- ignored. Raises WAIVER_REQUIRED, WAIVER_CHANGED or INVALID_WAIVER.
CREATE FUNCTION _attach_ticket_waiver(p_ticket_id UUID, p_buyer UUID, p_waiver JSONB) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_ticket tickets%ROWTYPE;
  v_waiver store_waivers;
  v_dob DATE;
BEGIN
  SELECT * INTO v_ticket FROM tickets WHERE ticket_id = p_ticket_id AND buyer_id = p_buyer AND status = 'pending';
  IF v_ticket.ticket_id IS NULL THEN
    RAISE EXCEPTION 'TICKET_NOT_ON_SALE';
  END IF;
  v_waiver := _current_store_waiver(v_ticket.store_owner_id);
  IF v_waiver.waiver_id IS NULL THEN
    RETURN;
  END IF;
  IF p_waiver IS NULL OR jsonb_typeof(p_waiver) <> 'object' THEN
    RAISE EXCEPTION 'WAIVER_REQUIRED';
  END IF;
  IF (p_waiver->>'version')::INT IS DISTINCT FROM v_waiver.version THEN
    RAISE EXCEPTION 'WAIVER_CHANGED';
  END IF;
  IF (p_waiver->>'agreed')::BOOLEAN IS NOT TRUE THEN
    RAISE EXCEPTION 'INVALID_WAIVER';
  END IF;
  BEGIN
    v_dob := (p_waiver->>'date_of_birth')::DATE;
  EXCEPTION WHEN others THEN
    RAISE EXCEPTION 'INVALID_WAIVER';
  END;
  IF v_dob IS NULL OR v_dob >= current_date THEN
    RAISE EXCEPTION 'INVALID_WAIVER';
  END IF;

  INSERT INTO ticket_waivers (ticket_id, waiver_id, store_owner_id, buyer_id, full_name, date_of_birth,
                              emergency_name, emergency_phone, signed_name)
  VALUES (p_ticket_id, v_waiver.waiver_id, v_ticket.store_owner_id, p_buyer,
          btrim(p_waiver->>'full_name'), v_dob,
          btrim(p_waiver->>'emergency_name'), btrim(p_waiver->>'emergency_phone'),
          btrim(p_waiver->>'signed_name'));
EXCEPTION
  WHEN check_violation OR not_null_violation THEN
    RAISE EXCEPTION 'INVALID_WAIVER';
END;
$$;

-- ── 3. At the scan ─────────────────────────────────────────────────────────

-- The signed waiver for staff, or {signed: false, required} when there's
-- none (required: the store has a waiver, so this skater should have one).
CREATE FUNCTION _ticket_waiver_json(p_ticket_id UUID, p_store UUID) RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(
    (SELECT jsonb_build_object(
       'signed', true,
       'version', s.version,
       'full_name', w.full_name,
       'date_of_birth', w.date_of_birth,
       'emergency_name', w.emergency_name,
       'emergency_phone', w.emergency_phone,
       'signed_name', w.signed_name,
       'signed_at', w.signed_at)
     FROM ticket_waivers w JOIN store_waivers s ON s.waiver_id = w.waiver_id
     WHERE w.ticket_id = p_ticket_id),
    jsonb_build_object('signed', false,
                       'required', EXISTS (SELECT 1 FROM store_waivers WHERE store_owner_id = p_store))
  );
$$;

DO $do$
DECLARE
  v_def TEXT := pg_get_functiondef('redeem_ticket(text)'::REGPROCEDURE);
BEGIN
  v_def := replace(v_def,
    $old$    'skater', _checkin_skater_json(v_ticket.buyer_id, v_under_18));$old$,
    $new$    'skater', _checkin_skater_json(v_ticket.buyer_id, v_under_18),
    'waiver', _ticket_waiver_json(v_ticket.ticket_id, v_store));$new$);
  IF position('_ticket_waiver_json' IN v_def) = 0 THEN
    RAISE EXCEPTION 'redeem_ticket rewrite did not apply';
  END IF;
  EXECUTE v_def;
END;
$do$;

-- ── 4. Retention ───────────────────────────────────────────────────────────

CREATE FUNCTION purge_ticket_waivers() RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_count INT;
BEGIN
  DELETE FROM ticket_waivers w
  USING tickets k
  WHERE k.ticket_id = w.ticket_id
    AND (
      (k.status IN ('pending', 'expired') AND k.created_at < now() - INTERVAL '1 day')
      OR (k.status = 'refunded' AND coalesce(k.refunded_at, k.created_at) < now() - INTERVAL '30 days')
      OR (k.status = 'used' AND k.used_at < now() - INTERVAL '30 days')
      OR (k.status = 'paid' AND k.kind = 'pass' AND k.valid_to < current_date - 30)
    );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

SELECT cron.schedule('purge-ticket-waivers', '43 3 * * *', 'SELECT public.purge_ticket_waivers()');

-- ── 5. Data export ─────────────────────────────────────────────────────────

DO $do$
DECLARE
  v_def TEXT := pg_get_functiondef('export_my_data()'::REGPROCEDURE);
BEGIN
  v_def := replace(v_def,
    $old$'ticket_checkins', _export_rows('ticket_checkins', 'buyer_id', v_uid),$old$,
    $new$'ticket_checkins', _export_rows('ticket_checkins', 'buyer_id', v_uid),
    'ticket_waivers', _export_rows('ticket_waivers', 'buyer_id', v_uid),$new$);
  IF position('''ticket_waivers''' IN v_def) = 0 THEN
    RAISE EXCEPTION 'export_my_data rewrite did not apply';
  END IF;
  EXECUTE v_def;
END;
$do$;

-- ── 6. Function access ─────────────────────────────────────────────────────

REVOKE EXECUTE ON FUNCTION
  _current_store_waiver(UUID), get_my_store_waiver(), save_store_waiver(TEXT),
  get_ticket_waiver_form(UUID), _attach_ticket_waiver(UUID, UUID, JSONB),
  _ticket_waiver_json(UUID, UUID), purge_ticket_waivers()
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION _attach_ticket_waiver(UUID, UUID, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION get_my_store_waiver(), save_store_waiver(TEXT), get_ticket_waiver_form(UUID) TO authenticated;
