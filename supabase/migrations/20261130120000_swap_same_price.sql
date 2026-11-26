-- Swaps are for a ticket at the same price only (decided 2026-11-26): an
-- unused ticket moves to another ticket worth exactly the same at the same
-- store, so no money changes hands either way. Was "the same or less".

CREATE OR REPLACE FUNCTION _swap_target_ok(p_ticket tickets, p_target ticket_types) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p_target.store_owner_id = p_ticket.store_owner_id
     AND p_target.ticket_type_id <> p_ticket.ticket_type_id
     AND p_target.price_minor = p_ticket.price_minor
     AND p_target.currency = p_ticket.currency
     AND _ticket_type_on_sale(p_target)
     AND _can_buy_ticket(p_ticket.buyer_id, p_target)
     AND NOT EXISTS (SELECT 1 FROM tickets k WHERE k.buyer_id = p_ticket.buyer_id
                     AND k.ticket_type_id = p_target.ticket_type_id AND k.status = 'paid');
$$;

REVOKE EXECUTE ON FUNCTION _swap_target_ok(tickets, ticket_types) FROM PUBLIC, anon, authenticated;
