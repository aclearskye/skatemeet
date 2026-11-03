import type { Profile } from "@/lib/context/use-auth-context";
import { supabase } from "@/lib/supabaseClient";
import { SEARCH_PAGE_SIZE } from "@/utils/constants";

export type ProfileSearchResult = {
  profileId: string;
  username: string;
  displayName: string | null;
  disciplines: string[] | null;
  city: string | null;
  avatarUrl: string | null;
  isPrivate: boolean;
};

// RLS already drops private non-friends and blocked pairs; the viewer is
// excluded here, since their own row is always readable to them.
export async function searchProfilesByUsername(query: string, viewerId: string): Promise<ProfileSearchResult[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("profile_id, username, display_name, disciplines, city, avatar_url, is_private")
    .ilike("username", `${query}%`)
    .neq("profile_id", viewerId)
    .order("username", { ascending: true })
    .limit(SEARCH_PAGE_SIZE);
  if (error) throw error;

  return data.map((row) => ({
    profileId: row.profile_id,
    username: row.username,
    displayName: row.display_name,
    disciplines: row.disciplines,
    city: row.city,
    avatarUrl: row.avatar_url,
    isPrivate: row.is_private,
  }));
}

export async function hasReportedProfile(profileId: string, reportedBy: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("profile_reports")
    .select("report_id")
    .eq("profile_id", profileId)
    .eq("reported_by", reportedBy)
    .maybeSingle();
  if (error) throw error;
  return data != null;
}

export type BanAppealStatus = "none" | "pending" | "denied";

export async function getBanAppealStatus(profileId: string): Promise<BanAppealStatus> {
  const { data, error } = await supabase.rpc("get_ban_appeal_status", { p_profile_id: profileId });
  if (error) throw error;
  return data as BanAppealStatus;
}

// null when RLS hides the row: a private profile the viewer isn't friends
// with, a blocked pair, or a deleted account.
export async function fetchUserProfile(profileId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("profile_id", profileId)
    .maybeSingle();
  if (error) throw error;
  return data as Profile | null;
}

export type ProfileCard = {
  profileId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  isPrivate: boolean;
};

// The minimal card a non-friend may still see of a private profile. null
// means blocked (either direction) or deleted -- deliberately the same.
export async function fetchProfileCard(profileId: string): Promise<ProfileCard | null> {
  const { data, error } = await supabase
    .from("profile_cards")
    .select("profile_id, username, display_name, avatar_url, is_private")
    .eq("profile_id", profileId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    profileId: data.profile_id,
    username: data.username,
    displayName: data.display_name,
    avatarUrl: data.avatar_url,
    isPrivate: data.is_private,
  };
}

export class DataExportError extends Error {
  isRateLimited: boolean;
  constructor(isRateLimited: boolean) {
    super(
      isRateLimited
        ? "You can download your data once an hour. Try again later."
        : "Couldn't prepare your data — try again."
    );
    this.isRateLimited = isRateLimited;
  }
}

// GDPR Art. 15/20: everything held about the caller, as one JSON document.
export async function exportMyData(): Promise<unknown> {
  const { data, error } = await supabase.rpc("export_my_data");
  if (error) throw new DataExportError(error.message.includes("EXPORT_RATE_LIMITED"));
  return data;
}
