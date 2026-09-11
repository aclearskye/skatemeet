import { supabase } from "@/lib/supabaseClient";
import { toggleVoteRow, getVoteCount } from "@/lib/shared/votes";
import { toCheckInRequiredError } from "@/lib/shared/checkInRequiredError";
import { ReviewReportReason } from "@/lib/shared/types";
import type { CreateStoreReviewPayload, StoreReview } from "./types";

export async function createStoreReview(payload: CreateStoreReviewPayload): Promise<StoreReview> {
  const { data, error } = await supabase
    .rpc("create_store_review", {
      p_store_id: payload.store_id,
      p_osm_place_id: payload.osm_place_id,
      p_heading: payload.heading,
      p_rating: payload.rating,
      p_comment: payload.comment,
    })
    .single();
  if (error) throw toCheckInRequiredError(error, "leave a review");
  return data as StoreReview;
}

export async function toggleStoreReviewVote(
  reviewId: string,
  userId: string
): Promise<{ upvote_count: number; user_has_voted: boolean }> {
  const user_has_voted = await toggleVoteRow("store_review_votes", { review_id: reviewId }, userId);
  const upvote_count = await getVoteCount("store_reviews", "review_id", reviewId);
  return { upvote_count, user_has_voted };
}

export async function reportStoreReview(reviewId: string, reason: ReviewReportReason): Promise<void> {
  const { error } = await supabase.rpc("report_store_review", {
    p_review_id: reviewId,
    p_reason: reason,
  });
  if (error) throw error;
}

export async function deleteStoreReview(reviewId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from("store_reviews")
    .delete()
    .eq("review_id", reviewId)
    .eq("profile_id", userId);
  if (error) throw error;
}
