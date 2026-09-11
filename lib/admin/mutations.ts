import { supabase } from "@/lib/supabaseClient";
import type { AdminEntityKind, ReportResolution } from "./types";

export type AdminErrorCode =
  | "NOT_ADMIN"
  | "REQUEST_NOT_PENDING"
  | "INVALID_RESOLUTION"
  | "CANNOT_BAN_ADMIN"
  | "ALREADY_BANNED"
  | "NOT_BANNED"
  | "INVALID_DECISION"
  | "APPEAL_NOT_PENDING"
  | "BAN_TOO_RECENT"
  | "APPEAL_PENDING"
  | "UNKNOWN";

const MESSAGES: Record<AdminErrorCode, string> = {
  NOT_ADMIN: "You don't have admin access.",
  REQUEST_NOT_PENDING: "This request has already been reviewed.",
  INVALID_RESOLUTION: "Something went wrong — try again.",
  CANNOT_BAN_ADMIN: "You can't ban another admin.",
  ALREADY_BANNED: "This user is already banned.",
  NOT_BANNED: "This user isn't currently banned.",
  INVALID_DECISION: "Something went wrong — try again.",
  APPEAL_NOT_PENDING: "This appeal has already been reviewed.",
  BAN_TOO_RECENT: "This user hasn't been banned for 30 days yet.",
  APPEAL_PENDING: "This user has a pending appeal — resolve it first.",
  UNKNOWN: "Something went wrong — try again.",
};

export class AdminError extends Error {
  code: AdminErrorCode;
  constructor(code: AdminErrorCode) {
    super(MESSAGES[code]);
    this.code = code;
  }
}

function toAdminError(error: { message: string }): AdminError {
  const code = (Object.keys(MESSAGES) as AdminErrorCode[]).find((c) =>
    error.message.includes(c)
  );
  return new AdminError(code ?? "UNKNOWN");
}

export async function approveVerificationRequest(requestId: string): Promise<void> {
  const { error } = await supabase.rpc("admin_approve_verification", { p_request_id: requestId });
  if (error) throw toAdminError(error);
}

export async function rejectVerificationRequest(requestId: string): Promise<void> {
  const { error } = await supabase.rpc("admin_reject_verification", { p_request_id: requestId });
  if (error) throw toAdminError(error);
}

export async function resolvePhotoReport(
  photoId: string,
  entityKind: AdminEntityKind,
  resolution: ReportResolution
): Promise<void> {
  const rpc = entityKind === "spot" ? "admin_resolve_spot_photo_report" : "admin_resolve_store_photo_report";
  const { error } = await supabase.rpc(rpc, { p_photo_id: photoId, p_resolution: resolution });
  if (error) throw toAdminError(error);
}

export async function resolveReviewReport(
  reviewId: string,
  entityKind: AdminEntityKind,
  resolution: ReportResolution
): Promise<void> {
  const rpc = entityKind === "spot" ? "admin_resolve_spot_review_report" : "admin_resolve_store_review_report";
  const { error } = await supabase.rpc(rpc, { p_review_id: reviewId, p_resolution: resolution });
  if (error) throw toAdminError(error);
}

// No Edge Function involved -- a ban is purely a user_bans ledger row plus
// the is_banned()-driven app-level gate (AuthProvider + app/_layout.tsx).
// A banned account can still sign in; it's just confined to app/banned.tsx
// so it can reach the appeal form from an authenticated session, rather
// than being rejected outright at sign-in with a generic Auth-level error
// (the earlier admin-ban-user Edge Function set ban_duration, which did
// exactly that -- since retired, see 20260927000000_bans_without_auth_lockout.sql).
export async function banUser(profileId: string, reason: string): Promise<void> {
  const { error } = await supabase.rpc("admin_ban_user", { p_profile_id: profileId, p_reason: reason });
  if (error) throw toAdminError(error);
}

export async function unbanUser(profileId: string): Promise<void> {
  const { error } = await supabase.rpc("admin_unban_user", { p_profile_id: profileId });
  if (error) throw toAdminError(error);
}

export async function dismissProfileReport(profileId: string): Promise<void> {
  const { error } = await supabase.rpc("admin_dismiss_profile_report", { p_profile_id: profileId });
  if (error) throw toAdminError(error);
}

// "Banned" resolution isn't a separate call -- admin_ban_user (see
// lib/admin/mutations.ts's banUser) already closes out any open reports on
// the profile it bans as a side effect. This function only covers the
// "not bannable" path.
export async function resolveBanAppeal(
  appealId: string,
  profileId: string,
  decision: "reinstated" | "denied"
): Promise<void> {
  if (decision === "reinstated") {
    // Same ledger call a manual unban makes from app/admin/users.tsx -- an
    // appeal decision still has to actually clear the ban, not just record
    // the decision.
    await unbanUser(profileId);
  }
  const { error } = await supabase.rpc("admin_resolve_ban_appeal", {
    p_appeal_id: appealId,
    p_decision: decision,
  });
  if (error) throw toAdminError(error);
}

// DB deletion first, then the Edge Function -- see the migration's own
// comment on why that order is the retry-safe one here (opposite of the ban
// flow's Edge-Function-first order, because this DB step is fully within
// our transactional control and the Edge Function step becomes inert on its
// own if left stranded).
export async function deleteUserData(profileId: string): Promise<void> {
  const { error: rpcError } = await supabase.rpc("admin_delete_user_data", { p_profile_id: profileId });
  if (rpcError) throw toAdminError(rpcError);

  const { error: fnError } = await supabase.functions.invoke("admin-delete-user", {
    body: { profileId },
  });
  if (fnError) throw new AdminError("UNKNOWN");
}
