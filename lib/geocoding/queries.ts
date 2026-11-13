import { FunctionsHttpError } from "@supabase/supabase-js";
import { PlaceSearchRateLimitedError, type PlaceResult } from "@/lib/geocoding/types";
import { supabase } from "@/lib/supabaseClient";

// Cities and areas matching `query`, via the geocode-place edge function
// (which forwards to Photon, an OpenStreetMap geocoder). Throws
// PlaceSearchRateLimitedError past 30 searches a minute.
export async function searchPlaces(query: string): Promise<PlaceResult[]> {
  const { data, error } = await supabase.functions.invoke("geocode-place", { body: { query } });
  if (error) {
    if (error instanceof FunctionsHttpError && error.context?.status === 429) {
      throw new PlaceSearchRateLimitedError();
    }
    throw error;
  }

  const results: unknown = data?.results;
  if (!Array.isArray(results)) return [];
  return results.filter(
    (result): result is PlaceResult =>
      typeof result?.label === "string" &&
      typeof result?.coords?.lat === "number" &&
      typeof result?.coords?.lng === "number"
  );
}
