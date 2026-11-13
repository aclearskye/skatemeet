import { supabase } from "@/lib/supabaseClient";
import { AdminError } from "./mutations";

function toAdminError(error: { message: string }): AdminError {
  if (error.message.includes("NOT_ADMIN")) return new AdminError("NOT_ADMIN");
  if (error.message.includes("CLAIM_NOT_PENDING")) return new AdminError("REQUEST_NOT_PENDING");
  if (error.message.includes("NOTES_REQUIRED")) return new AdminError("NOTES_REQUIRED");
  return new AdminError("UNKNOWN");
}

export type StoreClaimDecision = { claimId: string; approve: boolean; notes: string };

// Approving makes the business the store's owner. For a dispute this revokes
// the current owner. Rejecting needs notes, which the business sees.
export async function reviewStoreClaim({ claimId, approve, notes }: StoreClaimDecision): Promise<void> {
  const { error } = await supabase.rpc("admin_review_store_claim", {
    p_claim_id: claimId,
    p_approve: approve,
    p_notes: notes,
  });
  if (error) throw toAdminError(error);
}
