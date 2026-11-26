-- Store tickets, part 2c (docs/ACCOUNT_TYPES.md, "Store", Tickets):
-- refunds and swaps on request.
--
--   * A ticket still unused 30 days after purchase (paid, never scanned in)
--     can be put up for a REFUND or a SWAP. The store decides each request
--     from its Money tab: approve or decline.
--   * Refund: SkateMeet refunds the payment through the store's own Stripe
--     account (the tickets edge function). Stripe keeps its fee.
--   * Swap (store credit): the ticket is exchanged for another ticket at the
--     same store costing the same or less, with no payment. The old ticket
--     becomes 'swapped'; the new one is paid with its own QR code and keeps
--     the signed waiver.
--   * One open request per ticket. The skater can cancel it while it's open.

-- ── 1. Tickets: a swapped state ────────────────────────────────────────────

ALTER TABLE tickets DROP CONSTRAINT tickets_status_check;
ALTER TABLE tickets ADD CONSTRAINT tickets_status_check
  CHECK (status IN ('pending', 'paid', 'expired', 'refunded', 'used', 'swapped'));
ALTER TABLE tickets ADD COLUMN swapped_from UUID REFERENCES tickets(ticket_id) ON DELETE SET NULL;

-- ── 2. Requests ────────────────────────────────────────────────────────────

CREATE TABLE ticket_requests (
  request_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id            UUID NOT NULL REFERENCES tickets(ticket_id) ON DELETE CASCADE,
  buyer_id             UUID NOT NULL REFERENCES profiles(profile_id) ON DELETE CASCADE,
  store_owner_id       UUID NOT NULL REFERENCES profiles(profile_id) ON DELETE CASCADE,
  kind                 TEXT NOT NULL CHECK (kind IN ('refund', 'swap')),
  swap_ticket_type_id  UUID REFERENCES ticket_types(ticket_type_id) ON DELETE CASCADE,
  status               TEXT NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending', 'approved', 'declined', 'cancelled')),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at          TIMESTAMPTZ,
  CHECK ((kind = 'swap') = (swap_ticket_type_id IS NOT NULL))
);
CREATE UNIQUE INDEX ticket_requests_one_open ON ticket_requests (ticket_id) WHERE status = 'pending';
CREATE INDEX ticket_requests_store_idx ON ticket_requests (store_owner_id, status, created_at DESC);

ALTER TABLE ticket_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ticket_requests FROM anon, authenticated;

-- Paid, never scanned in, and bought at least 30 days ago.
CREATE FUNCTION _ticket_request_eligible(p_ticket tickets) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p_ticket.status = 'paid'
     AND p_ticket.paid_at <= now() - INTERVAL '30 days'
     AND NOT EXISTS (SELECT 1 FROM ticket_checkins WHERE ticket_id = p_ticket.ticket_id);
$$;

-- Ticket types this ticket could be swapped for: same store, on sale,
-- costing the same or less, not its own type, and not one the skater
-- already holds (one paid ticket per skater per type).
CREATE FUNCTION _swap_target_ok(p_ticket tickets, p_target ticket_types) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p_target.store_owner_id = p_ticket.store_owner_id
     AND p_target.ticket_type_id <> p_ticket.ticket_type_id
     AND p_target.price_minor <= p_ticket.price_minor
     AND _ticket_type_on_sale(p_target)
     AND _can_buy_ticket(p_ticket.buyer_id, p_target)
     AND NOT EXISTS (SELECT 1 FROM tickets k WHERE k.buyer_id = p_ticket.buyer_id
                     AND k.ticket_type_id = p_target.ticket_type_id AND k.status = 'paid');
$$;

-- ── 3. The skater's side ───────────────────────────────────────────────────

