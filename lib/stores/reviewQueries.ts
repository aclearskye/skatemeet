import { supabase } from "@/lib/supabaseClient";
import { computeAverageRating } from "@/lib/shared/ratings";
import type { StoreReviewWithProfile } from "./types";

export async function fetchStoreReviews(
  storeId: string | null,
  osmPlaceId: string | null
): Promise<StoreReviewWithProfile[]> {
  const col = storeId ? "store_id" : "osm_place_id";
  const val = storeId ?? osmPlaceId;
  const { data, error } = await supabase
    .from("store_reviews")
    .select("*, profiles(username, display_name)")
    .eq(col, val)
    .order("upvote_count", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as StoreReviewWithProfile[];
}

export async function fetchStoreAverageRating(
  storeId: string | null,
  osmPlaceId: string | null
): Promise<{ average: number | null; count: number }> {
  const col = storeId ? "store_id" : "osm_place_id";
  const val = storeId ?? osmPlaceId;
  const { data, error } = await supabase
    .from("store_reviews")
    .select("rating")
    .eq(col, val)
    .eq("is_verified", true)
    .not("rating", "is", null);
  if (error) throw error;
  return computeAverageRating((data ?? []) as { rating: number }[]);
}

export async function getStoreReviewVoteStatuses(
  reviewIds: string[],
  userId: string
): Promise<Record<string, boolean>> {
  if (reviewIds.length === 0) return {};
  const { data, error } = await supabase
    .from("store_review_votes")
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

export async function getStoreReviewReportStatuses(
  reviewIds: string[],
  userId: string
): Promise<Record<string, boolean>> {
  if (reviewIds.length === 0) return {};
  const { data, error } = await supabase
    .from("store_review_reports")
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
