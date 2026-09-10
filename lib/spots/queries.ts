import { supabase } from "@/lib/supabaseClient";
import { getVoteStatus, getVoteCount } from "@/lib/shared/votes";
import { BOUNDS_ROW_LIMIT } from "@/utils/constants";
import type { BoundingBox, OsmSpot, SkateSpot } from "./types";

export async function fetchOsmSpotsInBounds(bbox: BoundingBox): Promise<OsmSpot[]> {
  const { data, error } = await supabase
    .from("osm_spots")
    .select(
      "place_id, name, address, spot_type, latitude, longitude, upvote_count, cover_photo_url, description, osm_image_url"
    )
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
    description: string | null;
    osm_image_url: string | null;
  };
  return (data as Row[]).map((row) => ({
    place_id: row.place_id,
    name: row.name,
    address: row.address,
    spot_type: row.spot_type,
    coordinates: { lat: row.latitude, lng: row.longitude },
    upvote_count: row.upvote_count,
    cover_photo_url: row.cover_photo_url,
    description: row.description,
    osm_image_url: row.osm_image_url,
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

export async function fetchUserSpotsByIds(spotIds: string[]): Promise<SkateSpot[]> {
  if (spotIds.length === 0) return [];
  const { data, error } = await supabase.from("user_spots").select("*").in("spot_id", spotIds);
  if (error) throw error;
  return data as SkateSpot[];
}

export async function fetchOsmSpotsByIds(placeIds: string[]): Promise<OsmSpot[]> {
  if (placeIds.length === 0) return [];
  const { data, error } = await supabase
    .from("osm_spots")
    .select(
      "place_id, name, address, spot_type, latitude, longitude, upvote_count, cover_photo_url, description, osm_image_url"
    )
    .in("place_id", placeIds);
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
    description: string | null;
    osm_image_url: string | null;
  };
  return (data as Row[]).map((row) => ({
    place_id: row.place_id,
    name: row.name,
    address: row.address,
    spot_type: row.spot_type,
    coordinates: { lat: row.latitude, lng: row.longitude },
    upvote_count: row.upvote_count,
    cover_photo_url: row.cover_photo_url,
    description: row.description,
    osm_image_url: row.osm_image_url,
  }));
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
