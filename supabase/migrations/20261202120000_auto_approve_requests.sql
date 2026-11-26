-- Stores can let refund and swap requests through without a person
-- (docs/ACCOUNT_TYPES.md, "Store", Tickets, decided 2026-11-26):
--
--   * auto_approve_swaps: a swap request (always same price) is done the
--     moment the skater asks.
--   * auto_refund_max_minor: a refund request for a ticket costing this
--     much or less is refunded straight away. NULL: every refund waits for
--     the store. The refund itself runs in the tickets edge function
--     (action auto_refund), because it goes through Stripe.
--   * Only new requests: turning a rule on doesn't touch requests already
--     waiting.

ALTER TABLE store_ticketing
  ADD COLUMN auto_approve_swaps BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN auto_refund_max_minor INT CHECK (auto_refund_max_minor BETWEEN 0 AND 100000);

CREATE FUNCTION set_ticket_request_rules(p_auto_approve_swaps BOOLEAN, p_auto_refund_max_minor INT) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := _assert_store_caller();
BEGIN
  IF NOT _store_can_edit_page(v_uid) THEN
    RAISE EXCEPTION '%', CASE WHEN _is_approved_store(v_uid) THEN 'STORE_UNPAID' ELSE 'STORE_NOT_APPROVED' END;
  END IF;
  IF p_auto_refund_max_minor IS NOT NULL AND p_auto_refund_max_minor NOT BETWEEN 0 AND 100000 THEN
    RAISE EXCEPTION 'INVALID_RULE';
  END IF;
  UPDATE store_ticketing SET
    auto_approve_swaps = coalesce(p_auto_approve_swaps, false),
    auto_refund_max_minor = p_auto_refund_max_minor,
    updated_at = now()
  WHERE profile_id = v_uid;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'TICKETING_NOT_CONNECTED';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION get_my_ticketing() RETURNS JSONB
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
    'can_sell', _store_can_sell_tickets(v_uid),
    'pending_requests', (SELECT count(*) FROM ticket_requests
                         WHERE store_owner_id = v_uid AND status = 'pending'),
    'auto_approve_swaps', v_row.auto_approve_swaps,
    'auto_refund_max_minor', v_row.auto_refund_max_minor
  );
END;
$$;

-- ── Swaps: one place that does the exchange ────────────────────────────────

-- Exchanges the request's ticket for the chosen one. Checks eligibility
-- itself; callers check who may approve.
CREATE FUNCTION _apply_ticket_swap(p_request_id UUID) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_request ticket_requests%ROWTYPE;
  v_ticket tickets%ROWTYPE;
  v_target ticket_types%ROWTYPE;
  v_new UUID;
BEGIN
  SELECT * INTO v_request FROM ticket_requests
  WHERE request_id = p_request_id AND status = 'pending' AND kind = 'swap'
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
  VALUES (v_target.ticket_type_id, v_ticket.buyer_id, v_ticket.store_owner_id, 'paid', v_target.name, v_target.kind,
          v_target.weekday, v_target.start_time, v_target.end_time, v_target.valid_from, v_target.valid_to,
          v_target.price_minor, v_target.currency, v_ticket.bought_as_under_18,
          encode(extensions.gen_random_bytes(24), 'hex'), now(), v_ticket.ticket_id)
  RETURNING ticket_id INTO v_new;
  UPDATE ticket_waivers SET ticket_id = v_new WHERE ticket_id = v_ticket.ticket_id;
  UPDATE ticket_requests SET status = 'approved', resolved_at = now() WHERE request_id = v_request.request_id;
END;
$$;

CREATE OR REPLACE FUNCTION approve_ticket_swap(p_request_id UUID) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_store UUID := _assert_scanning_store();
BEGIN
  IF NOT EXISTS (SELECT 1 FROM ticket_requests WHERE request_id = p_request_id AND store_owner_id = v_store) THEN
    RAISE EXCEPTION 'REQUEST_NOT_FOUND';
  END IF;
  PERFORM _apply_ticket_swap(p_request_id);
