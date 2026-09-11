import { supabase } from "@/lib/supabaseClient";

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
