export type SkateStore = {
  place_id: string;
  name: string;
  address: string;
  rating: number | null;
  coordinates: { lat: number; lng: number };
};

export type UserShop = {
  shop_id: string;
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

export type CreateShopPayload = {
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

export async function fetchUserShopsInBounds(bbox: BoundingBox): Promise<UserShop[]> {
  const { data, error } = await supabase
    .from("user_shops")
    .select("*")
    .gte("latitude", bbox.minLat)
    .lte("latitude", bbox.maxLat)
    .gte("longitude", bbox.minLng)
    .lte("longitude", bbox.maxLng)
    .limit(150);
  if (error) throw error;
  return (data ?? []) as UserShop[];
}

export async function createShop(
  payload: CreateShopPayload,
  userId: string
): Promise<UserShop> {
  const { data, error } = await supabase
    .from("user_shops")
    .insert({ ...payload, profile_id: userId })
    .select()
    .single();
  if (error) throw error;
  return data as UserShop;
}

export async function uploadShopPhoto(
  userId: string,
  localUri: string
): Promise<string> {
  const fileName = `${userId}/${Date.now()}.jpg`;
  const response = await fetch(localUri);
  const blob = await response.blob();
  const { error } = await supabase.storage
    .from("spot-images")
    .upload(fileName, blob, { contentType: "image/jpeg", upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from("spot-images").getPublicUrl(fileName);
  return data.publicUrl;
}

// ── Store Cards ───────────────────────────────────────────────────────────────

export type StoreCard = {
  card_id: string;
  profile_id: string;
  shop_id: string | null;
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
  shop_id: string | null;
  osm_place_id: string | null;
  heading: string;
  rating: number | null;
  comment: string;
};

export async function fetchStoreCards(
  shopId: string | null,
  osmPlaceId: string | null
): Promise<StoreCardWithProfile[]> {
  const col = shopId ? "shop_id" : "osm_place_id";
  const val = shopId ?? osmPlaceId;
  const { data, error } = await supabase
    .from("store_cards")
    .select("*, profiles(username, display_name)")
    .eq(col, val)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as StoreCardWithProfile[];
}

export async function fetchStoreAverageRating(
  shopId: string | null,
  osmPlaceId: string | null
): Promise<{ average: number | null; count: number }> {
  const col = shopId ? "shop_id" : "osm_place_id";
  const val = shopId ?? osmPlaceId;
  const { data, error } = await supabase
    .from("store_cards")
    .select("rating")
    .eq(col, val)
    .eq("is_verified", true)
    .not("rating", "is", null);
  if (error) throw error;
  const rows = (data ?? []) as { rating: number }[];
  if (rows.length === 0) return { average: null, count: 0 };
  const sum = rows.reduce((acc, r) => acc + r.rating, 0);
  return { average: Math.round((sum / rows.length) * 10) / 10, count: rows.length };
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

// ── Store Favourites ──────────────────────────────────────────────────────────

export async function getStoreFavouriteStatus(
  shopId: string | null,
  osmPlaceId: string | null,
  userId: string
): Promise<boolean> {
  const col = shopId ? "shop_id" : "osm_place_id";
  const val = shopId ?? osmPlaceId;
  const { count, error } = await supabase
    .from("store_favourites")
    .select("*", { count: "exact", head: true })
    .eq("profile_id", userId)
    .eq(col, val);
  if (error) throw error;
  return (count ?? 0) > 0;
}

export async function toggleStoreFavourite(
  shopId: string | null,
  osmPlaceId: string | null,
  userId: string
): Promise<boolean> {
  const row = shopId
    ? { profile_id: userId, shop_id: shopId }
    : { profile_id: userId, osm_place_id: osmPlaceId };

  const { error: insertError } = await supabase
    .from("store_favourites")
    .insert(row);

  if (!insertError) return true;

  if (insertError.code === "23505") {
    const col = shopId ? "shop_id" : "osm_place_id";
    const val = shopId ?? osmPlaceId;
    const { error: deleteError } = await supabase
      .from("store_favourites")
      .delete()
      .eq("profile_id", userId)
      .eq(col, val);
    if (deleteError) throw deleteError;
    return false;
  }

  throw insertError;
}

// ── Store Card Votes ──────────────────────────────────────────────────────────

export async function toggleCardVote(
  cardId: string,
  userId: string
): Promise<{ upvote_count: number; user_has_voted: boolean }> {
  const { error: insertError } = await supabase
    .from("store_card_votes")
    .insert({ card_id: cardId, profile_id: userId });

  let user_has_voted: boolean;

  if (!insertError) {
    user_has_voted = true;
  } else if (insertError.code === "23505") {
    const { error: deleteError } = await supabase
      .from("store_card_votes")
      .delete()
      .eq("card_id", cardId)
      .eq("profile_id", userId);
    if (deleteError) throw deleteError;
    user_has_voted = false;
  } else {
    throw insertError;
  }

  const { data, error: fetchError } = await supabase
    .from("store_cards")
    .select("upvote_count")
    .eq("card_id", cardId)
    .single();
  if (fetchError) throw fetchError;
  return { upvote_count: (data as { upvote_count: number }).upvote_count, user_has_voted };
}

// ── Store Votes ───────────────────────────────────────────────────────────────

export async function getStoreVoteCount(
  shopId: string | null,
  osmPlaceId: string | null
): Promise<number> {
  const table = shopId ? "user_shops" : "osm_shops";
  const col = shopId ? "shop_id" : "place_id";
  const val = shopId ?? osmPlaceId!;
  const { data, error } = await supabase
    .from(table)
    .select("upvote_count")
    .eq(col, val)
    .single();
  if (error) throw error;
  return (data as any).upvote_count as number;
}

export async function getStoreVoteStatus(
  shopId: string | null,
  osmPlaceId: string | null,
  userId: string
): Promise<boolean> {
  const base = supabase
    .from("store_votes")
    .select("*", { count: "exact", head: true })
    .eq("profile_id", userId);
  const { count, error } = shopId
    ? await base.eq("shop_id", shopId)
    : await base.eq("osm_place_id", osmPlaceId!);
  if (error) throw error;
  return (count ?? 0) > 0;
}

export async function toggleStoreVote(
  shopId: string | null,
  osmPlaceId: string | null,
  userId: string
): Promise<{ upvote_count: number; user_has_voted: boolean }> {
  const payload = shopId
    ? { shop_id: shopId, profile_id: userId }
    : { osm_place_id: osmPlaceId, profile_id: userId };

  const { error: insertError } = await supabase.from("store_votes").insert(payload);
  let userHasVoted = true;

  if (insertError) {
    if (insertError.code === "23505") {
      const base = supabase.from("store_votes").delete().eq("profile_id", userId);
      const { error: deleteError } = shopId
        ? await base.eq("shop_id", shopId)
        : await base.eq("osm_place_id", osmPlaceId!);
      if (deleteError) throw deleteError;
      userHasVoted = false;
    } else {
      throw insertError;
    }
  }

  const table = shopId ? "user_shops" : "osm_shops";
  const col = shopId ? "shop_id" : "place_id";
  const val = shopId ?? osmPlaceId!;
  const { data, error } = await supabase
    .from(table)
    .select("upvote_count")
    .eq(col, val)
    .single();
  if (error) throw error;
  return { upvote_count: (data as any).upvote_count, user_has_voted: userHasVoted };
}

export async function getCardVoteStatuses(
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
