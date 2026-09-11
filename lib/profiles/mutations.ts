import { supabase } from "@/lib/supabaseClient";
import type { ProfileReportReason } from "@/lib/shared/types";

export async function reportProfile(profileId: string, reason: ProfileReportReason): Promise<void> {
  const { error } = await supabase.rpc("report_profile", { p_profile_id: profileId, p_reason: reason });
  if (error) throw error;
}

export type BanAppealErrorCode = "NO_ACTIVE_BAN" | "TESTIMONY_REQUIRED" | "ALREADY_APPEALED" | "UNKNOWN";

const BAN_APPEAL_MESSAGES: Record<BanAppealErrorCode, string> = {
  NO_ACTIVE_BAN: "We couldn't find an active ban for that username.",
  TESTIMONY_REQUIRED: "Please explain why you should be unbanned.",
  ALREADY_APPEALED: "You've already submitted an appeal for this ban.",
  UNKNOWN: "Something went wrong — try again.",
};

export class BanAppealError extends Error {
  code: BanAppealErrorCode;
  constructor(code: BanAppealErrorCode) {
    super(BAN_APPEAL_MESSAGES[code]);
    this.code = code;
  }
}

// Keyed by username rather than auth.uid() -- a banned account can sign in
// normally now (see 20260927000000_bans_without_auth_lockout.sql), but this
// stays anon-callable too for the rarer case of reaching app/banned.tsx
// without a session at all. Only ever accepts one appeal per ban -- see
// submit_ban_appeal's own migration comment.
export async function submitBanAppeal(username: string, testimony: string): Promise<void> {
  const { error } = await supabase.rpc("submit_ban_appeal", { p_username: username, p_testimony: testimony });
  if (error) {
    const code = (Object.keys(BAN_APPEAL_MESSAGES) as BanAppealErrorCode[]).find((c) =>
      error.message.includes(c)
    );
    throw new BanAppealError(code ?? "UNKNOWN");
  }
}

// Self-service, immediate, no admin approval or 30-day wait -- available to
// any signed-in user from Settings, and offered on app/banned.tsx as the
// alternative to appealing. DB deletion first, then the Edge Function, same
// retry-safe ordering as admin_delete_user_data/admin-delete-user (the DB
// step is fully within our transactional control; a failure in the Edge
// Function afterward just strands an inert orphaned Auth credential that's
// safe to retry). Signs the local session out at the end regardless, since
// the account backing it no longer exists either way.
export async function deactivateAccount(): Promise<void> {
  const { error: rpcError } = await supabase.rpc("self_delete_account");
  if (rpcError) throw rpcError;

  try {
    const { error: fnError } = await supabase.functions.invoke("self-delete-account");
    if (fnError) throw fnError;
  } finally {
    // The profile row is already gone at this point either way -- sign out
    // regardless of whether the Edge Function step below succeeds, so the
    // client never holds a session with no profile behind it (which
    // app/_layout.tsx would otherwise mistake for "needs onboarding").
    await supabase.auth.signOut();
  }
}
