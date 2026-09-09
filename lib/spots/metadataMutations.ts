import { supabase } from "@/lib/supabaseClient";
import { UpsertMetadataPayload } from "@/lib/shared/types";
import type { SpotMetadata } from "./types";

export async function upsertSpotMetadata(
  spotId: string | null,
  osmPlaceId: string | null,
  payload: UpsertMetadataPayload
): Promise<SpotMetadata> {
  const { data, error } = await supabase.rpc("upsert_spot_metadata", {
    p_spot_id: spotId,
    p_osm_place_id: osmPlaceId,
    p_opening_hours: payload.opening_hours,
    p_facilities: payload.facilities,
    p_parking: payload.parking,
    p_pet_friendly: payload.pet_friendly,
    p_paid: payload.paid,
    p_well_lit: payload.well_lit,
  });
  if (error) throw error;
  return data as SpotMetadata;
}
