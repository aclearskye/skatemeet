-- Store tickets, part 2a (docs/ACCOUNT_TYPES.md, "Store", Tickets): entry
-- scanning and the check-in list.
--
--   * Staff scan a skater's QR code with the Store account. redeem_ticket
--     checks the ticket is this store's, paid, and valid today (in the
--     store's time zone), then records the entry.
--   * A SESSION ticket is good for one entry on its weekday (any week, at
--     any time that day; staff see the session hours). Scanning it marks it
--     'used', which frees the skater to buy the next session (one paid
--     ticket per skater per type, tickets_one_paid_per_type).
--   * A PASS checks in once per day between its first and last day. A
--     second scan the same day says "already checked in" with the first time.
--   * The store keeps a searchable list of every check-in. Under-18s show
--     only their display name and photo, never their username.
--   * The store doesn't need a paid subscription to scan: skaters who paid
--     for entry still get in if the store's subscription lapses.
--
-- Waivers and parental consent come in part 2b; until then nothing blocks
-- a Child's entry for missing consent (Child accounts don't exist yet).

-- ── 1. Tickets: a used state ───────────────────────────────────────────────

ALTER TABLE tickets DROP CONSTRAINT tickets_status_check;
ALTER TABLE tickets ADD CONSTRAINT tickets_status_check
  CHECK (status IN ('pending', 'paid', 'expired', 'refunded', 'used'));
ALTER TABLE tickets ADD COLUMN used_at TIMESTAMPTZ;

-- ── 2. Check-ins ───────────────────────────────────────────────────────────

CREATE TABLE ticket_checkins (
  checkin_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id       UUID NOT NULL REFERENCES tickets(ticket_id) ON DELETE CASCADE,
  store_owner_id  UUID NOT NULL REFERENCES profiles(profile_id) ON DELETE CASCADE,
  buyer_id        UUID NOT NULL REFERENCES profiles(profile_id) ON DELETE CASCADE,
  checked_in_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- The store's local calendar day, so a pass checks in once per day there.
  local_date      DATE NOT NULL,
  UNIQUE (ticket_id, local_date)
);
CREATE INDEX ticket_checkins_store_idx ON ticket_checkins (store_owner_id, checked_in_at DESC);
CREATE INDEX ticket_checkins_buyer_idx ON ticket_checkins (buyer_id);

ALTER TABLE ticket_checkins ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ticket_checkins FROM anon, authenticated;

-- ── 3. Scanning ────────────────────────────────────────────────────────────

-- The caller, if it's an approved, unbanned Store account (paid or not).
CREATE FUNCTION _assert_scanning_store() RETURNS UUID
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := _assert_store_caller();
BEGIN
  IF NOT _is_approved_store(v_uid) THEN
    RAISE EXCEPTION 'STORE_NOT_APPROVED';
  END IF;
  RETURN v_uid;
END;
$$;

-- What staff see about the skater. Under-18s: display name and photo only.
CREATE FUNCTION _checkin_skater_json(p_buyer UUID, p_under_18 BOOLEAN) RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'display_name', coalesce(p.display_name, p.username, 'Skater'),
    'avatar_url', p.avatar_url,
    'username', CASE WHEN p_under_18 THEN NULL ELSE p.username END,
    'under_18', p_under_18
  )
  FROM profiles p WHERE p.profile_id = p_buyer;
$$;

-- Scans a ticket's QR token for the calling store. Returns
--   { result: 'admitted' | 'already_checked_in' | 'refused',
--     reason: NULL | NOT_FOUND | WRONG_STORE | NOT_PAID | REFUNDED |
--             ALREADY_USED | WRONG_DAY | NOT_YET_VALID | PASS_ENDED,
--     ticket, skater, checked_in_at }
-- ticket and skater are left out for NOT_FOUND and WRONG_STORE, so a scan
-- never shows another venue's customer.
CREATE FUNCTION redeem_ticket(p_qr_token TEXT) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_store UUID := _assert_scanning_store();
  v_ticket tickets%ROWTYPE;
  v_tz TEXT;
  v_now_local TIMESTAMP;
  v_today DATE;
  v_under_18 BOOLEAN;
  v_existing TIMESTAMPTZ;
  v_reason TEXT;
  v_details JSONB;
