import { supabase } from "@/lib/supabaseClient";
import { toCheckInRequiredError } from "@/lib/shared/checkInRequiredError";
import type { SpotMetric } from "./ratingMetrics";

// Sets (1–5) or clears (null) the caller's rating for one data point. The
// DB only allows it after a manual check-in here.
export async function rateSpot(
  spotId: string | null,
  osmPlaceId: string | null,
  metric: SpotMetric,
  rating: number | null
): Promise<void> {
  const { error } = await supabase.rpc("rate_spot", {
    p_spot_id: spotId,
    p_osm_place_id: spotId ? null : osmPlaceId,
    p_metric: metric,
    p_rating: rating,
  });
  if (error) throw toCheckInRequiredError(error, "rate this spot");
}
