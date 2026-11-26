import { supabase } from "@/lib/supabaseClient";
import { toScanResult, type ScanResultRow } from "./scanQueries";
import type { ScanResult } from "./scanTypes";
import { toTicketsError } from "./types";

// Checks a scanned ticket in at the calling store. Refusals come back as a
// result, not an error; errors are only for the call itself failing.
export async function redeemTicket(token: string): Promise<ScanResult> {
  const { data, error } = await supabase.rpc("redeem_ticket", { p_qr_token: token });
  if (error) throw toTicketsError(error);
  return toScanResult(data as ScanResultRow);
}
