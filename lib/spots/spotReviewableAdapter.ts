import { toggleSpotFavorite, toggleSpotVote } from "@/lib/spots/mutations";
import {
  createSpotReview,
  deleteSpotReview,
  reportSpotReview,
  toggleSpotReviewVote,
} from "@/lib/spots/reviewMutations";
import {
  fetchSpotAverageRating,
  fetchSpotReviews,
  getSpotReviewReportStatuses,
  getSpotReviewVoteStatuses,
} from "@/lib/spots/reviewQueries";
import { getSpotFavoriteStatus, getSpotVoteCount, getUserVoteStatus } from "@/lib/spots/queries";
import { SpotReview, SpotReviewWithProfile } from "@/lib/spots/types";
import { ReviewableEntityAdapter } from "@/lib/shared/useReviewableEntity";

export const spotReviewableAdapter: ReviewableEntityAdapter<SpotReview, SpotReviewWithProfile> = {
  fetchReviews: fetchSpotReviews,
  fetchAverageRating: fetchSpotAverageRating,
  getFavoriteStatus: getSpotFavoriteStatus,
  toggleFavorite: toggleSpotFavorite,
  getVoteStatus: getUserVoteStatus,
  getVoteCount: getSpotVoteCount,
  toggleVote: toggleSpotVote,
  toggleReviewVote: toggleSpotReviewVote,
  getReviewVoteStatuses: getSpotReviewVoteStatuses,
  getReportStatuses: getSpotReviewReportStatuses,
  createReview: (spotId, osmPlaceId, payload, userId) =>
    createSpotReview({ spot_id: spotId, osm_place_id: osmPlaceId, ...payload }, userId),
  report: reportSpotReview,
  deleteReview: deleteSpotReview,
};
