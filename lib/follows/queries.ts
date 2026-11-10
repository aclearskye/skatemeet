import { supabase } from "@/lib/supabaseClient";
import type { FollowCounts, FollowDirection, FollowListItem } from "./types";

// Active follows only: a follow of someone who has since gone private is
// dormant (not counted) unless the two are friends.
export async function getFollowCounts(profileId: string): Promise<FollowCounts> {
  const { data, error } = await supabase.rpc("get_follow_counts", { p_profile_id: profileId });
  if (error) throw error;
  const row = (data as { followers: number; following: number }[])[0];
  return { followers: row?.followers ?? 0, following: row?.following ?? 0 };
}

export async function isFollowing(viewerId: string, profileId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from("crew_follows")
    .select("following_id", { count: "exact", head: true })
    .eq("follower_id", viewerId)
    .eq("following_id", profileId);
  if (error) throw error;
  return (count ?? 0) > 0;
}

type FollowListRow = {
  profile_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  is_private: boolean;
  viewer_follows: boolean;
};

export const FOLLOW_PAGE_SIZE = 30;

export async function listFollows(
  profileId: string,
  direction: FollowDirection,
  query: string,
  offset: number
): Promise<FollowListItem[]> {
  const { data, error } = await supabase.rpc("list_follows", {
    p_profile_id: profileId,
    p_direction: direction,
    p_query: query,
    p_offset: offset,
    p_limit: FOLLOW_PAGE_SIZE,
  });
  if (error) throw error;
  return (data as FollowListRow[]).map((r) => ({
    profileId: r.profile_id,
    username: r.username,
    displayName: r.display_name,
    avatarUrl: r.avatar_url,
    isPrivate: r.is_private,
    viewerFollows: r.viewer_follows,
  }));
}
