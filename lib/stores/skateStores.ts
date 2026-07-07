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

import { supabase } from "@/lib/supabaseClient";
import { BoundingBox } from "@/lib/spots/skateSpots";
import { computeAverageRating } from "@/lib/shared/ratings";
import { toggleVoteRow, getVoteStatus, getVoteCount } from "@/lib/shared/votes";
import { BOUNDS_ROW_LIMIT } from "@/utils/constants";

export async function fetchUserStoresInBounds(bbox: BoundingBox): Promise<UserStore[]> {
  const { data, error } = await supabase
    .from("user_stores")
    .select("*")
    .gte("latitude", bbox.minLat)
    .lte("latitude", bbox.maxLat)
    .gte("longitude", bbox.minLng)
    .lte("longitude", bbox.maxLng)
    .limit(BOUNDS_ROW_LIMIT);
  if (error) throw error;
  return (data ?? []) as UserStore[];
}

export async function createStore(
  payload: CreateStorePayload,
  userId: string
): Promise<UserStore> {
  const { data, error } = await supabase
    .from("user_stores")
    .insert({ ...payload, profile_id: userId })
    .select()
    .single();
  if (error) throw error;
  return data as UserStore;
}

export async function deleteStore(storeId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from("user_stores")
    .delete()
    .eq("store_id", storeId)
    .eq("profile_id", userId);
  if (error) throw error;
}

export async function uploadStorePhoto(
  userId: string,
  localUri: string
): Promise<string> {
  const { uploadFile } = await import("@/lib/storage");
  return uploadFile(userId, localUri, "store-images");
}

// ── Store Cards ───────────────────────────────────────────────────────────────

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

export async function fetchStoreCards(
  storeId: string | null,
  osmPlaceId: string | null
): Promise<StoreCardWithProfile[]> {
  const col = storeId ? "store_id" : "osm_place_id";
  const val = storeId ?? osmPlaceId;
  const { data, error } = await supabase
    .from("store_cards")
    .select("*, profiles(username, display_name)")
    .eq(col, val)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as StoreCardWithProfile[];
}

export async function fetchStoreAverageRating(
  storeId: string | null,
  osmPlaceId: string | null
): Promise<{ average: number | null; count: number }> {
  const col = storeId ? "store_id" : "osm_place_id";
  const val = storeId ?? osmPlaceId;
  const { data, error } = await supabase
    .from("store_cards")
    .select("rating")
    .eq(col, val)
    .eq("is_verified", true)
    .not("rating", "is", null);
  if (error) throw error;
  return computeAverageRating((data ?? []) as { rating: number }[]);
}

export async function createStoreCard(
  payload: CreateStoreCardPayload,
  userId: string
): Promise<StoreCard> {
  const { data, error } = await supabase
    .from("store_cards")
    .insert({ ...payload, profile_id: userId })
    .select()
    .single();
  if (error) throw error;
  return data as StoreCard;
}

// ── Store Favorites ───────────────────────────────────────────────────────────

export async function getStoreFavoriteStatus(
  storeId: string | null,
  osmPlaceId: string | null,
  userId: string
): Promise<boolean> {
  const col = storeId ? "store_id" : "osm_place_id";
  const val = storeId ?? osmPlaceId;
  const { count, error } = await supabase
    .from("store_favorites")
    .select("*", { count: "exact", head: true })
    .eq("profile_id", userId)
    .eq(col, val);
  if (error) throw error;
  return (count ?? 0) > 0;
}

export async function toggleStoreFavorite(
  storeId: string | null,
  osmPlaceId: string | null,
  userId: string
): Promise<boolean> {
  const row = storeId
    ? { profile_id: userId, store_id: storeId }
    : { profile_id: userId, osm_place_id: osmPlaceId };

  const { error: insertError } = await supabase
    .from("store_favorites")
    .insert(row);

  if (!insertError) return true;

  if (insertError.code === "23505") {
    const col = storeId ? "store_id" : "osm_place_id";
    const val = storeId ?? osmPlaceId;
    const { error: deleteError } = await supabase
      .from("store_favorites")
      .delete()
      .eq("profile_id", userId)
      .eq(col, val);
    if (deleteError) throw deleteError;
    return false;
  }

  throw insertError;
}

// ── Store Card Votes ──────────────────────────────────────────────────────────

export async function toggleStoreCardVote(
  cardId: string,
  userId: string
): Promise<{ upvote_count: number; user_has_voted: boolean }> {
  const user_has_voted = await toggleVoteRow("store_card_votes", { card_id: cardId }, userId);
  const upvote_count = await getVoteCount("store_cards", "card_id", cardId);
  return { upvote_count, user_has_voted };
}

// ── Store Votes ───────────────────────────────────────────────────────────────

export async function getStoreVoteCount(
  storeId: string | null,
  osmPlaceId: string | null
): Promise<number> {
  const table = storeId ? "user_stores" : "osm_stores";
  const col = storeId ? "store_id" : "place_id";
  const val = storeId ?? osmPlaceId!;
  return getVoteCount(table, col, val);
}

export async function getStoreVoteStatus(
  storeId: string | null,
  osmPlaceId: string | null,
  userId: string
): Promise<boolean> {
  const filter: Record<string, string> = storeId ? { store_id: storeId } : { osm_place_id: osmPlaceId! };
  return getVoteStatus("store_votes", filter, userId);
}

export async function toggleStoreVote(
  storeId: string | null,
  osmPlaceId: string | null,
  userId: string
): Promise<{ upvote_count: number; user_has_voted: boolean }> {
  const filter: Record<string, string> = storeId ? { store_id: storeId } : { osm_place_id: osmPlaceId! };
  const user_has_voted = await toggleVoteRow("store_votes", filter, userId);
  const upvote_count = await getStoreVoteCount(storeId, osmPlaceId);
  return { upvote_count, user_has_voted };
}

export async function getStoreCardVoteStatuses(
  cardIds: string[],
  userId: string
): Promise<Record<string, boolean>> {
  if (cardIds.length === 0) return {};
  const { data, error } = await supabase
    .from("store_card_votes")
    .select("card_id")
    .eq("profile_id", userId)
    .in("card_id", cardIds);
  if (error) throw error;
  const result: Record<string, boolean> = {};
  for (const row of (data ?? []) as { card_id: string }[]) {
    result[row.card_id] = true;
  }
  return result;
}
