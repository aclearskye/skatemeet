import { supabase } from "@/lib/supabaseClient";
import { AdminError } from "./mutations";

function toAdminError(error: { message: string }): AdminError {
  if (error.message.includes("NOT_ADMIN")) return new AdminError("NOT_ADMIN");
  return new AdminError("UNKNOWN");
}

// Approve and Suspected CSAM both move files between Storage buckets, which
// only the moderate-post edge function (service role) can do.
async function invokeModeration(action: "approve" | "csam", postId: string): Promise<void> {
  const { error } = await supabase.functions.invoke("moderate-post", {
    body: { action, post_id: postId },
  });
  if (error) throw new AdminError("UNKNOWN");
}

export function approveHeldPost(postId: string): Promise<void> {
  return invokeModeration("approve", postId);
}

// Bans the author, removes the post, moves its files to the locked evidence
// bucket and opens the NCA reporting task.
export function flagSuspectedCsam(postId: string): Promise<void> {
  return invokeModeration("csam", postId);
}

export async function removeHeldPost(postId: string, reason: string | null): Promise<void> {
  const { error } = await supabase.rpc("admin_remove_post", { p_post_id: postId, p_reason: reason });
  if (error) throw toAdminError(error);
}

export async function reviewCaptionFlag(eventId: string): Promise<void> {
  const { error } = await supabase.rpc("admin_review_caption_flag", { p_event_id: eventId });
  if (error) throw toAdminError(error);
}

export async function markCsamHoldFiled(holdId: string, reference: string): Promise<void> {
  const { error } = await supabase.rpc("admin_mark_csam_hold_filed", { p_hold_id: holdId, p_reference: reference });
  if (error) throw toAdminError(error);
}
