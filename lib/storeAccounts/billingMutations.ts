import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import { StoreAccountError, toStoreAccountError, type BillingAction } from "./types";

// The store-billing edge function. Its errors come back as { error: CODE }.
async function invokeBilling<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("store-billing", { body });
  if (error) {
    let code = "BILLING_UNAVAILABLE";
    if (error instanceof FunctionsHttpError) {
      const payload = await error.context.json().catch(() => null);
      if (payload && typeof payload.error === "string") code = payload.error;
    }
    throw toStoreAccountError({ message: code });
  }
  return data as T;
}

// A Stripe-hosted page (save a card, the billing portal, or resubscribe).
// returnUrl is where Stripe sends the browser back to.
export async function createBillingSession(action: BillingAction, returnUrl: string): Promise<string> {
  const { url } = await invokeBilling<{ url: string | null }>({ action, returnUrl });
  if (!url) throw new StoreAccountError("BILLING_UNAVAILABLE", "Billing isn't available right now.");
  return url;
}

// Starts the subscription after approval. No profileId: the caller's own
// store. With one: an admin, right after approving that store's claim.
export async function ensureStoreSubscription(profileId?: string): Promise<void> {
  await invokeBilling({ action: "ensure_subscription", ...(profileId ? { profileId } : {}) });
}
