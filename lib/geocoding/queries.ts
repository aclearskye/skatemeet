import { FunctionsHttpError } from "@supabase/supabase-js";
import { PlaceSearchRateLimitedError, type PlaceResult, type PlaceSearchKind } from "@/lib/geocoding/types";
import { supabase } from "@/lib/supabaseClient";

// Cities and areas (or, with kind "address", street addresses) matching
// `query`, via the geocode-place edge function (which forwards to Photon, an
// OpenStreetMap geocoder). Throws PlaceSearchRateLimitedError past 30
// searches a minute.
export async function searchPlaces(query: string, kind: PlaceSearchKind = "place"): Promise<PlaceResult[]> {
  const { data, error } = await supabase.functions.invoke("geocode-place", { body: { query, kind } });
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
