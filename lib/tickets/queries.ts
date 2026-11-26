import { supabase } from "@/lib/supabaseClient";
import {
  toTicketsError,
  type MyTicket,
  type MyTicketing,
  type OwnTicketType,
  type StoreTickets,
  type TicketKind,
  type TicketType,
} from "./types";

type TicketTypeRow = {
  ticket_type_id: string;
  kind: TicketKind;
  name: string;
  description: string | null;
  price_minor: number;
  currency: string;
  weekday: number | null;
  start_time: string | null;
  end_time: string | null;
  valid_from: string | null;
  valid_to: string | null;
  is_active: boolean;
};

function toTicketType(row: TicketTypeRow): TicketType {
  return {
    ticketTypeId: row.ticket_type_id,
    kind: row.kind,
    name: row.name,
    description: row.description,
    priceMinor: row.price_minor,
    currency: row.currency,
    weekday: row.weekday,
    startTime: row.start_time,
    endTime: row.end_time,
    validFrom: row.valid_from,
    validTo: row.valid_to,
    isActive: row.is_active,
  };
}

type MyTicketingRow = {
  charges_enabled: boolean;
  details_submitted: boolean;
  currency: string;
  allow_under_18: boolean;
  can_sell: boolean;
};

// Null: the store hasn't started Stripe onboarding.
export async function fetchMyTicketing(): Promise<MyTicketing | null> {
  const { data, error } = await supabase.rpc("get_my_ticketing");
  if (error) throw toTicketsError(error);
  const row = data as MyTicketingRow | null;
  if (!row) return null;
  return {
    chargesEnabled: row.charges_enabled,
    detailsSubmitted: row.details_submitted,
    currency: row.currency,
    allowUnder18: row.allow_under_18,
    canSell: row.can_sell,
  };
}

export async function fetchMyTicketTypes(): Promise<OwnTicketType[]> {
  const { data, error } = await supabase.rpc("get_my_ticket_types");
  if (error) throw toTicketsError(error);
  return (data as (TicketTypeRow & { sold_count: number })[]).map((row) => ({
    ...toTicketType(row),
    soldCount: row.sold_count,
  }));
}

type StoreTicketsRow = {
  store_can_sell: boolean;
  blocked_reason: "store" | "account" | null;
  ticket_types: (TicketTypeRow & { viewer_can_buy: boolean })[];
};

// Null: the store doesn't sell tickets, or has none on sale.
export async function fetchStoreTickets(storeOwnerId: string): Promise<StoreTickets | null> {
  const { data, error } = await supabase.rpc("get_store_tickets", { p_owner: storeOwnerId });
  if (error) throw toTicketsError(error);
  const row = data as StoreTicketsRow | null;
  if (!row) return null;
  return {
    storeCanSell: row.store_can_sell,
    blockedReason: row.blocked_reason,
    ticketTypes: row.ticket_types.map((t) => ({ ...toTicketType(t), viewerCanBuy: t.viewer_can_buy })),
  };
}

type MyTicketRow = Omit<TicketTypeRow, "ticket_type_id" | "description" | "is_active"> & {
  ticket_id: string;
  ticket_type_id?: string;
  status: "paid" | "refunded";
  qr_token: string | null;
  paid_at: string;
  store_owner_id: string;
  store_name: string;
  logo_path: string | null;
};

export async function fetchMyTickets(): Promise<MyTicket[]> {
  const { data, error } = await supabase.rpc("get_my_tickets");
  if (error) throw toTicketsError(error);
  return (data as MyTicketRow[]).map((row) => ({
    ticketId: row.ticket_id,
    ticketTypeId: row.ticket_type_id ?? null,
    status: row.status,
    name: row.name,
    kind: row.kind,
    weekday: row.weekday,
    startTime: row.start_time,
    endTime: row.end_time,
    validFrom: row.valid_from,
    validTo: row.valid_to,
    priceMinor: row.price_minor,
    currency: row.currency,
    qrToken: row.qr_token,
    paidAt: row.paid_at,
    storeOwnerId: row.store_owner_id,
    storeName: row.store_name,
    logoPath: row.logo_path,
  }));
}
