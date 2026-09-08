import { EntityPhoto } from "@/lib/shared/types";

export type SkateStore = {
  place_id: string;
  name: string;
  address: string;
  rating: number | null;
  coordinates: { lat: number; lng: number };
};

export type UserStore = {
  store_id: string;
  profile_id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  phone: string | null;
  website: string | null;
  opening_hours: string | null;
  description: string | null;
  photo_url: string | null;
  is_verified: boolean;
  upvote_count: number;
  created_at: string;
  updated_at: string;
};

export type CreateStorePayload = {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  phone?: string;
  website?: string;
  opening_hours?: string;
  description?: string;
  photo_url?: string;
};

export type StoreCard = {
  card_id: string;
  profile_id: string;
  store_id: string | null;
  osm_place_id: string | null;
  heading: string;
  rating: number | null;
  comment: string;
  upvote_count: number;
  is_verified: boolean;
  created_at: string;
};

export type StoreCardWithProfile = StoreCard & {
  profiles: { username: string; display_name: string | null };
};

export type CreateStoreCardPayload = {
  store_id: string | null;
  osm_place_id: string | null;
  heading: string;
  rating: number | null;
  comment: string;
};

export type StorePhoto = EntityPhoto & {
  store_id: string | null;
  osm_place_id: string | null;
};
