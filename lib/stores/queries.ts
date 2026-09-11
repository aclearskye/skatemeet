import { supabase } from "@/lib/supabaseClient";
import { BoundingBox, OsmStore } from "@/lib/spots/types";
import { getVoteStatus, getVoteCount } from "@/lib/shared/votes";
import { BOUNDS_ROW_LIMIT } from "@/utils/constants";
import type { UserStore } from "./types";

const OSM_STORE_COLUMNS =
  "place_id, name, address, phone, website, opening_hours, latitude, longitude, upvote_count, cover_photo_url, description, osm_image_url";

type OsmStoreRow = {
  place_id: string;
  name: string;
  address: string;
  phone: string | null;
  website: string | null;
  opening_hours: string | null;
  latitude: number;
  longitude: number;
  upvote_count: number;
  cover_photo_url: string | null;
  description: string | null;
  osm_image_url: string | null;
};

function toOsmStore(row: OsmStoreRow): OsmStore {
  return {
    place_id: row.place_id,
    name: row.name,
    address: row.address,
    phone: row.phone,
    website: row.website,
    opening_hours: row.opening_hours,
    coordinates: { lat: row.latitude, lng: row.longitude },
    upvote_count: row.upvote_count,
    cover_photo_url: row.cover_photo_url,
    description: row.description,
    osm_image_url: row.osm_image_url,
  };
}

export async function fetchOsmStoresInBounds(bbox: BoundingBox): Promise<OsmStore[]> {
  const { data, error } = await supabase
    .from("osm_stores")
    .select(OSM_STORE_COLUMNS)
    .gte("latitude", bbox.minLat)
    .lte("latitude", bbox.maxLat)
    .gte("longitude", bbox.minLng)
    .lte("longitude", bbox.maxLng)
    .limit(BOUNDS_ROW_LIMIT);
  if (error) throw error;
  return (data as OsmStoreRow[]).map(toOsmStore);
}

export async function searchOsmStoresByName(
  query: string,
  offset: number,
  limit: number
): Promise<OsmStore[]> {
  const { data, error } = await supabase
    .from("osm_stores")
    .select(OSM_STORE_COLUMNS)
    .ilike("name", `%${query}%`)
    .order("upvote_count", { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw error;
  return (data as OsmStoreRow[]).map(toOsmStore);
}

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

export async function searchUserStoresByName(
  query: string,
  offset: number,
  limit: number
): Promise<UserStore[]> {
  const { data, error } = await supabase
    .from("user_stores")
    .select("*")
    .ilike("name", `%${query}%`)
    .order("upvote_count", { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw error;
  return (data ?? []) as UserStore[];
}

export async function fetchUserStoresByIds(storeIds: string[]): Promise<UserStore[]> {
  if (storeIds.length === 0) return [];
  const { data, error } = await supabase.from("user_stores").select("*").in("store_id", storeIds);
  if (error) throw error;
  return (data ?? []) as UserStore[];
}

export async function fetchOsmStoresByIds(placeIds: string[]): Promise<OsmStore[]> {
  if (placeIds.length === 0) return [];
  const { data, error } = await supabase
    .from("osm_stores")
    .select(OSM_STORE_COLUMNS)
    .in("place_id", placeIds);
  if (error) throw error;
  return (data as OsmStoreRow[]).map(toOsmStore);
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
