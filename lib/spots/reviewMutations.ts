import { supabase } from "@/lib/supabaseClient";
import { toggleVoteRow, getVoteCount } from "@/lib/shared/votes";
import { ReviewReportReason } from "@/lib/shared/types";
import type { CreateSpotReviewPayload, SpotReview } from "./types";

export async function createSpotReview(
  payload: CreateSpotReviewPayload,
  userId: string
): Promise<SpotReview> {
  const { data, error } = await supabase
    .from("spot_reviews")
    .insert({ ...payload, profile_id: userId })
    .select()
    .single();
  if (error) throw error;
  return data as SpotReview;
}

export async function toggleSpotReviewVote(
  reviewId: string,
  userId: string
): Promise<{ upvote_count: number; user_has_voted: boolean }> {
  const user_has_voted = await toggleVoteRow("spot_review_votes", { review_id: reviewId }, userId);
  const upvote_count = await getVoteCount("spot_reviews", "review_id", reviewId);
  return { upvote_count, user_has_voted };
}

export async function reportSpotReview(reviewId: string, reason: ReviewReportReason): Promise<void> {
  const { error } = await supabase.rpc("report_spot_review", {
    p_review_id: reviewId,
    p_reason: reason,
  });
  if (error) throw error;
}

export async function deleteSpotReview(reviewId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from("spot_reviews")
    .delete()
    .eq("review_id", reviewId)
    .eq("profile_id", userId);
  if (error) throw error;
}
