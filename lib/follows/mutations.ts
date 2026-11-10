import { supabase } from "@/lib/supabaseClient";

export class FollowError extends Error {}

// Returns the new state (true = now following).
export async function toggleFollow(profileId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("toggle_follow", { p_profile_id: profileId });
  if (error) {
    throw new FollowError(
      error.message.includes("PROFILE_PRIVATE") ? "Private profiles can't be followed." : "Couldn't update follow — try again."
    );
  }
  return data as boolean;
}

export async function removeFollower(profileId: string): Promise<void> {
  const { error } = await supabase.rpc("remove_follower", { p_profile_id: profileId });
  if (error) throw new FollowError("Couldn't remove follower — try again.");
}
