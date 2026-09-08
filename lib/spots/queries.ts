import { supabase } from "@/lib/supabaseClient";
import { computeAverageRating } from "@/lib/shared/ratings";
import { getVoteStatus, getVoteCount } from "@/lib/shared/votes";
import { BOUNDS_ROW_LIMIT } from "@/utils/constants";
import type {
  BoundingBox,
  OsmSpot,
  SkateSpot,
  SpotCardWithProfile,
} from "./types";

export async function fetchOsmSpotsInBounds(bbox: BoundingBox): Promise<OsmSpot[]> {
  const { data, error } = await supabase
    .from("osm_spots")
    .select("place_id, name, address, spot_type, latitude, longitude, upvote_count, cover_photo_url")
    .gte("latitude", bbox.minLat)
    .lte("latitude", bbox.maxLat)
    .gte("longitude", bbox.minLng)
    .lte("longitude", bbox.maxLng)
    .limit(BOUNDS_ROW_LIMIT);
  if (error) throw error;
  type Row = {
    place_id: string;
    name: string;
    address: string;
    spot_type: OsmSpot["spot_type"];
    latitude: number;
    longitude: number;
    upvote_count: number;
    cover_photo_url: string | null;
  };
  return (data as Row[]).map((row) => ({
    place_id: row.place_id,
    name: row.name,
    address: row.address,
    spot_type: row.spot_type,
    coordinates: { lat: row.latitude, lng: row.longitude },
    upvote_count: row.upvote_count,
    cover_photo_url: row.cover_photo_url,
  }));
}

export async function fetchSpotsInBounds(bbox: BoundingBox): Promise<SkateSpot[]> {
  const { data, error } = await supabase
    .from("user_spots")
    .select("*")
    .gte("latitude", bbox.minLat)
    .lte("latitude", bbox.maxLat)
    .gte("longitude", bbox.minLng)
    .lte("longitude", bbox.maxLng)
    .limit(BOUNDS_ROW_LIMIT);
  if (error) throw error;
  return data as SkateSpot[];
}

export async function fetchSpotCards(
  spotId: string | null,
  osmPlaceId: string | null
): Promise<SpotCardWithProfile[]> {
  const { data, error } = await supabase
    .from("spot_cards")
    .select("*, profiles(username, display_name)")
    .eq(spotId ? "spot_id" : "osm_place_id", spotId ?? osmPlaceId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as SpotCardWithProfile[];
}

export async function fetchSpotAverageRating(
  spotId: string | null,
  osmPlaceId: string | null
): Promise<{ average: number | null; count: number }> {
  const { data, error } = await supabase
    .from("spot_cards")
    .select("rating")
    .eq(spotId ? "spot_id" : "osm_place_id", spotId ?? osmPlaceId)
    .eq("is_verified", true)
    .not("rating", "is", null);
  if (error) throw error;
  return computeAverageRating((data ?? []) as { rating: number }[]);
}

export async function getUserVoteStatus(
  spotId: string | null,
  osmPlaceId: string | null,
  userId: string
): Promise<boolean> {
  const filter: Record<string, string> = spotId
    ? { spot_id: spotId }
    : { osm_place_id: osmPlaceId! };
  return getVoteStatus("spot_votes", filter, userId);
}

export async function getSpotVoteCount(
  spotId: string | null,
  osmPlaceId: string | null
): Promise<number> {
  const table = spotId ? "user_spots" : "osm_spots";
  const col = spotId ? "spot_id" : "place_id";
  const val = spotId ?? osmPlaceId!;
  return getVoteCount(table, col, val);
}

export async function getSpotFavoriteStatus(
  spotId: string | null,
  osmPlaceId: string | null,
  userId: string
): Promise<boolean> {
  const filter = spotId ? { spot_id: spotId } : { osm_place_id: osmPlaceId };
  const { count, error } = await supabase
    .from("spot_favorites")
    .select("*", { count: "exact", head: true })
    .eq("profile_id", userId)
    .match(filter);
  if (error) throw error;
  return (count ?? 0) > 0;
}

export async function getSpotCardVoteStatuses(
  cardIds: string[],
  userId: string
): Promise<Record<string, boolean>> {
  const { data, error } = await supabase
    .from("spot_card_votes")
    .select("card_id")
    .eq("profile_id", userId)
    .in("card_id", cardIds);
  if (error) throw error;
  const result: Record<string, boolean> = {};
  for (const row of data ?? []) {
    result[(row as { card_id: string }).card_id] = true;
  }
  return result;
}
