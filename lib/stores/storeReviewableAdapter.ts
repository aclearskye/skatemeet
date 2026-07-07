import {
  createStoreCard,
  fetchStoreAverageRating,
  fetchStoreCards,
  getStoreCardVoteStatuses,
  getStoreFavoriteStatus,
  getStoreVoteCount,
  getStoreVoteStatus,
  StoreCard,
  StoreCardWithProfile,
  toggleStoreCardVote,
  toggleStoreFavorite,
  toggleStoreVote,
} from "@/lib/stores/skateStores";
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
