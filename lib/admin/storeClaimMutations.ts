import { supabase } from "@/lib/supabaseClient";
import { ensureStoreSubscription } from "@/lib/storeAccounts/billingMutations";
import { AdminError } from "./mutations";

function toAdminError(error: { message: string }): AdminError {
  if (error.message.includes("NOT_ADMIN")) return new AdminError("NOT_ADMIN");
  if (error.message.includes("CLAIM_NOT_PENDING")) return new AdminError("REQUEST_NOT_PENDING");
  if (error.message.includes("NOTES_REQUIRED")) return new AdminError("NOTES_REQUIRED");
  return new AdminError("UNKNOWN");
}

export type StoreClaimDecision = { claimId: string; profileId: string; approve: boolean; notes: string };

// Approving makes the business the store's owner. For a dispute this revokes
// the current owner. Rejecting needs notes, which the business sees.
export async function reviewStoreClaim({ claimId, profileId, approve, notes }: StoreClaimDecision): Promise<void> {
  const { error } = await supabase.rpc("admin_review_store_claim", {
    p_claim_id: claimId,
    p_approve: approve,
    p_notes: notes,
  });
  if (error) throw toAdminError(error);
  // Starts the store's subscription (the 14-day trial runs from approval).
  // Best effort: the store's own app retries, and the trial counts from
  // approval either way.
  if (approve) await ensureStoreSubscription(profileId).catch(() => {});
}
