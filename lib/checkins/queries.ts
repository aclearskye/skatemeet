import { BoundingBox } from "@/lib/spots/types";
import { supabase } from "@/lib/supabaseClient";
import { CheckIn, EntityRef, UserStreak } from "./types";

export async function fetchActiveCheckIn(profileId: string): Promise<CheckIn | null> {
  const { data, error } = await supabase
    .from("check_ins")
    .select("*")
    .eq("profile_id", profileId)
    .is("checked_out_at", null)
    .maybeSingle();
  if (error) throw error;
  return data as CheckIn | null;
}

export async function fetchLiveCount(ref: EntityRef): Promise<number> {
  const { data, error } = await supabase.rpc("get_live_count", {
    p_spot_id: ref.spotId,
    p_osm_spot_place_id: ref.osmSpotPlaceId,
    p_store_id: ref.storeId,
    p_osm_store_place_id: ref.osmStorePlaceId,
  });
  if (error) throw error;
  return data as number;
}

export type LiveCountRow = { entity_key: string; live_count: number };

export async function fetchLiveCountsInBbox(bbox: BoundingBox): Promise<LiveCountRow[]> {
  const { data, error } = await supabase.rpc("get_live_counts_in_bbox", {
    p_min_lat: bbox.minLat,
    p_max_lat: bbox.maxLat,
    p_min_lng: bbox.minLng,
    p_max_lng: bbox.maxLng,
  });
  if (error) throw error;
  return data as LiveCountRow[];
}

export async function fetchProfileVisitedCount(profileId: string): Promise<number> {
  const { data, error } = await supabase.rpc("get_profile_visited_count", {
    p_profile_id: profileId,
  });
  if (error) throw error;
  return data as number;
}

export async function fetchUserStreak(profileId: string): Promise<UserStreak | null> {
  const { data, error } = await supabase
    .from("user_streaks")
    .select("*")
    .eq("profile_id", profileId)
    .maybeSingle();
  if (error) throw error;
  return data as UserStreak | null;
}
