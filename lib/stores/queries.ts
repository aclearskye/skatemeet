import { supabase } from "@/lib/supabaseClient";
import { BoundingBox } from "@/lib/spots/types";
import { computeAverageRating } from "@/lib/shared/ratings";
import { getVoteStatus, getVoteCount } from "@/lib/shared/votes";
import { BOUNDS_ROW_LIMIT } from "@/utils/constants";
import type { StoreCardWithProfile, UserStore } from "./types";

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