END;
$$;

-- ── Asking: now says what happened straight away ───────────────────────────

DROP FUNCTION request_ticket_change(UUID, TEXT, UUID);

-- Returns { request_id, outcome }:
--   'swapped'     the store auto-approves swaps; it's done
--   'auto_refund' the store auto-refunds this price; the app asks the
--                 tickets edge function (auto_refund) to do it now
--   'pending'     waiting for the store
CREATE FUNCTION request_ticket_change(p_ticket_id UUID, p_kind TEXT, p_swap_ticket_type_id UUID) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_ticket tickets%ROWTYPE;
  v_target ticket_types%ROWTYPE;
  v_rules store_ticketing%ROWTYPE;
  v_id UUID;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;
  SELECT * INTO v_ticket FROM tickets WHERE ticket_id = p_ticket_id AND buyer_id = v_uid FOR UPDATE;
  IF v_ticket.ticket_id IS NULL OR NOT _ticket_request_eligible(v_ticket) OR p_kind NOT IN ('refund', 'swap') THEN
    RAISE EXCEPTION 'NOT_ELIGIBLE';
  END IF;
  IF p_kind = 'swap' THEN
    SELECT * INTO v_target FROM ticket_types WHERE ticket_type_id = p_swap_ticket_type_id;
    IF v_target.ticket_type_id IS NULL OR NOT _swap_target_ok(v_ticket, v_target) THEN
      RAISE EXCEPTION 'SWAP_NOT_AVAILABLE';
    END IF;
  END IF;

  BEGIN
    INSERT INTO ticket_requests (ticket_id, buyer_id, store_owner_id, kind, swap_ticket_type_id)
    VALUES (v_ticket.ticket_id, v_uid, v_ticket.store_owner_id, p_kind,
            CASE WHEN p_kind = 'swap' THEN p_swap_ticket_type_id END)
    RETURNING request_id INTO v_id;
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'REQUEST_OPEN';
  END;

  SELECT * INTO v_rules FROM store_ticketing WHERE profile_id = v_ticket.store_owner_id;
  IF p_kind = 'swap' AND coalesce(v_rules.auto_approve_swaps, false) THEN
    PERFORM _apply_ticket_swap(v_id);
    RETURN jsonb_build_object('request_id', v_id, 'outcome', 'swapped');
  END IF;
  IF p_kind = 'refund' AND v_rules.auto_refund_max_minor IS NOT NULL
     AND v_ticket.price_minor <= v_rules.auto_refund_max_minor
     AND v_ticket.stripe_payment_intent_id IS NOT NULL THEN
    RETURN jsonb_build_object('request_id', v_id, 'outcome', 'auto_refund');
  END IF;
  RETURN jsonb_build_object('request_id', v_id, 'outcome', 'pending');
END;
$$;

-- For the tickets edge function's auto_refund: the store whose rule covers
-- this skater's open refund request, or NULL (the store decides instead).
CREATE FUNCTION _auto_refund_store(p_request_id UUID, p_buyer UUID) RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.store_owner_id
  FROM ticket_requests r
  JOIN tickets k ON k.ticket_id = r.ticket_id
  JOIN store_ticketing s ON s.profile_id = r.store_owner_id
  WHERE r.request_id = p_request_id AND r.buyer_id = p_buyer
    AND r.status = 'pending' AND r.kind = 'refund'
    AND s.auto_refund_max_minor IS NOT NULL AND k.price_minor <= s.auto_refund_max_minor;
$$;

REVOKE EXECUTE ON FUNCTION
  set_ticket_request_rules(BOOLEAN, INT), _apply_ticket_swap(UUID), approve_ticket_swap(UUID),
  request_ticket_change(UUID, TEXT, UUID), _auto_refund_store(UUID, UUID), get_my_ticketing()
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION _auto_refund_store(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION
  set_ticket_request_rules(BOOLEAN, INT), approve_ticket_swap(UUID), request_ticket_change(UUID, TEXT, UUID),
  get_my_ticketing()
TO authenticated;
