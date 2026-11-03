import type { ProfileSearchResult } from "@/lib/profiles/queries";
import { supabase } from "@/lib/supabaseClient";
import type { FriendStatusResult } from "./types";

export async function getFriendStatus(otherProfileId: string): Promise<FriendStatusResult> {
  const { data, error } = await supabase.rpc("get_friend_status", {
    p_other_profile_id: otherProfileId,
  });
  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : null;
  if (!row) return { status: "none", requestId: null };
  if (row.status === "accepted") return { status: "friends", requestId: row.request_id };
  if (row.status === "pending") {
    return {
      status: row.is_requester ? "pending_sent" : "pending_received",
      requestId: row.request_id,
    };
  }
  return { status: "none", requestId: null };
}

export async function getFriendCount(profileId: string): Promise<number> {
  const { data, error } = await supabase.rpc("get_friend_count", { p_profile_id: profileId });
  if (error) throw error;
  return (data as number | null) ?? 0;
}

export async function fetchMyFriends(): Promise<ProfileSearchResult[]> {
  const { data, error } = await supabase
    .rpc("get_my_friends")
    .select("profile_id, username, display_name, disciplines, city, avatar_url, is_private");
  if (error) throw error;

  const rows = Array.isArray(data) ? data : [];
  return rows.map((row) => ({
    profileId: row.profile_id,
    username: row.username,
    displayName: row.display_name,
    disciplines: row.disciplines,
    city: row.city,
    avatarUrl: row.avatar_url,
    isPrivate: row.is_private,
  }));
}
