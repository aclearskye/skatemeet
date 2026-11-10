import { supabase } from "@/lib/supabaseClient";
import { computeAverageRating } from "@/lib/shared/ratings";
import { SPOT_METRICS, type MetricSummary, type SpotMetric } from "./ratingMetrics";

type RatingRow = { metric: SpotMetric; rating: number };

// Community average and count for each data point on one spot (user spot
// or OSM spot), read straight from the ratings so it's always current.
export async function fetchSpotRatings(
  spotId: string | null,
  osmPlaceId: string | null
): Promise<Record<SpotMetric, MetricSummary>> {
  const { data, error } = await supabase
    .from("spot_ratings")
    .select("metric, rating")
    .eq(spotId ? "spot_id" : "osm_place_id", spotId ?? osmPlaceId);
  if (error) throw error;
  const rows = (data ?? []) as RatingRow[];
  const result = {} as Record<SpotMetric, MetricSummary>;
  for (const metric of SPOT_METRICS) {
    result[metric] = computeAverageRating(rows.filter((r) => r.metric === metric));
  }
  return result;
}

// The signed-in skater's own rating for each data point (null = not rated).
export async function fetchMySpotRatings(
  spotId: string | null,
  osmPlaceId: string | null,
  profileId: string
): Promise<Record<SpotMetric, number | null>> {
  const { data, error } = await supabase
    .from("spot_ratings")
    .select("metric, rating")
    .eq(spotId ? "spot_id" : "osm_place_id", spotId ?? osmPlaceId)
    .eq("profile_id", profileId);
  if (error) throw error;
  const rows = (data ?? []) as RatingRow[];
  const result = {} as Record<SpotMetric, number | null>;
  for (const metric of SPOT_METRICS) {
    result[metric] = rows.find((r) => r.metric === metric)?.rating ?? null;
  }
  return result;
}
