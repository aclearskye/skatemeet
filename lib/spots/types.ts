import { EntityMetadataBase, EntityPhoto } from "@/lib/shared/types";

export type SpotType = "street" | "diy" | "park" | "indoor";

export type SkateSpot = {
  spot_id: string;
  created_by: string;
  name: string;
  type: SpotType;
  description: string | null;
  latitude: number;
  longitude: number;
  photo_url: string | null;
  difficulty: number | null;
  is_verified: boolean;
  upvote_count: number;
  created_at: string;
  updated_at: string;
};

export type OsmSpot = {
  place_id: string;
  name: string;
  address: string;
  spot_type: "park" | "diy" | "street";
  coordinates: { lat: number; lng: number };
  upvote_count: number;
  cover_photo_url: string | null;
};

export type OsmStore = {
  place_id: string;
  name: string;
  address: string;
  phone: string | null;
  website: string | null;
  opening_hours: string | null;
  coordinates: { lat: number; lng: number };
  upvote_count: number;
  cover_photo_url: string | null;
};

export type CreateSpotPayload = {
  name: string;
  type: SpotType;
  description?: string;
  latitude: number;
  longitude: number;
  photo_url?: string;
  difficulty?: number;
};

export type BoundingBox = {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
};

export type SpotReview = {
  review_id: string;
  profile_id: string;
  spot_id: string | null;
  osm_place_id: string | null;
  heading: string;
  rating: number | null;
  comment: string;
  upvote_count: number;
  report_count: number;
  is_verified: boolean;
  created_at: string;
};

export type SpotReviewWithProfile = SpotReview & {
  profiles: { username: string; display_name: string | null };
};

export type CreateSpotReviewPayload = {
  spot_id: string | null;
  osm_place_id: string | null;
  heading: string;
  rating: number | null;
  comment: string;
};

export type SpotMetadata = EntityMetadataBase & { spot_id: string | null };

export type SpotPhoto = EntityPhoto & {
  spot_id: string | null;
  osm_place_id: string | null;
};

export function regionToBoundingBox(
  latitude: number,
  longitude: number,
  latitudeDelta: number,
  longitudeDelta: number
): BoundingBox {
  const pad = 0.1; // 10% padding so markers near the edge don't flicker
  return {
    minLat: latitude - (latitudeDelta / 2) * (1 + pad),
    maxLat: latitude + (latitudeDelta / 2) * (1 + pad),
    minLng: longitude - (longitudeDelta / 2) * (1 + pad),
    maxLng: longitude + (longitudeDelta / 2) * (1 + pad),
  };
}
