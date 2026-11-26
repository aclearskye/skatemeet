-- One ticket per skater per ticket type (docs/ACCOUNT_TYPES.md, "Store",
-- Tickets). A ticket is personal: it carries the buyer's own waiver and,
-- for a Child, their parent's consent, so there's no buying a second one
-- or buying for a friend.
--
--   * _begin_ticket_purchase refuses a skater who already holds a paid
--     ticket of that type (ALREADY_HAS_TICKET). The tickets edge function
--     also closes the skater's earlier unpaid checkouts for that type
--     before opening a new one.
--   * If two checkouts are paid anyway (both open, both paid at once), the
--     second completion is marked refunded and the webhook refunds it in
--     Stripe. _complete_ticket_purchase now says which happened.
--   * A unique index makes a second paid ticket impossible whatever the
--     timing. Entry scanning will move a used session ticket out of 'paid'
--     (a 'used' status), so the skater can buy the next session.

CREATE UNIQUE INDEX tickets_one_paid_per_type ON tickets (buyer_id, ticket_type_id) WHERE status = 'paid';

-- ── 1. Refuse a second ticket at checkout ──────────────────────────────────

DO $do$
DECLARE
  v_def TEXT := pg_get_functiondef('_begin_ticket_purchase(uuid, uuid)'::REGPROCEDURE);
BEGIN
  v_def := replace(v_def,
    $old$  IF NOT _can_buy_ticket(p_buyer, v_type) THEN
    RAISE EXCEPTION 'CANNOT_BUY_TICKET';
  END IF;$old$,
    $new$  IF NOT _can_buy_ticket(p_buyer, v_type) THEN
    RAISE EXCEPTION 'CANNOT_BUY_TICKET';
  END IF;
  IF EXISTS (SELECT 1 FROM tickets k
             WHERE k.buyer_id = p_buyer AND k.ticket_type_id = p_ticket_type_id AND k.status = 'paid') THEN
    RAISE EXCEPTION 'ALREADY_HAS_TICKET';
  END IF;$new$);
  IF position('ALREADY_HAS_TICKET' IN v_def) = 0 THEN
    RAISE EXCEPTION '_begin_ticket_purchase rewrite did not apply';
  END IF;
  EXECUTE v_def;
END;
$do$;

-- ── 2. Completion: paid, or a duplicate to refund ──────────────────────────

DROP FUNCTION _complete_ticket_purchase(TEXT, TEXT, TEXT, INT, TEXT);

-- checkout.session.completed (paid) on a connected account. Returns:
--   'paid'       the ticket is now (or already was) paid
--   'duplicate'  the buyer already had this ticket: this payment must be
--                refunded in Stripe (returned again on a retried event, so
--                the webhook can retry the refund)
--   'refunded'   already refunded by the store
--   'unmatched'  no ticket for this session, account and amount
-- A duplicate is told apart from a store refund by paid_at being NULL.
CREATE FUNCTION _complete_ticket_purchase(
  p_session_id TEXT, p_account_id TEXT, p_payment_intent_id TEXT, p_amount_total INT, p_currency TEXT
) RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_ticket tickets%ROWTYPE;
BEGIN
  SELECT k.* INTO v_ticket
  FROM tickets k
  JOIN store_ticketing s ON s.profile_id = k.store_owner_id
  WHERE k.stripe_checkout_session_id = p_session_id
    AND s.stripe_account_id = p_account_id
    AND k.price_minor = p_amount_total
    AND k.currency = upper(p_currency)
  FOR UPDATE OF k;

  IF v_ticket.ticket_id IS NULL THEN
    RETURN 'unmatched';
  ELSIF v_ticket.status = 'paid' THEN
    RETURN 'paid';
  ELSIF v_ticket.status = 'refunded' THEN
    RETURN CASE WHEN v_ticket.paid_at IS NULL THEN 'duplicate' ELSE 'refunded' END;
  END IF;

  BEGIN
    UPDATE tickets SET
      status = 'paid',
      paid_at = now(),
      stripe_payment_intent_id = p_payment_intent_id,
      qr_token = encode(extensions.gen_random_bytes(24), 'hex')
    WHERE ticket_id = v_ticket.ticket_id;
    RETURN 'paid';
  EXCEPTION
    -- tickets_one_paid_per_type: the buyer already holds this ticket.
    WHEN unique_violation THEN
      UPDATE tickets SET
        status = 'refunded',
        refunded_at = now(),
        stripe_payment_intent_id = p_payment_intent_id,
        qr_token = NULL
      WHERE ticket_id = v_ticket.ticket_id;
      RETURN 'duplicate';
  END;
END;
$$;

REVOKE EXECUTE ON FUNCTION _complete_ticket_purchase(TEXT, TEXT, TEXT, INT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION _complete_ticket_purchase(TEXT, TEXT, TEXT, INT, TEXT) TO service_role;
