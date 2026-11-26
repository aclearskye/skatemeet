import { supabase } from "@/lib/supabaseClient";
import { toTicketsError } from "./types";
import type { ScanWaiver, StoreWaiver, TicketWaiverForm } from "./waiverTypes";

// The store's own current waiver, or null before it writes one.
export async function fetchMyStoreWaiver(): Promise<StoreWaiver | null> {
  const { data, error } = await supabase.rpc("get_my_store_waiver");
  if (error) throw toTicketsError(error);
  const row = data as { version: number; body: string; updated_at: string } | null;
  return row ? { version: row.version, body: row.body, updatedAt: row.updated_at } : null;
}

type WaiverFormRow = {
  version: number;
  body: string;
  prefill: { full_name: string; date_of_birth: string; emergency_name: string; emergency_phone: string } | null;
};

// The waiver a buyer signs at this store, or null when it has none.
export async function fetchTicketWaiverForm(storeOwnerId: string): Promise<TicketWaiverForm | null> {
  const { data, error } = await supabase.rpc("get_ticket_waiver_form", { p_owner: storeOwnerId });
  if (error) throw toTicketsError(error);
  const row = data as WaiverFormRow | null;
  if (!row) return null;
  return {
    version: row.version,
    body: row.body,
    prefill: row.prefill
      ? {
          fullName: row.prefill.full_name,
          dateOfBirth: row.prefill.date_of_birth,
          emergencyName: row.prefill.emergency_name,
          emergencyPhone: row.prefill.emergency_phone,
        }
      : null,
  };
}

export type ScanWaiverRow =
  | {
      signed: true;
      version: number;
      full_name: string;
      date_of_birth: string;
      emergency_name: string;
      emergency_phone: string;
      signed_name: string;
      signed_at: string;
    }
  | { signed: false; required: boolean };

export function toScanWaiver(row: ScanWaiverRow): ScanWaiver {
  if (!row.signed) return { signed: false, required: row.required };
  return {
    signed: true,
    version: row.version,
    fullName: row.full_name,
    dateOfBirth: row.date_of_birth,
    emergencyName: row.emergency_name,
    emergencyPhone: row.emergency_phone,
    signedName: row.signed_name,
    signedAt: row.signed_at,
  };
}
