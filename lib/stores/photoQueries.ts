import { supabase } from "@/lib/supabaseClient";
import type { StorePhoto } from "./types";

export async function fetchStorePhotos(
  storeId: string | null,
  osmPlaceId: string | null
): Promise<StorePhoto[]> {
  const { data, error } = await supabase
    .from("store_photos")
    .select("*")
    .eq(storeId ? "store_id" : "osm_place_id", storeId ?? osmPlaceId)
    .eq("is_hidden", false);
  if (error) throw error;
  const rows = (data ?? []) as StorePhoto[];
  // Same ordering as the DB's cover-photo trigger (score desc, newest first),
  // so the carousel opens on whichever photo is currently the cover.
  return rows.sort((a, b) => {
    const scoreDiff =
      b.upvote_count - b.downvote_count - (a.upvote_count - a.downvote_count);
    if (scoreDiff !== 0) return scoreDiff;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

export async function getStorePhotoVoteStatuses(
  photoIds: string[],
  userId: string
): Promise<Record<string, 1 | -1>> {
  if (photoIds.length === 0) return {};
  const { data, error } = await supabase
    .from("store_photo_votes")
    .select("photo_id, vote_value")
    .eq("profile_id", userId)
    .in("photo_id", photoIds);
  if (error) throw error;
  const result: Record<string, 1 | -1> = {};
  for (const row of (data ?? []) as { photo_id: string; vote_value: 1 | -1 }[]) {
    result[row.photo_id] = row.vote_value;
  }
  return result;
}

export async function getStorePhotoReportStatuses(
  photoIds: string[],
  userId: string
): Promise<Record<string, boolean>> {
  if (photoIds.length === 0) return {};
  const { data, error } = await supabase
    .from("store_photo_reports")
    .select("photo_id")
    .eq("profile_id", userId)
    .in("photo_id", photoIds);
  if (error) throw error;
  const result: Record<string, boolean> = {};
  for (const row of (data ?? []) as { photo_id: string }[]) {
    result[row.photo_id] = true;
  }
  return result;
}
