import { supabase } from "@/lib/supabaseClient";
import type { BlockedProfile } from "./types";

// Whether the viewer blocked otherProfileId. profile_blocks' RLS only
// exposes blocks the viewer made, so a block *against* them never shows.
export async function fetchBlockStatus(viewerId: string, otherProfileId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("profile_blocks")
    .select("blocked_id")
    .eq("blocker_id", viewerId)
    .eq("blocked_id", otherProfileId)
    .maybeSingle();
  if (error) throw error;
  return data != null;
}

type BlockRow = {
  profile_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  blocked_at: string;
};

export async function fetchMyBlocks(): Promise<BlockedProfile[]> {
  const { data, error } = await supabase.rpc("get_my_blocks");
  if (error) throw error;
  return (data as BlockRow[]).map((row) => ({
    profileId: row.profile_id,
    username: row.username,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    blockedAt: row.blocked_at,
  }));
}
