import { supabase } from "@/lib/supabaseClient";
import { toggleVoteRow } from "@/lib/shared/votes";
import { getSpotVoteCount } from "./queries";
import type { CreateSpotPayload, SkateSpot } from "./types";

export async function createSpot(
  payload: CreateSpotPayload,
  userId: string
): Promise<SkateSpot> {
  const { data, error } = await supabase
    .from("user_spots")
    .insert({ ...payload, created_by: userId })
    .select()
    .single();
  if (error) throw error;
  return data as SkateSpot;
}

export async function deleteSpot(spotId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from("user_spots")
    .delete()
    .eq("spot_id", spotId)
    .eq("created_by", userId);
  if (error) throw error;
}

export async function uploadSpotPhoto(
  userId: string,
  localUri: string,
  mimeType?: string
): Promise<string> {
  const { uploadFile } = await import("@/lib/storage");
  return uploadFile(userId, localUri, "spot-images", mimeType);
}

export async function linkSpotPhoto(
  target: { spotId: string } | { osmPlaceId: string },
  mediaUrl: string
): Promise<void> {
  const { error } = await supabase.rpc("add_spot_photo", {
    p_spot_id: "spotId" in target ? target.spotId : null,
    p_osm_place_id: "osmPlaceId" in target ? target.osmPlaceId : null,
    p_media_url: mediaUrl,
  });
  if (error) throw error;
}

export async function addSpotPhoto(
  target: { spotId: string } | { osmPlaceId: string },
  localUri: string,
  mimeType: string,
  userId: string
): Promise<string> {
  const mediaUrl = await uploadSpotPhoto(userId, localUri, mimeType);
  await linkSpotPhoto(target, mediaUrl);
  return mediaUrl;
}

export async function toggleSpotVote(
  spotId: string | null,
  osmPlaceId: string | null,
  userId: string
): Promise<{ upvote_count: number; user_has_voted: boolean }> {
  const filter: Record<string, string> = spotId
    ? { spot_id: spotId }
    : { osm_place_id: osmPlaceId! };
  const user_has_voted = await toggleVoteRow("spot_votes", filter, userId);
  const upvote_count = await getSpotVoteCount(spotId, osmPlaceId);
  return { upvote_count, user_has_voted };
}

export async function toggleSpotFavorite(
  spotId: string | null,
  osmPlaceId: string | null,
  userId: string
): Promise<boolean> {
  const payload = spotId
    ? { profile_id: userId, spot_id: spotId }
    : { profile_id: userId, osm_place_id: osmPlaceId };

  const { error: insertError } = await supabase.from("spot_favorites").insert(payload);

  if (insertError) {
    if (insertError.code === "23505") {
      const base = supabase.from("spot_favorites").delete().eq("profile_id", userId);
      const { error: deleteError } = spotId
        ? await base.eq("spot_id", spotId)
        : await base.eq("osm_place_id", osmPlaceId!);
      if (deleteError) throw deleteError;
      return false;
    }
    throw insertError;
  }
  return true;
}
