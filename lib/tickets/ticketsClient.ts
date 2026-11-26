import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import { toTicketsError } from "./types";

// The tickets edge function. Its errors come back as { error: CODE }.
export async function invokeTickets<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("tickets", { body });
  if (error) {
    let code = "TICKETS_UNAVAILABLE";
    if (error instanceof FunctionsHttpError) {
      const payload = await error.context.json().catch(() => null);
      if (payload && typeof payload.error === "string") code = payload.error;
    }
    throw toTicketsError({ message: code });
  }
  return data as T;
}
