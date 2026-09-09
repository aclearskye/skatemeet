import { toggleStoreFavorite, toggleStoreVote } from "@/lib/stores/mutations";
import {
  createStoreReview,
  deleteStoreReview,
  reportStoreReview,
  toggleStoreReviewVote,
} from "@/lib/stores/reviewMutations";
import {
  fetchStoreAverageRating,
  fetchStoreReviews,
  getStoreReviewReportStatuses,
  getStoreReviewVoteStatuses,
} from "@/lib/stores/reviewQueries";
import { getStoreFavoriteStatus, getStoreVoteCount, getStoreVoteStatus } from "@/lib/stores/queries";
import { StoreReview, StoreReviewWithProfile } from "@/lib/stores/types";
import { ReviewableEntityAdapter } from "@/lib/shared/useReviewableEntity";

export const storeReviewableAdapter: ReviewableEntityAdapter<StoreReview, StoreReviewWithProfile> = {
  fetchReviews: fetchStoreReviews,
  fetchAverageRating: fetchStoreAverageRating,
  getFavoriteStatus: getStoreFavoriteStatus,
  toggleFavorite: toggleStoreFavorite,
  getVoteStatus: getStoreVoteStatus,
  getVoteCount: getStoreVoteCount,
  toggleVote: toggleStoreVote,
  toggleReviewVote: toggleStoreReviewVote,
  getReviewVoteStatuses: getStoreReviewVoteStatuses,
  getReportStatuses: getStoreReviewReportStatuses,
  createReview: (storeId, osmPlaceId, payload, userId) =>
    createStoreReview({ store_id: storeId, osm_place_id: osmPlaceId, ...payload }, userId),
  report: reportStoreReview,
  deleteReview: deleteStoreReview,
};
