import { supabase } from "@/lib/supabaseClient";
import { toTicketsError } from "./types";
import { toStoreWaiverRecord, type StoreWaiverRecord, type StoreWaiverRow } from "./waiverExport";

export const WAIVER_PAGE_SIZE = 50;

// The store's signed waivers, newest first. before: the last row's time.
export async function fetchStoreWaivers(search: string, before: string | null): Promise<StoreWaiverRecord[]> {
  const { data, error } = await supabase.rpc("get_store_waivers", { p_search: search, p_before: before });
  if (error) throw toTicketsError(error);
  return (data as StoreWaiverRow[]).map(toStoreWaiverRecord);
}

// Every waiver SkateMeet still holds for the store between two of its
// calendar days (YYYY-MM-DD, inclusive; null for no limit), with the text.
export async function exportStoreWaivers(from: string | null, to: string | null): Promise<StoreWaiverRecord[]> {
  const { data, error } = await supabase.rpc("export_store_waivers", { p_from: from, p_to: to });
  if (error) throw toTicketsError(error);
  return (data as StoreWaiverRow[]).map(toStoreWaiverRecord);
}

// One waiver with its text, for the printable page.
export async function fetchStoreWaiver(ticketId: string): Promise<StoreWaiverRecord | null> {
  const { data, error } = await supabase.rpc("get_store_waiver", { p_ticket_id: ticketId });
  if (error) throw toTicketsError(error);
  return data ? toStoreWaiverRecord(data as StoreWaiverRow) : null;
}