CREATE FUNCTION get_ticket_swap_options(p_ticket_id UUID) RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_ticket tickets%ROWTYPE;
BEGIN
  SELECT * INTO v_ticket FROM tickets WHERE ticket_id = p_ticket_id AND buyer_id = auth.uid();
  IF v_ticket.ticket_id IS NULL OR NOT _ticket_request_eligible(v_ticket) THEN
    RETURN '[]'::JSONB;
  END IF;
  RETURN coalesce((
    SELECT jsonb_agg(_ticket_type_json(t) ORDER BY t.price_minor DESC, t.name)
    FROM ticket_types t
    WHERE _swap_target_ok(v_ticket, t)
  ), '[]'::JSONB);
END;
$$;

CREATE FUNCTION request_ticket_change(p_ticket_id UUID, p_kind TEXT, p_swap_ticket_type_id UUID) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_ticket tickets%ROWTYPE;
  v_target ticket_types%ROWTYPE;
  v_id UUID;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;
  SELECT * INTO v_ticket FROM tickets WHERE ticket_id = p_ticket_id AND buyer_id = v_uid FOR UPDATE;
  IF v_ticket.ticket_id IS NULL OR NOT _ticket_request_eligible(v_ticket) THEN
    RAISE EXCEPTION 'NOT_ELIGIBLE';
  END IF;
  IF p_kind NOT IN ('refund', 'swap') THEN
    RAISE EXCEPTION 'NOT_ELIGIBLE';
  END IF;
  IF p_kind = 'swap' THEN
    SELECT * INTO v_target FROM ticket_types WHERE ticket_type_id = p_swap_ticket_type_id;
    IF v_target.ticket_type_id IS NULL OR NOT _swap_target_ok(v_ticket, v_target) THEN
      RAISE EXCEPTION 'SWAP_NOT_AVAILABLE';
    END IF;
  END IF;
  INSERT INTO ticket_requests (ticket_id, buyer_id, store_owner_id, kind, swap_ticket_type_id)
  VALUES (v_ticket.ticket_id, v_uid, v_ticket.store_owner_id, p_kind,
          CASE WHEN p_kind = 'swap' THEN p_swap_ticket_type_id END)
  RETURNING request_id INTO v_id;
  RETURN v_id;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'REQUEST_OPEN';
END;
$$;

CREATE FUNCTION cancel_ticket_request(p_request_id UUID) RETURNS VOID
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE ticket_requests SET status = 'cancelled', resolved_at = now()
  WHERE request_id = p_request_id AND buyer_id = auth.uid() AND status = 'pending';
$$;

-- ── 4. The store's side ────────────────────────────────────────────────────

CREATE FUNCTION get_store_ticket_requests() RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_store UUID := _assert_scanning_store();
BEGIN
  RETURN coalesce((
    SELECT jsonb_agg(jsonb_build_object(
      'request_id', r.request_id,
      'kind', r.kind,
      'created_at', r.created_at,
      'ticket_name', k.name,
      'price_minor', k.price_minor,
      'currency', k.currency,
      'paid_at', k.paid_at,
      'swap_name', t.name,
      'swap_price_minor', t.price_minor,
      'skater', _checkin_skater_json(r.buyer_id, k.bought_as_under_18 OR _is_child(r.buyer_id))
    ) ORDER BY r.created_at)
    FROM ticket_requests r
    JOIN tickets k ON k.ticket_id = r.ticket_id
    LEFT JOIN ticket_types t ON t.ticket_type_id = r.swap_ticket_type_id
    WHERE r.store_owner_id = v_store AND r.status = 'pending'
  ), '[]'::JSONB);
END;
$$;

CREATE FUNCTION decline_ticket_request(p_request_id UUID) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_store UUID := _assert_scanning_store();
BEGIN
  UPDATE ticket_requests SET status = 'declined', resolved_at = now()
  WHERE request_id = p_request_id AND store_owner_id = v_store AND status = 'pending';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'REQUEST_NOT_FOUND';
  END IF;
END;
$$;

