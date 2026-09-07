import {
  createSpotCard,
  toggleSpotCardVote,
  toggleSpotFavorite,
  toggleSpotVote,
} from "@/lib/spots/mutations";
import {
  fetchSpotAverageRating,
  fetchSpotCards,
  getSpotCardVoteStatuses,
  getSpotFavoriteStatus,
  getSpotVoteCount,
  getUserVoteStatus,
} from "@/lib/spots/queries";
import { SpotCard, SpotCardWithProfile } from "@/lib/spots/types";
import { ReviewableEntityAdapter } from "@/lib/shared/useReviewableEntity";

export const spotReviewableAdapter: ReviewableEntityAdapter<SpotCard, SpotCardWithProfile> = {
  fetchCards: fetchSpotCards,
  fetchAverageRating: fetchSpotAverageRating,
  getFavoriteStatus: getSpotFavoriteStatus,
  toggleFavorite: toggleSpotFavorite,
  getVoteStatus: getUserVoteStatus,
  getVoteCount: getSpotVoteCount,
  toggleVote: toggleSpotVote,
  toggleCardVote: toggleSpotCardVote,
  getCardVoteStatuses: getSpotCardVoteStatuses,
  createCard: (spotId, osmPlaceId, payload, userId) =>
    createSpotCard({ spot_id: spotId, osm_place_id: osmPlaceId, ...payload }, userId),
};
