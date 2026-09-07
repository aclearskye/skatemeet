import {
  createStoreCard,
  toggleStoreCardVote,
  toggleStoreFavorite,
  toggleStoreVote,
} from "@/lib/stores/mutations";
import {
  fetchStoreAverageRating,
  fetchStoreCards,
  getStoreCardVoteStatuses,
  getStoreFavoriteStatus,
  getStoreVoteCount,
  getStoreVoteStatus,
} from "@/lib/stores/queries";
import { StoreCard, StoreCardWithProfile } from "@/lib/stores/types";
import { ReviewableEntityAdapter } from "@/lib/shared/useReviewableEntity";

export const storeReviewableAdapter: ReviewableEntityAdapter<StoreCard, StoreCardWithProfile> = {
  fetchCards: fetchStoreCards,
  fetchAverageRating: fetchStoreAverageRating,
  getFavoriteStatus: getStoreFavoriteStatus,
  toggleFavorite: toggleStoreFavorite,
  getVoteStatus: getStoreVoteStatus,
  getVoteCount: getStoreVoteCount,
  toggleVote: toggleStoreVote,
  toggleCardVote: toggleStoreCardVote,
  getCardVoteStatuses: getStoreCardVoteStatuses,
  createCard: (storeId, osmPlaceId, payload, userId) =>
    createStoreCard({ store_id: storeId, osm_place_id: osmPlaceId, ...payload }, userId),
};