-- Swap: the old ticket is closed and a new paid ticket of the chosen type
-- is issued with its own QR code. The signed waiver moves across.
CREATE FUNCTION approve_ticket_swap(p_request_id UUID) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_store UUID := _assert_scanning_store();
  v_request ticket_requests%ROWTYPE;
  v_ticket tickets%ROWTYPE;
  v_target ticket_types%ROWTYPE;
  v_new UUID;
BEGIN
  SELECT * INTO v_request FROM ticket_requests
  WHERE request_id = p_request_id AND store_owner_id = v_store AND status = 'pending' AND kind = 'swap'
  FOR UPDATE;
  IF v_request.request_id IS NULL THEN
    RAISE EXCEPTION 'REQUEST_NOT_FOUND';
  END IF;
  SELECT * INTO v_ticket FROM tickets WHERE ticket_id = v_request.ticket_id FOR UPDATE;
  SELECT * INTO v_target FROM ticket_types WHERE ticket_type_id = v_request.swap_ticket_type_id;
  IF NOT _ticket_request_eligible(v_ticket) THEN
    RAISE EXCEPTION 'NOT_ELIGIBLE';
  END IF;
  IF v_target.ticket_type_id IS NULL OR NOT _swap_target_ok(v_ticket, v_target) THEN
    RAISE EXCEPTION 'SWAP_NOT_AVAILABLE';
  END IF;

  UPDATE tickets SET status = 'swapped', qr_token = NULL WHERE ticket_id = v_ticket.ticket_id;
  INSERT INTO tickets (ticket_type_id, buyer_id, store_owner_id, status, name, kind, weekday, start_time, end_time,
                       valid_from, valid_to, price_minor, currency, bought_as_under_18, qr_token, paid_at,
                       swapped_from)
  VALUES (v_target.ticket_type_id, v_ticket.buyer_id, v_store, 'paid', v_target.name, v_target.kind,
          v_target.weekday, v_target.start_time, v_target.end_time, v_target.valid_from, v_target.valid_to,
          v_target.price_minor, v_target.currency, v_ticket.bought_as_under_18,
          encode(extensions.gen_random_bytes(24), 'hex'), now(), v_ticket.ticket_id)
  RETURNING ticket_id INTO v_new;
  UPDATE ticket_waivers SET ticket_id = v_new WHERE ticket_id = v_ticket.ticket_id;
  UPDATE ticket_requests SET status = 'approved', resolved_at = now() WHERE request_id = v_request.request_id;
END;
$$;

