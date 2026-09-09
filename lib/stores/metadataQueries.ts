import { supabase } from "@/lib/supabaseClient";
import type { StoreMetadata } from "./types";

export async function fetchStoreMetadata(
  storeId: string | null,
  osmPlaceId: string | null
): Promise<StoreMetadata | null> {
  if (!storeId && !osmPlaceId) return null;
  const { data, error } = await supabase
    .from("store_metadata")
    .select("*")
    .eq(storeId ? "store_id" : "osm_place_id", storeId ?? osmPlaceId)
    .maybeSingle();
  if (error) throw error;
  return data as StoreMetadata | null;
}
