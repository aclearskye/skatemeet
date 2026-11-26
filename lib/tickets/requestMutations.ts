import { supabase } from "@/lib/supabaseClient";
import type { RequestOutcome, ResolveRequestAction, TicketRequestKind } from "./requestTypes";
import { invokeTickets } from "./ticketsClient";
import { toTicketsError } from "./types";

// The skater asks the store for a refund, or a swap to swapTicketTypeId.
// When the store auto-approves it, it's done here too: a swap by the
// database straight away, a refund through Stripe (the tickets function).
export async function requestTicketChange(
  ticketId: string,
  kind: TicketRequestKind,
  swapTicketTypeId: string | null
): Promise<RequestOutcome> {
  const { data, error } = await supabase.rpc("request_ticket_change", {
    p_ticket_id: ticketId,
    p_kind: kind,
    p_swap_ticket_type_id: swapTicketTypeId,
  });
  if (error) throw toTicketsError(error);
  const { request_id: requestId, outcome } = data as { request_id: string; outcome: RequestOutcome };
  if (outcome !== "auto_refund") return outcome;
  const { refunded } = await invokeTickets<{ refunded: boolean }>({ action: "auto_refund", requestId });
  return refunded ? "refunded" : "pending";
}

// Turns the store's auto-approve rules on or off.
export async function setTicketRequestRules(autoApproveSwaps: boolean, autoRefundMaxMinor: number | null): Promise<void> {
  const { error } = await supabase.rpc("set_ticket_request_rules", {
    p_auto_approve_swaps: autoApproveSwaps,
    p_auto_refund_max_minor: autoRefundMaxMinor,
  });
  if (error) throw toTicketsError(error);
}

export async function cancelTicketRequest(requestId: string): Promise<void> {
  const { error } = await supabase.rpc("cancel_ticket_request", { p_request_id: requestId });
  if (error) throw toTicketsError(error);
}

// The store's answer. A refund goes through the tickets edge function,
// which refunds the payment in the store's Stripe account.
export async function resolveTicketRequest(requestId: string, action: ResolveRequestAction): Promise<void> {
  if (action === "refund") {
    await invokeTickets({ action: "refund_request", requestId });
    return;
  }
  const { error } = await supabase.rpc(action === "swap" ? "approve_ticket_swap" : "decline_ticket_request", {
    p_request_id: requestId,
  });
  if (error) throw toTicketsError(error);
}
