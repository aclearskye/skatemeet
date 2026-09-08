import { supabase } from "@/lib/supabaseClient";
import { toggleVoteRow, getVoteCount } from "@/lib/shared/votes";
import { getStoreVoteCount } from "./queries";
import type { CreateStorePayload, CreateStoreCardPayload, StoreCard, UserStore } from "./types";

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
  localUri: string,
  mimeType?: string
): Promise<string> {
  const { uploadFile } = await import("@/lib/storage");
  return uploadFile(userId, localUri, "store-images", mimeType);
}

export async function linkStorePhoto(
  target: { storeId: string } | { osmPlaceId: string },
  mediaUrl: string
): Promise<void> {
  const { error } = await supabase.rpc("add_store_photo", {
    p_store_id: "storeId" in target ? target.storeId : null,
    p_osm_place_id: "osmPlaceId" in target ? target.osmPlaceId : null,
    p_media_url: mediaUrl,
  });
  if (error) throw error;
}

export async function addStorePhoto(
  target: { storeId: string } | { osmPlaceId: string },
  localUri: string,
  mimeType: string,
  userId: string
): Promise<string> {
  const mediaUrl = await uploadStorePhoto(userId, localUri, mimeType);
  await linkStorePhoto(target, mediaUrl);
  return mediaUrl;
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

export async function toggleStoreCardVote(
  cardId: string,
  userId: string
): Promise<{ upvote_count: number; user_has_voted: boolean }> {
  const user_has_voted = await toggleVoteRow("store_card_votes", { card_id: cardId }, userId);
  const upvote_count = await getVoteCount("store_cards", "card_id", cardId);
  return { upvote_count, user_has_voted };
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