BEGIN
  SELECT * INTO v_ticket FROM tickets
  WHERE qr_token = btrim(coalesce(p_qr_token, '')) AND qr_token IS NOT NULL
  FOR UPDATE;
  -- A refunded ticket loses its token, so it reads as NOT_FOUND.
  IF v_ticket.ticket_id IS NULL THEN
    RETURN jsonb_build_object('result', 'refused', 'reason', 'NOT_FOUND');
  END IF;
  IF v_ticket.store_owner_id <> v_store THEN
    RETURN jsonb_build_object('result', 'refused', 'reason', 'WRONG_STORE');
  END IF;

  SELECT coalesce(timezone, 'Europe/London') INTO v_tz FROM store_ticketing WHERE profile_id = v_store;
  v_now_local := now() AT TIME ZONE coalesce(v_tz, 'Europe/London');
  v_today := v_now_local::DATE;
  v_under_18 := v_ticket.bought_as_under_18 OR _is_child(v_ticket.buyer_id);

  v_details := jsonb_build_object(
    'ticket', jsonb_build_object(
      'name', v_ticket.name, 'kind', v_ticket.kind, 'weekday', v_ticket.weekday,
      'start_time', to_char(v_ticket.start_time, 'HH24:MI'), 'end_time', to_char(v_ticket.end_time, 'HH24:MI'),
      'valid_from', v_ticket.valid_from, 'valid_to', v_ticket.valid_to),
    'skater', _checkin_skater_json(v_ticket.buyer_id, v_under_18));

  v_reason := CASE
    WHEN v_ticket.status = 'refunded' THEN 'REFUNDED'
    WHEN v_ticket.status = 'used' THEN 'ALREADY_USED'
    WHEN v_ticket.status <> 'paid' THEN 'NOT_PAID'
    WHEN v_ticket.kind = 'session' AND EXTRACT(DOW FROM v_today)::INT <> v_ticket.weekday THEN 'WRONG_DAY'
    WHEN v_ticket.kind = 'pass' AND v_today < v_ticket.valid_from THEN 'NOT_YET_VALID'
    WHEN v_ticket.kind = 'pass' AND v_today > v_ticket.valid_to THEN 'PASS_ENDED'
  END;
  IF v_reason IS NOT NULL THEN
    RETURN v_details || jsonb_build_object('result', 'refused', 'reason', v_reason,
                                           'checked_in_at', v_ticket.used_at);
  END IF;

  -- A pass already in today.
  SELECT checked_in_at INTO v_existing FROM ticket_checkins
  WHERE ticket_id = v_ticket.ticket_id AND local_date = v_today;
  IF v_existing IS NOT NULL THEN
    RETURN v_details || jsonb_build_object('result', 'already_checked_in', 'checked_in_at', v_existing);
  END IF;

  INSERT INTO ticket_checkins (ticket_id, store_owner_id, buyer_id, local_date)
  VALUES (v_ticket.ticket_id, v_store, v_ticket.buyer_id, v_today);
  IF v_ticket.kind = 'session' THEN
    -- The token stays, so scanning it again says when it was used.
    UPDATE tickets SET status = 'used', used_at = now() WHERE ticket_id = v_ticket.ticket_id;
  END IF;

  RETURN v_details || jsonb_build_object('result', 'admitted', 'checked_in_at', now());
END;
$$;

-- ── 4. The check-in list ───────────────────────────────────────────────────

