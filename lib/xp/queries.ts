import { supabase } from "@/lib/supabaseClient";
import { computeLevelProgress, type UserXpState, type XpLevel } from "./types";

// Reference data — only changes via migration, never at runtime. Callers
// should use a long staleTime (see queryKeys.profileXp usage) rather than
// letting this refetch on every focus.
export async function fetchXpLevels(): Promise<XpLevel[]> {
  const { data, error } = await supabase
    .from("xp_levels")
    .select("level, xp_required, title")
    .order("level");
  if (error) throw error;
  return data.map((row) => ({
    level: row.level,
    xpRequired: row.xp_required,
    title: row.title,
  }));
}

async function fetchUserXp(profileId: string): Promise<{ xpTotal: number } | null> {
  const { data, error } = await supabase
    .from("user_xp")
    .select("xp_total")
    .eq("profile_id", profileId)
    .maybeSingle();
  if (error) throw error;
  return data ? { xpTotal: data.xp_total } : null;
}

export async function fetchProfileXpState(profileId: string): Promise<UserXpState> {
  const [userXp, levels] = await Promise.all([fetchUserXp(profileId), fetchXpLevels()]);
  return computeLevelProgress(userXp?.xpTotal ?? 0, levels);
}
