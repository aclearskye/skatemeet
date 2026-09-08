import { BoundingBox } from "@/lib/spots/types";

export const queryKeys = {
  spotDetail: (spotId: string | null, osmPlaceId: string | null) =>
    ["spot", spotId, osmPlaceId] as const,
  storeDetail: (storeId: string | null, osmPlaceId: string | null) =>
    ["store", storeId, osmPlaceId] as const,
  spotCards: (spotId: string | null, osmPlaceId: string | null) =>
    ["spot", spotId, osmPlaceId, "cards"] as const,
  storeCards: (storeId: string | null, osmPlaceId: string | null) =>
    ["store", storeId, osmPlaceId, "cards"] as const,
  spotPhotos: (spotId: string | null, osmPlaceId: string | null) =>
    ["spot", spotId, osmPlaceId, "photos"] as const,
  storePhotos: (storeId: string | null, osmPlaceId: string | null) =>
    ["store", storeId, osmPlaceId, "photos"] as const,
  mapOsmMarkersBase: ["map", "osmMarkers"] as const,
  mapOsmMarkers: (bbox: BoundingBox | null) =>
    ["map", "osmMarkers", bbox] as const,
  mapUserMarkersBase: ["map", "userMarkers"] as const,
  mapUserMarkers: (bbox: BoundingBox | null) =>
    ["map", "userMarkers", bbox] as const,
  profileStats: (profileId: string) =>
    ["profile", profileId, "stats"] as const,
  profileClips: (profileId: string) =>
    ["profile", profileId, "clips"] as const,
};
