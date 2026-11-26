import { supabase } from "@/lib/supabaseClient";
import { toTicketType, type TicketTypeRow } from "./queries";
import type { StoreTicketRequest, TicketRequestKind } from "./requestTypes";
import { toCheckinSkater } from "./scanQueries";
import { toTicketsError, type TicketType } from "./types";

// Tickets this one could be swapped for: same store, on sale, at the same
// price, and not one the skater already holds.
export async function fetchSwapOptions(ticketId: string): Promise<TicketType[]> {
  const { data, error } = await supabase.rpc("get_ticket_swap_options", { p_ticket_id: ticketId });
  if (error) throw toTicketsError(error);
  return (data as TicketTypeRow[]).map(toTicketType);
}

type StoreRequestRow = {
  request_id: string;
  kind: TicketRequestKind;
  created_at: string;
  ticket_name: string;
  price_minor: number;
  currency: string;
  paid_at: string;
  swap_name: string | null;
  swap_price_minor: number | null;
  skater: Parameters<typeof toCheckinSkater>[0];
};

// The store's open refund and swap requests, oldest first.
export async function fetchStoreTicketRequests(): Promise<StoreTicketRequest[]> {
  const { data, error } = await supabase.rpc("get_store_ticket_requests");
  if (error) throw toTicketsError(error);
  return (data as StoreRequestRow[]).map((row) => ({
    requestId: row.request_id,
    kind: row.kind,
    createdAt: row.created_at,
    ticketName: row.ticket_name,
    priceMinor: row.price_minor,
    currency: row.currency,
    paidAt: row.paid_at,
    swapName: row.swap_name,
    swapPriceMinor: row.swap_price_minor,
    skater: toCheckinSkater(row.skater),
  }));
}
