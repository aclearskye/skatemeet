import { supabase } from "@/lib/supabaseClient";
import type { SpotMetadata } from "./types";

export async function fetchSpotMetadata(
  spotId: string | null,
  osmPlaceId: string | null
): Promise<SpotMetadata | null> {
  if (!spotId && !osmPlaceId) return null;
  const { data, error } = await supabase
    .from("spot_metadata")
    .select("*")
    .eq(spotId ? "spot_id" : "osm_place_id", spotId ?? osmPlaceId)
    .maybeSingle();
  if (error) throw error;
  return data as SpotMetadata | null;
}