-- The store's check-ins, newest first, 50 at a time (p_before: the last
-- row's checked_in_at). p_today_only limits to the store's current day.
-- p_search matches the display name (and the username for Adults).
CREATE FUNCTION get_store_checkins(p_search TEXT, p_today_only BOOLEAN, p_before TIMESTAMPTZ)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_store UUID := _assert_scanning_store();
  v_today DATE;
  v_search TEXT := lower(NULLIF(btrim(p_search), ''));
BEGIN
  SELECT (now() AT TIME ZONE coalesce(timezone, 'Europe/London'))::DATE INTO v_today
  FROM store_ticketing WHERE profile_id = v_store;
  v_today := coalesce(v_today, (now() AT TIME ZONE 'Europe/London')::DATE);

  RETURN coalesce((
    SELECT jsonb_agg(item ORDER BY (item->>'checked_in_at')::TIMESTAMPTZ DESC)
    FROM (
      SELECT jsonb_build_object(
        'checkin_id', c.checkin_id,
        'checked_in_at', c.checked_in_at,
        'ticket_name', k.name,
        'ticket_kind', k.kind,
        'skater', _checkin_skater_json(c.buyer_id, k.bought_as_under_18 OR _is_child(c.buyer_id))
      ) AS item
      FROM ticket_checkins c
      JOIN tickets k ON k.ticket_id = c.ticket_id
      JOIN profiles p ON p.profile_id = c.buyer_id
      WHERE c.store_owner_id = v_store
        AND (NOT coalesce(p_today_only, false) OR c.local_date = v_today)
        AND (p_before IS NULL OR c.checked_in_at < p_before)
        AND (v_search IS NULL
             OR position(v_search IN lower(coalesce(p.display_name, ''))) > 0
             OR (NOT (k.bought_as_under_18 OR _is_child(c.buyer_id))
                 AND position(v_search IN lower(coalesce(p.username, ''))) > 0))
      ORDER BY c.checked_in_at DESC
      LIMIT 50
    ) page
  ), '[]'::JSONB);
END;
$$;

-- ── 5. The skater's tickets: used ones, and today's check-in ───────────────

DO $do$
DECLARE
  v_def TEXT := pg_get_functiondef('get_my_tickets()'::REGPROCEDURE);
BEGIN
  v_def := replace(v_def,
    $old$WHERE k.buyer_id = v_uid AND k.status IN ('paid', 'refunded')$old$,
    $new$WHERE k.buyer_id = v_uid AND k.status IN ('paid', 'refunded', 'used')$new$);
  v_def := replace(v_def,
    $old$'paid_at', k.paid_at,$old$,
    $new$'paid_at', k.paid_at, 'used_at', k.used_at,
      'last_checked_in_at', (SELECT max(c.checked_in_at) FROM ticket_checkins c WHERE c.ticket_id = k.ticket_id),$new$);
  IF position('last_checked_in_at' IN v_def) = 0 OR position($q$'used')$q$ IN v_def) = 0 THEN
    RAISE EXCEPTION 'get_my_tickets rewrite did not apply';
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
    $old$'tickets', _export_rows('tickets', 'buyer_id', v_uid, ARRAY['qr_token', 'stripe_checkout_session_id']),$old$,
    $new$'tickets', _export_rows('tickets', 'buyer_id', v_uid, ARRAY['qr_token', 'stripe_checkout_session_id']),
    'ticket_checkins', _export_rows('ticket_checkins', 'buyer_id', v_uid),$new$);
  IF position('''ticket_checkins''' IN v_def) = 0 THEN
    RAISE EXCEPTION 'export_my_data rewrite did not apply';
  END IF;
  EXECUTE v_def;
END;
$do$;

-- ── 7. Function access ─────────────────────────────────────────────────────

REVOKE EXECUTE ON FUNCTION
  _assert_scanning_store(), _checkin_skater_json(UUID, BOOLEAN),
  redeem_ticket(TEXT), get_store_checkins(TEXT, BOOLEAN, TIMESTAMPTZ)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION redeem_ticket(TEXT), get_store_checkins(TEXT, BOOLEAN, TIMESTAMPTZ) TO authenticated;
