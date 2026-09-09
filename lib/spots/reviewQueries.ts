import { supabase } from "@/lib/supabaseClient";
import { computeAverageRating } from "@/lib/shared/ratings";
import type { SpotReviewWithProfile } from "./types";

export async function fetchSpotReviews(
  spotId: string | null,
  osmPlaceId: string | null
): Promise<SpotReviewWithProfile[]> {
  const { data, error } = await supabase
    .from("spot_reviews")
    .select("*, profiles(username, display_name)")
    .eq(spotId ? "spot_id" : "osm_place_id", spotId ?? osmPlaceId)
    .order("upvote_count", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as SpotReviewWithProfile[];
}

export async function fetchSpotAverageRating(
  spotId: string | null,
  osmPlaceId: string | null
): Promise<{ average: number | null; count: number }> {
  const { data, error } = await supabase
    .from("spot_reviews")
    .select("rating")
    .eq(spotId ? "spot_id" : "osm_place_id", spotId ?? osmPlaceId)
    .eq("is_verified", true)
    .not("rating", "is", null);
  if (error) throw error;
  return computeAverageRating((data ?? []) as { rating: number }[]);
}

export async function getSpotReviewVoteStatuses(
  reviewIds: string[],
  userId: string
): Promise<Record<string, boolean>> {
  if (reviewIds.length === 0) return {};
  const { data, error } = await supabase
    .from("spot_review_votes")
    .select("review_id")
    .eq("profile_id", userId)
    .in("review_id", reviewIds);
  if (error) throw error;
  const result: Record<string, boolean> = {};
  for (const row of (data ?? []) as { review_id: string }[]) {
    result[row.review_id] = true;
  }
  return result;
}

export async function getSpotReviewReportStatuses(
  reviewIds: string[],
  userId: string
): Promise<Record<string, boolean>> {
  if (reviewIds.length === 0) return {};
  const { data, error } = await supabase
    .from("spot_review_reports")
    .select("review_id")
    .eq("profile_id", userId)
    .in("review_id", reviewIds);
  if (error) throw error;
  const result: Record<string, boolean> = {};
  for (const row of (data ?? []) as { review_id: string }[]) {
    result[row.review_id] = true;
  }
  return result;
}
