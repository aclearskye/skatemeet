-- Store tickets, part 1 (docs/ACCOUNT_TYPES.md, "Store", Tickets): stores
-- create tickets, skaters buy them. Entry scanning, waivers, parent consent
-- and refunds come later.
--
--   * A store opts in by connecting a Stripe account (Connect, Standard,
--     direct charges): the money goes straight to the store and the store is
--     the merchant of record. Never IAP: entry to a venue is a service used
--     outside the app (App Store 3.1.3(e), Google Play payments policy).
--   * Ticket types: a SESSION is one entry on a weekday (e.g. "Free Skate
--     2-9pm (Saturday)"). An unused session ticket stays good for a later
--     session of the same day of the week. A PASS is valid from one date to
--     another (e.g. "Monthly Skate Pass", 1-31 Dec).
--   * One ticket per purchase: each ticket carries its own buyer (and,
--     later, its own signed waiver).
--   * A ticket row is created 'pending' when checkout starts, with a snapshot
--     of the ticket type, and turns 'paid' (and gets its QR token) only when
--     the Stripe webhook confirms payment.
--   * Adults can buy. A Child can buy only at stores that turn on under-18
--     sales, up to UNDER_18_CAP_MINOR per ticket. Child accounts don't exist
--     yet (account_type is 'user' | 'store'), so that branch is inert until
--     the Child band lands as account_type = 'child'.

-- ── 1. The store's Stripe account ──────────────────────────────────────────

CREATE TABLE store_ticketing (
  profile_id         UUID PRIMARY KEY REFERENCES profiles(profile_id) ON DELETE CASCADE,
  stripe_account_id  TEXT NOT NULL UNIQUE CHECK (stripe_account_id ~ '^acct_[A-Za-z0-9]+$'),
  -- Mirrors of the Stripe account, kept current by account.updated.
  charges_enabled    BOOLEAN NOT NULL DEFAULT false,
  details_submitted  BOOLEAN NOT NULL DEFAULT false,
  currency           TEXT NOT NULL DEFAULT 'GBP' CHECK (currency ~ '^[A-Z]{3}$'),
  allow_under_18     BOOLEAN NOT NULL DEFAULT false,
  -- Weekdays and pass dates are read in the store's local time.
  timezone           TEXT NOT NULL DEFAULT 'Europe/London' CHECK (char_length(timezone) <= 64),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE store_ticketing ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON store_ticketing FROM anon, authenticated;

-- ── 2. Ticket types ────────────────────────────────────────────────────────

CREATE TABLE ticket_types (
  ticket_type_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_owner_id  UUID NOT NULL REFERENCES profiles(profile_id) ON DELETE CASCADE,
  kind            TEXT NOT NULL CHECK (kind IN ('session', 'pass')),
  name            TEXT NOT NULL CHECK (char_length(name) BETWEEN 2 AND 80),
  description     TEXT CHECK (char_length(description) <= 500),
  -- Minor units (pence). Stripe's GBP minimum is 30p.
  price_minor     INT NOT NULL CHECK (price_minor BETWEEN 30 AND 100000),
  currency        TEXT NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  -- Session: 0 = Sunday ... 6 = Saturday (EXTRACT(DOW), JS getDay), with an
  -- optional time window.
  weekday         SMALLINT CHECK (weekday BETWEEN 0 AND 6),
  start_time      TIME,
  end_time        TIME,
  -- Pass: the first and last valid day, at most a year apart.
  valid_from      DATE,
  valid_to        DATE,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ticket_types_shape CHECK (
    (kind = 'session'
      AND weekday IS NOT NULL AND valid_from IS NULL AND valid_to IS NULL
      AND (start_time IS NULL) = (end_time IS NULL)
      AND (start_time IS NULL OR end_time > start_time))
    OR
    (kind = 'pass'
      AND weekday IS NULL AND start_time IS NULL AND end_time IS NULL
      AND valid_from IS NOT NULL AND valid_to >= valid_from AND valid_to <= valid_from + 366)
  )
);
CREATE INDEX ticket_types_store_idx ON ticket_types (store_owner_id, is_active);

ALTER TABLE ticket_types ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ticket_types FROM anon, authenticated;

-- ── 3. Tickets ─────────────────────────────────────────────────────────────

CREATE TABLE tickets (
  ticket_id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_type_id              UUID NOT NULL REFERENCES ticket_types(ticket_type_id) ON DELETE CASCADE,
  buyer_id                    UUID NOT NULL REFERENCES profiles(profile_id) ON DELETE CASCADE,
  store_owner_id              UUID NOT NULL REFERENCES profiles(profile_id) ON DELETE CASCADE,
  status                      TEXT NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending', 'paid', 'expired', 'refunded')),
  -- Snapshot of the ticket type when it was bought. Later edits to the type
  -- never change a ticket someone has paid for.
  name                        TEXT NOT NULL,
  kind                        TEXT NOT NULL CHECK (kind IN ('session', 'pass')),
  weekday                     SMALLINT,
  start_time                  TIME,
  end_time                    TIME,
  valid_from                  DATE,
  valid_to                    DATE,
  price_minor                 INT NOT NULL,
  currency                    TEXT NOT NULL,
  -- Who bought it, as entry staff will need to know (Under 18 flag).
  bought_as_under_18          BOOLEAN NOT NULL DEFAULT false,
  stripe_checkout_session_id  TEXT UNIQUE,
  stripe_payment_intent_id    TEXT UNIQUE,
  -- What the QR code holds. Opaque, set only once paid. Entry scanning
  -- looks the ticket up by it; the store never sees it.
  qr_token                    TEXT UNIQUE,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at                     TIMESTAMPTZ,
  refunded_at                 TIMESTAMPTZ
);
CREATE INDEX tickets_buyer_idx ON tickets (buyer_id, status);
CREATE INDEX tickets_store_idx ON tickets (store_owner_id, status);

ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON tickets FROM anon, authenticated;

-- ── 4. Who can sell, and who can buy ───────────────────────────────────────

-- A paid, unbanned store whose Stripe account can take payments.
CREATE FUNCTION _store_can_sell_tickets(p_owner UUID) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _store_is_paid(p_owner) AND NOT _is_banned(p_owner)
     AND EXISTS (SELECT 1 FROM store_ticketing WHERE profile_id = p_owner AND charges_enabled);
$$;

-- The Child band's account type. Inert until it exists.
CREATE FUNCTION _is_child(p_profile_id UUID) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE profile_id = p_profile_id AND account_type = 'child');
$$;

-- Per-ticket cap for Child buyers (£20), docs/ACCOUNT_TYPES.md Child limits.
CREATE FUNCTION _under_18_cap_minor() RETURNS INT
LANGUAGE sql IMMUTABLE AS $$ SELECT 2000 $$;

-- Whether this buyer may buy this ticket type. Store accounts never buy.
CREATE FUNCTION _can_buy_ticket(p_buyer UUID, p_type ticket_types) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT NOT _is_banned(p_buyer)
     AND NOT is_blocked_between(p_buyer, p_type.store_owner_id)
     AND (
       _is_adult(p_buyer)
       OR (_is_child(p_buyer)
           AND p_type.price_minor <= _under_18_cap_minor()
           AND EXISTS (SELECT 1 FROM store_ticketing
                       WHERE profile_id = p_type.store_owner_id AND allow_under_18))
     );
$$;

-- Whether a ticket type can be bought today: active, and a pass that hasn't
-- ended yet (in the store's local time).
CREATE FUNCTION _ticket_type_on_sale(p_type ticket_types) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p_type.is_active AND (
    p_type.kind = 'session'
    OR p_type.valid_to >= (
      SELECT (now() AT TIME ZONE timezone)::DATE FROM store_ticketing WHERE profile_id = p_type.store_owner_id
    )
  );
$$;

-- ── 5. The store's side ────────────────────────────────────────────────────

-- The owner's ticketing status (never the Stripe account id).
CREATE FUNCTION get_my_ticketing() RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := _assert_store_caller();
  v_row store_ticketing%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM store_ticketing WHERE profile_id = v_uid;
  IF v_row.profile_id IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN jsonb_build_object(
    'charges_enabled', v_row.charges_enabled,
    'details_submitted', v_row.details_submitted,
    'currency', v_row.currency,
    'allow_under_18', v_row.allow_under_18,
    'can_sell', _store_can_sell_tickets(v_uid)
  );
END;
$$;

CREATE FUNCTION set_ticketing_under_18(p_allow BOOLEAN) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := _assert_store_caller();
BEGIN
  IF NOT _store_can_edit_page(v_uid) THEN
    RAISE EXCEPTION 'STORE_NOT_APPROVED';
  END IF;
  UPDATE store_ticketing SET allow_under_18 = coalesce(p_allow, false), updated_at = now()
  WHERE profile_id = v_uid;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'TICKETING_NOT_CONNECTED';
  END IF;
END;
$$;

CREATE FUNCTION _ticket_type_json(p_type ticket_types) RETURNS JSONB
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT jsonb_build_object(
    'ticket_type_id', p_type.ticket_type_id, 'kind', p_type.kind, 'name', p_type.name,
    'description', p_type.description, 'price_minor', p_type.price_minor, 'currency', p_type.currency,
    'weekday', p_type.weekday,
    'start_time', to_char(p_type.start_time, 'HH24:MI'), 'end_time', to_char(p_type.end_time, 'HH24:MI'),
    'valid_from', p_type.valid_from, 'valid_to', p_type.valid_to, 'is_active', p_type.is_active
  );
$$;

-- Every ticket type the store has made, active or not, with sales counts.
CREATE FUNCTION get_my_ticket_types() RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := _assert_store_caller();
BEGIN
  RETURN coalesce((
    SELECT jsonb_agg(
      _ticket_type_json(t) || jsonb_build_object(
        'sold_count', (SELECT count(*) FROM tickets k
                       WHERE k.ticket_type_id = t.ticket_type_id AND k.status = 'paid'))
      ORDER BY t.is_active DESC, t.created_at DESC)
    FROM ticket_types t WHERE t.store_owner_id = v_uid
  ), '[]'::JSONB);
END;
$$;

-- Creates (p_ticket_type_id NULL) or edits a ticket type. Tickets already
-- sold keep their own snapshot.
CREATE FUNCTION save_ticket_type(
  p_ticket_type_id UUID, p_kind TEXT, p_name TEXT, p_description TEXT, p_price_minor INT,
  p_weekday SMALLINT, p_start_time TIME, p_end_time TIME, p_valid_from DATE, p_valid_to DATE
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := _assert_store_caller();
  v_currency TEXT;
  v_id UUID;
BEGIN
  IF NOT _store_can_edit_page(v_uid) THEN
    RAISE EXCEPTION 'STORE_NOT_APPROVED';
  END IF;
  SELECT currency INTO v_currency FROM store_ticketing WHERE profile_id = v_uid;
  IF v_currency IS NULL THEN
    RAISE EXCEPTION 'TICKETING_NOT_CONNECTED';
  END IF;
  IF p_kind NOT IN ('session', 'pass') THEN
    RAISE EXCEPTION 'INVALID_TICKET';
  END IF;

  IF p_ticket_type_id IS NULL THEN
    IF (SELECT count(*) FROM ticket_types WHERE store_owner_id = v_uid) >= 50 THEN
      RAISE EXCEPTION 'TOO_MANY_TICKET_TYPES';
    END IF;
    INSERT INTO ticket_types (store_owner_id, kind, name, description, price_minor, currency,
                              weekday, start_time, end_time, valid_from, valid_to)
    VALUES (v_uid, p_kind, btrim(p_name), NULLIF(btrim(p_description), ''), p_price_minor, v_currency,
            CASE WHEN p_kind = 'session' THEN p_weekday END,
            CASE WHEN p_kind = 'session' THEN p_start_time END,
            CASE WHEN p_kind = 'session' THEN p_end_time END,
            CASE WHEN p_kind = 'pass' THEN p_valid_from END,
            CASE WHEN p_kind = 'pass' THEN p_valid_to END)
    RETURNING ticket_type_id INTO v_id;
  ELSE
    UPDATE ticket_types SET
      kind = p_kind, name = btrim(p_name), description = NULLIF(btrim(p_description), ''),
      price_minor = p_price_minor,
      weekday = CASE WHEN p_kind = 'session' THEN p_weekday END,
      start_time = CASE WHEN p_kind = 'session' THEN p_start_time END,
      end_time = CASE WHEN p_kind = 'session' THEN p_end_time END,
      valid_from = CASE WHEN p_kind = 'pass' THEN p_valid_from END,
      valid_to = CASE WHEN p_kind = 'pass' THEN p_valid_to END,
      updated_at = now()
    WHERE ticket_type_id = p_ticket_type_id AND store_owner_id = v_uid
    RETURNING ticket_type_id INTO v_id;
    IF v_id IS NULL THEN
      RAISE EXCEPTION 'TICKET_TYPE_NOT_FOUND';
    END IF;
  END IF;
  RETURN v_id;
EXCEPTION
  WHEN check_violation OR not_null_violation THEN
    RAISE EXCEPTION 'INVALID_TICKET';
END;
$$;

-- Ticket types are never deleted (sold tickets point at them), only taken
-- off sale.
CREATE FUNCTION set_ticket_type_active(p_ticket_type_id UUID, p_active BOOLEAN) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := _assert_store_caller();
BEGIN
  IF NOT _store_can_edit_page(v_uid) THEN
    RAISE EXCEPTION 'STORE_NOT_APPROVED';
  END IF;
  UPDATE ticket_types SET is_active = coalesce(p_active, false), updated_at = now()
  WHERE ticket_type_id = p_ticket_type_id AND store_owner_id = v_uid;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'TICKET_TYPE_NOT_FOUND';
  END IF;
END;
$$;

-- ── 6. The skater's side ───────────────────────────────────────────────────

-- What a store page shows: the tickets on sale and whether this viewer can
-- buy each. NULL when the store doesn't sell tickets.
CREATE FUNCTION get_store_tickets(p_owner UUID) RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_can_sell BOOLEAN;
  v_types JSONB;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM store_ticketing WHERE profile_id = p_owner)
     OR NOT _is_approved_store(p_owner) OR _is_banned(p_owner) OR is_blocked_between(v_uid, p_owner) THEN
    RETURN NULL;
  END IF;

  v_can_sell := _store_can_sell_tickets(p_owner);
  SELECT jsonb_agg(
           _ticket_type_json(t) || jsonb_build_object('viewer_can_buy', v_can_sell AND _can_buy_ticket(v_uid, t))
           ORDER BY t.kind DESC, t.weekday NULLS LAST, t.valid_from NULLS LAST, t.price_minor)
    INTO v_types
  FROM ticket_types t
  WHERE t.store_owner_id = p_owner AND _ticket_type_on_sale(t);

  IF v_types IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN jsonb_build_object(
    'store_can_sell', v_can_sell,
    -- Why buying is off, for the UI: 'store' (not selling right now),
    -- 'account' (a Store account, or a Child at a store without under-18
    -- sales), or NULL (check each ticket's viewer_can_buy).
    'blocked_reason', CASE
      WHEN NOT v_can_sell THEN 'store'
      WHEN NOT _any_ticket_buyable(v_types) THEN 'account'
    END,
    'ticket_types', v_types
  );
END;
$$;

-- Whether any ticket in a get_store_tickets list is buyable.
CREATE FUNCTION _any_ticket_buyable(p_types JSONB) RETURNS BOOLEAN
LANGUAGE sql IMMUTABLE AS $$
  SELECT coalesce(bool_or((t->>'viewer_can_buy')::BOOLEAN), false) FROM jsonb_array_elements(p_types) t;
$$;

-- The buyer's paid and refunded tickets. The QR token only while paid.
CREATE FUNCTION get_my_tickets() RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;
  RETURN coalesce((
    SELECT jsonb_agg(jsonb_build_object(
      'ticket_id', k.ticket_id, 'status', k.status, 'name', k.name, 'kind', k.kind,
      'weekday', k.weekday,
      'start_time', to_char(k.start_time, 'HH24:MI'), 'end_time', to_char(k.end_time, 'HH24:MI'),
      'valid_from', k.valid_from, 'valid_to', k.valid_to,
      'price_minor', k.price_minor, 'currency', k.currency,
      'qr_token', CASE WHEN k.status = 'paid' THEN k.qr_token END,
      'paid_at', k.paid_at,
      'store_owner_id', k.store_owner_id,
      'store_name', coalesce(d.name, p.display_name, 'Store'),
      'logo_path', d.logo_path
    ) ORDER BY k.paid_at DESC)
    FROM tickets k
    JOIN profiles p ON p.profile_id = k.store_owner_id
    LEFT JOIN store_public_details d ON d.profile_id = k.store_owner_id
    WHERE k.buyer_id = v_uid AND k.status IN ('paid', 'refunded')
  ), '[]'::JSONB);
END;
$$;

-- ── 7. The tickets edge function's calls (service role) ───────────────────

-- Saves the store's new Stripe account (first onboarding).
CREATE FUNCTION _save_ticketing_account(p_profile_id UUID, p_account_id TEXT) RETURNS VOID
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO store_ticketing (profile_id, stripe_account_id)
  VALUES (p_profile_id, p_account_id)
  ON CONFLICT (profile_id) DO NOTHING;
$$;

-- account.updated, or the app's refresh after onboarding.
CREATE FUNCTION _update_ticketing_account(
  p_account_id TEXT, p_charges_enabled BOOLEAN, p_details_submitted BOOLEAN, p_currency TEXT
) RETURNS VOID
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE store_ticketing SET
    charges_enabled = p_charges_enabled,
    details_submitted = p_details_submitted,
    currency = coalesce(upper(NULLIF(p_currency, '')), currency),
    updated_at = now()
  WHERE stripe_account_id = p_account_id;
$$;

-- Checks the buyer and ticket type, then makes the pending ticket. Returns
-- what the Checkout session needs.
CREATE FUNCTION _begin_ticket_purchase(p_buyer UUID, p_ticket_type_id UUID)
RETURNS TABLE (ticket_id UUID, stripe_account_id TEXT, name TEXT, description TEXT,
               price_minor INT, currency TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_type ticket_types%ROWTYPE;
  v_account TEXT;
  v_ticket UUID;
BEGIN
  SELECT * INTO v_type FROM ticket_types t WHERE t.ticket_type_id = p_ticket_type_id;
  IF v_type.ticket_type_id IS NULL OR NOT _ticket_type_on_sale(v_type) THEN
    RAISE EXCEPTION 'TICKET_NOT_ON_SALE';
  END IF;
  IF NOT _store_can_sell_tickets(v_type.store_owner_id) THEN
    RAISE EXCEPTION 'STORE_NOT_SELLING';
  END IF;
  IF NOT _can_buy_ticket(p_buyer, v_type) THEN
    RAISE EXCEPTION 'CANNOT_BUY_TICKET';
  END IF;
  -- Abandoned checkouts expire after 30 minutes; more than a few open at
  -- once is a bug or abuse.
  IF (SELECT count(*) FROM tickets k
      WHERE k.buyer_id = p_buyer AND k.status = 'pending' AND k.created_at > now() - INTERVAL '1 hour') >= 5 THEN
    RAISE EXCEPTION 'TOO_MANY_PENDING';
  END IF;

  SELECT s.stripe_account_id INTO v_account FROM store_ticketing s WHERE s.profile_id = v_type.store_owner_id;

  INSERT INTO tickets (ticket_type_id, buyer_id, store_owner_id, name, kind, weekday, start_time, end_time,
                       valid_from, valid_to, price_minor, currency, bought_as_under_18)
  VALUES (v_type.ticket_type_id, p_buyer, v_type.store_owner_id, v_type.name, v_type.kind, v_type.weekday,
          v_type.start_time, v_type.end_time, v_type.valid_from, v_type.valid_to, v_type.price_minor,
          v_type.currency, _is_child(p_buyer))
  RETURNING tickets.ticket_id INTO v_ticket;

  RETURN QUERY SELECT v_ticket, v_account, v_type.name, v_type.description, v_type.price_minor, v_type.currency;
END;
$$;

CREATE FUNCTION _attach_ticket_checkout(p_ticket_id UUID, p_session_id TEXT) RETURNS VOID
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE tickets SET stripe_checkout_session_id = p_session_id
  WHERE ticket_id = p_ticket_id AND status = 'pending';
$$;

-- Checkout couldn't be created: drop the pending ticket.
CREATE FUNCTION _abandon_ticket_purchase(p_ticket_id UUID) RETURNS VOID
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  DELETE FROM tickets WHERE ticket_id = p_ticket_id AND status = 'pending' AND stripe_checkout_session_id IS NULL;
$$;

-- checkout.session.completed (paid) on a connected account. Only succeeds
-- when the session belongs to that account's store and charged exactly the
-- snapshot price. Idempotent: Stripe can deliver an event more than once.
CREATE FUNCTION _complete_ticket_purchase(
  p_session_id TEXT, p_account_id TEXT, p_payment_intent_id TEXT, p_amount_total INT, p_currency TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE tickets k SET
    status = 'paid',
    paid_at = now(),
    stripe_payment_intent_id = p_payment_intent_id,
    qr_token = encode(extensions.gen_random_bytes(24), 'hex')
  FROM store_ticketing s
  WHERE k.stripe_checkout_session_id = p_session_id
    AND k.status IN ('pending', 'expired')
    AND s.profile_id = k.store_owner_id
    AND s.stripe_account_id = p_account_id
    AND k.price_minor = p_amount_total
    AND k.currency = upper(p_currency);
  RETURN FOUND OR EXISTS (
    SELECT 1 FROM tickets WHERE stripe_checkout_session_id = p_session_id AND status IN ('paid', 'refunded')
  );
END;
$$;

-- checkout.session.expired: the buyer never paid.
CREATE FUNCTION _expire_ticket_purchase(p_session_id TEXT) RETURNS VOID
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE tickets SET status = 'expired' WHERE stripe_checkout_session_id = p_session_id AND status = 'pending';
$$;

-- charge.refunded (in full) on a connected account. The store refunds from
-- its own Stripe dashboard for now; the ticket stops working.
CREATE FUNCTION _refund_ticket(p_payment_intent_id TEXT, p_account_id TEXT) RETURNS VOID
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE tickets k SET status = 'refunded', refunded_at = now(), qr_token = NULL
  FROM store_ticketing s
  WHERE k.stripe_payment_intent_id = p_payment_intent_id
    AND k.status = 'paid'
    AND s.profile_id = k.store_owner_id
    AND s.stripe_account_id = p_account_id;
$$;

-- ── 8. Data export ─────────────────────────────────────────────────────────

DO $do$
DECLARE
  v_def TEXT := pg_get_functiondef('export_my_data()'::REGPROCEDURE);
BEGIN
  v_def := replace(v_def,
    $old$'cart_items', _export_rows('cart_items', 'profile_id', v_uid),$old$,
    $new$'cart_items', _export_rows('cart_items', 'profile_id', v_uid),
    'tickets', _export_rows('tickets', 'buyer_id', v_uid, ARRAY['qr_token', 'stripe_checkout_session_id']),$new$);
  IF position('''tickets''' IN v_def) = 0 THEN
    RAISE EXCEPTION 'export_my_data rewrite did not apply';
  END IF;
  EXECUTE v_def;
END;
$do$;

-- ── 9. Function access ─────────────────────────────────────────────────────

REVOKE EXECUTE ON FUNCTION
  _store_can_sell_tickets(UUID), _is_child(UUID), _under_18_cap_minor(),
  _can_buy_ticket(UUID, ticket_types), _ticket_type_on_sale(ticket_types), _ticket_type_json(ticket_types),
  _any_ticket_buyable(JSONB),
  get_my_ticketing(), set_ticketing_under_18(BOOLEAN), get_my_ticket_types(),
  save_ticket_type(UUID, TEXT, TEXT, TEXT, INT, SMALLINT, TIME, TIME, DATE, DATE),
  set_ticket_type_active(UUID, BOOLEAN), get_store_tickets(UUID), get_my_tickets(),
  _save_ticketing_account(UUID, TEXT), _update_ticketing_account(TEXT, BOOLEAN, BOOLEAN, TEXT),
  _begin_ticket_purchase(UUID, UUID), _attach_ticket_checkout(UUID, TEXT), _abandon_ticket_purchase(UUID),
  _complete_ticket_purchase(TEXT, TEXT, TEXT, INT, TEXT), _expire_ticket_purchase(TEXT),
  _refund_ticket(TEXT, TEXT)
FROM PUBLIC, anon, authenticated;

-- The edge functions' own calls.
GRANT EXECUTE ON FUNCTION
  _store_can_edit_page(UUID), _store_can_sell_tickets(UUID),
  _save_ticketing_account(UUID, TEXT), _update_ticketing_account(TEXT, BOOLEAN, BOOLEAN, TEXT),
  _begin_ticket_purchase(UUID, UUID), _attach_ticket_checkout(UUID, TEXT), _abandon_ticket_purchase(UUID),
  _complete_ticket_purchase(TEXT, TEXT, TEXT, INT, TEXT), _expire_ticket_purchase(TEXT),
  _refund_ticket(TEXT, TEXT)
TO service_role;

GRANT EXECUTE ON FUNCTION
  get_my_ticketing(), set_ticketing_under_18(BOOLEAN), get_my_ticket_types(),
  save_ticket_type(UUID, TEXT, TEXT, TEXT, INT, SMALLINT, TIME, TIME, DATE, DATE),
  set_ticket_type_active(UUID, BOOLEAN), get_store_tickets(UUID), get_my_tickets()
TO authenticated;
