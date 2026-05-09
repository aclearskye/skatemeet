import { supabase } from "@/lib/supabaseClient";

// ── Types ─────────────────────────────────────────────────────────────────────

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
};

export type OsmShop = {
  place_id: string;
  name: string;
  address: string;
  phone: string | null;
  website: string | null;
  opening_hours: string | null;
  coordinates: { lat: number; lng: number };
};

export type UserShop = {
  shop_id: string;
  profile_id: string;
  name: string;
  address: string;
  phone: string | null;
  website: string | null;
  opening_hours: string | null;
  description: string | null;
  photo_url: string | null;
  latitude: number;
  longitude: number;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
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

// ── Geo helper ────────────────────────────────────────────────────────────────

export function regionToBoundingBox(
  latitude: number,
  longitude: number,
  latitudeDelta: number,
  longitudeDelta: number
): BoundingBox {
  const pad = 0.1; // 10% padding so markers near the edge don't flicker
  return {
    minLat: latitude - latitudeDelta / 2 * (1 + pad),
    maxLat: latitude + latitudeDelta / 2 * (1 + pad),
    minLng: longitude - longitudeDelta / 2 * (1 + pad),
    maxLng: longitude + longitudeDelta / 2 * (1 + pad),
  };
}

// ── OSM spots ─────────────────────────────────────────────────────────────────

export async function fetchOsmSpotsInBounds(bbox: BoundingBox): Promise<OsmSpot[]> {
  const { data, error } = await supabase
    .from("osm_spots")
    .select("place_id, name, address, spot_type, latitude, longitude")
    .gte("latitude", bbox.minLat)
    .lte("latitude", bbox.maxLat)
    .gte("longitude", bbox.minLng)
    .lte("longitude", bbox.maxLng);
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    place_id: row.place_id,
    name: row.name,
    address: row.address,
    spot_type: row.spot_type as OsmSpot["spot_type"],
    coordinates: { lat: row.latitude, lng: row.longitude },
  }));
}

// ── OSM shops ─────────────────────────────────────────────────────────────────

export async function fetchOsmShopsInBounds(bbox: BoundingBox): Promise<OsmShop[]> {
  const { data, error } = await supabase
    .from("osm_shops")
    .select("place_id, name, address, phone, website, opening_hours, latitude, longitude")
    .gte("latitude", bbox.minLat)
    .lte("latitude", bbox.maxLat)
    .gte("longitude", bbox.minLng)
    .lte("longitude", bbox.maxLng);
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    place_id: row.place_id,
    name: row.name,
    address: row.address,
    phone: row.phone,
    website: row.website,
    opening_hours: row.opening_hours,
    coordinates: { lat: row.latitude, lng: row.longitude },
  }));
}

// ── User spots ────────────────────────────────────────────────────────────────

export async function fetchSpotsInBounds(bbox: BoundingBox): Promise<SkateSpot[]> {
  const { data, error } = await supabase
    .from("user_spots")
    .select("*")
    .gte("latitude", bbox.minLat)
    .lte("latitude", bbox.maxLat)
    .gte("longitude", bbox.minLng)
    .lte("longitude", bbox.maxLng);
  if (error) throw error;
  return data as SkateSpot[];
}

export async function createSpot(
  payload: CreateSpotPayload,
  userId: string
): Promise<SkateSpot> {
  const { data, error } = await supabase
    .from("user_spots")
    .insert({ ...payload, created_by: userId })
    .select()
    .single();
  if (error) throw error;
  return data as SkateSpot;
}

export async function uploadSpotPhoto(
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

// ── Voting ────────────────────────────────────────────────────────────────────

export async function toggleSpotVote(
  spotId: string,
  userId: string
): Promise<{ upvote_count: number; user_has_voted: boolean }> {
  // Try to insert; if unique violation (23505) the user already voted → delete instead
  const { error: insertError } = await supabase
    .from("spot_votes")
    .insert({ spot_id: spotId, profile_id: userId });

  let userHasVoted = true;

  if (insertError) {
    if (insertError.code === "23505") {
      const { error: deleteError } = await supabase
        .from("spot_votes")
        .delete()
        .eq("spot_id", spotId)
        .eq("profile_id", userId);
      if (deleteError) throw deleteError;
      userHasVoted = false;
    } else {
      throw insertError;
    }
  }

  // Trigger keeps upvote_count in sync; just read the updated value
  const { data, error: readError } = await supabase
    .from("user_spots")
    .select("upvote_count")
    .eq("spot_id", spotId)
    .single();
  if (readError) throw readError;

  return { upvote_count: (data as any).upvote_count, user_has_voted: userHasVoted };
}

export async function getUserVoteStatus(
  spotId: string,
  userId: string
): Promise<boolean> {
  const { count, error } = await supabase
    .from("spot_votes")
    .select("*", { count: "exact", head: true })
    .eq("spot_id", spotId)
    .eq("profile_id", userId);
  if (error) throw error;
  return (count ?? 0) > 0;
}
