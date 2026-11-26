import { supabase } from "@/lib/supabaseClient";
import { toTicketsError } from "./types";

// Saves the store's waiver text; a change makes a new version. Returns the
// current version.
export async function saveStoreWaiver(body: string): Promise<number> {
  const { data, error } = await supabase.rpc("save_store_waiver", { p_body: body });
  if (error) throw toTicketsError(error);
  return data as number;
}