-- ── 5. Refunds (the tickets edge function's calls) ─────────────────────────

-- Checks a refund request can go ahead and returns what Stripe needs.
CREATE FUNCTION _begin_request_refund(p_request_id UUID, p_store UUID)
RETURNS TABLE (payment_intent_id TEXT, stripe_account_id TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_request ticket_requests%ROWTYPE;
  v_ticket tickets%ROWTYPE;
BEGIN
  SELECT * INTO v_request FROM ticket_requests r
  WHERE r.request_id = p_request_id AND r.store_owner_id = p_store AND r.status = 'pending' AND r.kind = 'refund';
  IF v_request.request_id IS NULL THEN
    RAISE EXCEPTION 'REQUEST_NOT_FOUND';
  END IF;
  SELECT * INTO v_ticket FROM tickets k WHERE k.ticket_id = v_request.ticket_id;
  IF NOT _ticket_request_eligible(v_ticket) OR v_ticket.stripe_payment_intent_id IS NULL THEN
    RAISE EXCEPTION 'NOT_ELIGIBLE';
  END IF;
  RETURN QUERY
    SELECT v_ticket.stripe_payment_intent_id, s.stripe_account_id
    FROM store_ticketing s WHERE s.profile_id = p_store;
END;
$$;

-- After Stripe accepted the refund: close the ticket and the request. The
-- charge.refunded webhook that follows finds the ticket already refunded.
CREATE FUNCTION _finish_request_refund(p_request_id UUID) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_ticket_id UUID;
BEGIN
  UPDATE ticket_requests SET status = 'approved', resolved_at = now()
  WHERE request_id = p_request_id AND status = 'pending'
  RETURNING ticket_id INTO v_ticket_id;
  UPDATE tickets SET status = 'refunded', refunded_at = now(), qr_token = NULL
  WHERE ticket_id = v_ticket_id AND status = 'paid';
END;
$$;

-- ── 6. The skater's tickets and the store's status ─────────────────────────

DO $do$
DECLARE
  v_def TEXT := pg_get_functiondef('get_my_tickets()'::REGPROCEDURE);
BEGIN
  v_def := replace(v_def,
    $old$k.status IN ('paid', 'refunded', 'used')$old$,
    $new$k.status IN ('paid', 'refunded', 'used', 'swapped')$new$);
  v_def := replace(v_def,
    $old$'paid_at', k.paid_at, 'used_at', k.used_at,$old$,
    $new$'paid_at', k.paid_at, 'used_at', k.used_at,
      'can_request', _ticket_request_eligible(k),
      'request', (SELECT jsonb_build_object('request_id', r.request_id, 'kind', r.kind, 'status', r.status,
                                            'swap_name', t.name, 'created_at', r.created_at)
                  FROM ticket_requests r LEFT JOIN ticket_types t ON t.ticket_type_id = r.swap_ticket_type_id
                  WHERE r.ticket_id = k.ticket_id ORDER BY r.created_at DESC LIMIT 1),$new$);
  IF position('can_request' IN v_def) = 0 OR position($q$'swapped')$q$ IN v_def) = 0 THEN
    RAISE EXCEPTION 'get_my_tickets rewrite did not apply';
  END IF;
  EXECUTE v_def;

  v_def := pg_get_functiondef('get_my_ticketing()'::REGPROCEDURE);
  v_def := replace(v_def,
    $old$'can_sell', _store_can_sell_tickets(v_uid)$old$,
    $new$'can_sell', _store_can_sell_tickets(v_uid),
    'pending_requests', (SELECT count(*) FROM ticket_requests
                         WHERE store_owner_id = v_uid AND status = 'pending')$new$);
  IF position('pending_requests' IN v_def) = 0 THEN
    RAISE EXCEPTION 'get_my_ticketing rewrite did not apply';
  END IF;
  EXECUTE v_def;

  v_def := pg_get_functiondef('export_my_data()'::REGPROCEDURE);
  v_def := replace(v_def,
    $old$'ticket_waivers', _export_rows('ticket_waivers', 'buyer_id', v_uid),$old$,
    $new$'ticket_waivers', _export_rows('ticket_waivers', 'buyer_id', v_uid),
    'ticket_requests', _export_rows('ticket_requests', 'buyer_id', v_uid),$new$);
  IF position('''ticket_requests''' IN v_def) = 0 THEN
    RAISE EXCEPTION 'export_my_data rewrite did not apply';
  END IF;
  EXECUTE v_def;
END;
$do$;

-- ── 7. Function access ─────────────────────────────────────────────────────

REVOKE EXECUTE ON FUNCTION
  _ticket_request_eligible(tickets), _swap_target_ok(tickets, ticket_types),
  get_ticket_swap_options(UUID), request_ticket_change(UUID, TEXT, UUID), cancel_ticket_request(UUID),
  get_store_ticket_requests(), decline_ticket_request(UUID), approve_ticket_swap(UUID),
  _begin_request_refund(UUID, UUID), _finish_request_refund(UUID)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION _begin_request_refund(UUID, UUID), _finish_request_refund(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION
  get_ticket_swap_options(UUID), request_ticket_change(UUID, TEXT, UUID), cancel_ticket_request(UUID),
  get_store_ticket_requests(), decline_ticket_request(UUID), approve_ticket_swap(UUID)
TO authenticated;
