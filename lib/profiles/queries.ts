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

export async function searchProfilesByUsername(query: string): Promise<ProfileSearchResult[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("profile_id, username, display_name, disciplines, city, avatar_url, is_private")
    .ilike("username", `${query}%`)
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
