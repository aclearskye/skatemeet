import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import { toCommerceError } from "./types";

// The storefront edge function. Its errors come back as { error: CODE }.
export async function invokeStorefront<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("storefront", { body });
  if (error) {
    let code = "SHOP_UNAVAILABLE";
    if (error instanceof FunctionsHttpError) {
      const payload = await error.context.json().catch(() => null);
      if (payload && typeof payload.error === "string") code = payload.error;
    }
    throw toCommerceError({ message: code });
  }
  return data as T;
}
