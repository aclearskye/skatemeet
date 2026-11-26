import { supabase } from "@/lib/supabaseClient";
import { invokeTickets } from "./ticketsClient";
import { TicketsError, toTicketsError, type SaveTicketTypePayload } from "./types";
import type { WaiverSignature } from "./waiverTypes";

// Stripe's hosted onboarding for the store's own Stripe account.
export async function createTicketingOnboardingLink(returnUrl: string): Promise<string> {
  const { url } = await invokeTickets<{ url: string }>({ action: "connect_onboard", returnUrl });
  return url;
}

// Re-reads the store's Stripe account after onboarding.
export async function refreshTicketingAccount(): Promise<void> {
  await invokeTickets({ action: "connect_refresh" });
}

export async function setTicketingUnder18(allow: boolean): Promise<void> {
  const { error } = await supabase.rpc("set_ticketing_under_18", { p_allow: allow });
  if (error) throw toTicketsError(error);
}

export async function saveTicketType(payload: SaveTicketTypePayload): Promise<string> {
  const { data, error } = await supabase.rpc("save_ticket_type", {
    p_ticket_type_id: payload.ticketTypeId,
    p_kind: payload.kind,
    p_name: payload.name,
    p_description: payload.description,
    p_price_minor: payload.priceMinor,
    p_weekday: payload.weekday,
    p_start_time: payload.startTime,
    p_end_time: payload.endTime,
    p_valid_from: payload.validFrom,
    p_valid_to: payload.validTo,
    p_pass_days: payload.passDays,
  });
  if (error) throw toTicketsError(error);
  return data as string;
}

export async function setTicketTypeActive(ticketTypeId: string, active: boolean): Promise<void> {
  const { error } = await supabase.rpc("set_ticket_type_active", { p_ticket_type_id: ticketTypeId, p_active: active });
  if (error) throw toTicketsError(error);
}

// A Stripe Checkout page for one ticket, run on the store's own account.
// waiver: the store's waiver, signed in the app (required when it has one).
export async function createTicketCheckout(
  ticketTypeId: string,
  returnUrl: string,
  waiver: WaiverSignature | null
): Promise<string> {
  const { url } = await invokeTickets<{ url: string | null }>({ action: "checkout", ticketTypeId, returnUrl, waiver });
  if (!url) throw new TicketsError("TICKETS_UNAVAILABLE", "Tickets aren't available right now. Try again in a minute.");
  return url;
}
