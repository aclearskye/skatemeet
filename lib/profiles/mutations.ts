import { supabase } from "@/lib/supabaseClient";
import type { TapeLabel } from "@/lib/shared/tapeLabels";
import type { ProfileReportReason } from "@/lib/shared/types";

export async function reportProfile(profileId: string, reason: ProfileReportReason): Promise<void> {
  const { error } = await supabase.rpc("report_profile", { p_profile_id: profileId, p_reason: reason });
  if (error) throw error;
}

export async function updateProfilePrivacy(profileId: string, isPrivate: boolean): Promise<void> {
  // Reads the row back so an update that matched zero rows (e.g. blocked by
  // RLS, which Postgres reports as success) surfaces as an error via
  // .single() instead of silently leaving the old value in place.
  const { error } = await supabase
    .from("profiles")
    .update({ is_private: isPrivate })
    .eq("profile_id", profileId)
    .select("is_private")
    .single();
  if (error) throw error;
}

// What the profile's pencil edits: the skate name and the duct-tape label
// row. Only the fields passed are written.
export type ProfileDetailsPatch = Partial<{
  display_name: string;
  skill_level: string | null;
  disciplines: string[] | null;
  labels: TapeLabel[];
}>;

// Read back for the same reason as updateProfilePrivacy: a zero-row update
// must not look like success.
export async function updateProfileDetails(profileId: string, patch: ProfileDetailsPatch): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("profile_id", profileId)
    .select("profile_id")
    .single();
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

// Records that the signed-in user passed the 18+ age gate. Only the
// timestamp is stored, never the date of birth.
export async function confirmAge(): Promise<void> {
  const { error } = await supabase.rpc("confirm_age");
  if (error) throw error;
}

// Deactivates the signed-in account pending appeal after it fails the 18+
// re-check -- an 'underage' ban, so app/_layout.tsx confines it to
// app/banned.tsx and the existing appeal flow. Idempotent server-side.
export async function recordUnderageSelfReport(): Promise<void> {
  const { error } = await supabase.rpc("record_underage_self_report");
  if (error) throw error;
}

export async function uploadAvatar(
  profileId: string,
  uri: string,
  mimeType: string
): Promise<string> {
  const ext = mimeType.split("/")[1] ?? "jpg";
  // A unique path per upload (rather than a fixed "avatar.<ext>" path with
  // upsert) keeps every write a storage.objects INSERT — the avatars bucket's
  // RLS policy only grants INSERT, so a fixed path's second-and-later upload
  // became an UPDATE and was rejected.
  const path = `${profileId}/${Date.now()}.${ext}`;

  // response.blob() silently yields an empty blob for local file:// URIs on
  // React Native — arrayBuffer() reads the same bytes reliably instead.
  const response = await fetch(uri);
  const arrayBuffer = await response.arrayBuffer();

  const { error } = await supabase.storage
    .from("avatars")
    .upload(path, arrayBuffer, { upsert: false, contentType: mimeType });
  if (error) throw error;

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return data.publicUrl;
}
