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
  upvote_count: number;
};

export type OsmShop = {
  place_id: string;
  name: string;
  address: string;
  phone: string | null;
  website: string | null;
  opening_hours: string | null;
  coordinates: { lat: number; lng: number };
  upvote_count: number;
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
    .select("place_id, name, address, spot_type, latitude, longitude, upvote_count")
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
    upvote_count: row.upvote_count as number,
  }));
}

// ── OSM shops ─────────────────────────────────────────────────────────────────

export async function fetchOsmShopsInBounds(bbox: BoundingBox): Promise<OsmShop[]> {
  const { data, error } = await supabase
    .from("osm_shops")
    .select("place_id, name, address, phone, website, opening_hours, latitude, longitude, upvote_count")
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
    upvote_count: row.upvote_count as number,
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
  spotId: string | null,
  osmPlaceId: string | null,
  userId: string
): Promise<{ upvote_count: number; user_has_voted: boolean }> {
  const payload = spotId
    ? { spot_id: spotId, profile_id: userId }
    : { osm_place_id: osmPlaceId, profile_id: userId };

  const { error: insertError } = await supabase.from("spot_votes").insert(payload);

  let userHasVoted = true;

  if (insertError) {
    if (insertError.code === "23505") {
      const base = supabase.from("spot_votes").delete().eq("profile_id", userId);
      const { error: deleteError } = spotId
        ? await base.eq("spot_id", spotId)
        : await base.eq("osm_place_id", osmPlaceId!);
      if (deleteError) throw deleteError;
      userHasVoted = false;
    } else {
      throw insertError;
    }
  }

  const table = spotId ? "user_spots" : "osm_spots";
  const col = spotId ? "spot_id" : "place_id";
  const val = spotId ?? osmPlaceId!;
  const { data, error } = await supabase
    .from(table)
    .select("upvote_count")
    .eq(col, val)
    .single();
  if (error) throw error;
  return { upvote_count: (data as any).upvote_count, user_has_voted: userHasVoted };
}

export async function getUserVoteStatus(
  spotId: string | null,
  osmPlaceId: string | null,
  userId: string
): Promise<boolean> {
  const base = supabase
    .from("spot_votes")
    .select("*", { count: "exact", head: true })
    .eq("profile_id", userId);
  const { count, error } = spotId
    ? await base.eq("spot_id", spotId)
    : await base.eq("osm_place_id", osmPlaceId!);
  if (error) throw error;
  return (count ?? 0) > 0;
}

export async function getSpotVoteCount(
  spotId: string | null,
  osmPlaceId: string | null
): Promise<number> {
  const table = spotId ? "user_spots" : "osm_spots";
  const col = spotId ? "spot_id" : "place_id";
  const val = spotId ?? osmPlaceId!;
  const { data, error } = await supabase
    .from(table)
    .select("upvote_count")
    .eq(col, val)
    .single();
  if (error) throw error;
  return (data as any).upvote_count as number;
}

// ── Spot Cards ────────────────────────────────────────────────────────────────

export type SpotCard = {
  card_id: string; profile_id: string;
  spot_id: string | null; osm_place_id: string | null;
  heading: string; rating: number | null; comment: string;
  upvote_count: number; is_verified: boolean; created_at: string;
};

export type SpotCardWithProfile = SpotCard & {
  profiles: { username: string; display_name: string | null };
};

export type CreateSpotCardPayload = {
  spot_id: string | null; osm_place_id: string | null;
  heading: string; rating: number | null; comment: string;
};

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
  const rows = (data ?? []) as { rating: number }[];
  if (rows.length === 0) return { average: null, count: 0 };
  const sum = rows.reduce((acc, r) => acc + r.rating, 0);
  return { average: Math.round((sum / rows.length) * 10) / 10, count: rows.length };
}

export async function createSpotCard(
  payload: CreateSpotCardPayload,
  userId: string
): Promise<SpotCard> {
  const { data, error } = await supabase
    .from("spot_cards")
    .insert({ ...payload, profile_id: userId })
    .select()
    .single();
  if (error) throw error;
  return data as SpotCard;
}

// ── Spot Favourites ───────────────────────────────────────────────────────────

export async function getSpotFavouriteStatus(
  spotId: string | null,
  osmPlaceId: string | null,
  userId: string
): Promise<boolean> {
  const filter = spotId ? { spot_id: spotId } : { osm_place_id: osmPlaceId };
  const { count, error } = await supabase
    .from("spot_favourites")
    .select("*", { count: "exact", head: true })
    .eq("profile_id", userId)
    .match(filter);
  if (error) throw error;
  return (count ?? 0) > 0;
}

export async function toggleSpotFavourite(
  spotId: string | null,
  osmPlaceId: string | null,
  userId: string
): Promise<boolean> {
  const payload = spotId
    ? { profile_id: userId, spot_id: spotId }
    : { profile_id: userId, osm_place_id: osmPlaceId };

  const { error: insertError } = await supabase.from("spot_favourites").insert(payload);

  if (insertError) {
    if (insertError.code === "23505") {
      const base = supabase
        .from("spot_favourites")
        .delete()
        .eq("profile_id", userId);
      const { error: deleteError } = spotId
        ? await base.eq("spot_id", spotId)
        : await base.eq("osm_place_id", osmPlaceId!);
      if (deleteError) throw deleteError;
      return false;
    }
    throw insertError;
  }
  return true;
}

// ── Spot Card Votes ───────────────────────────────────────────────────────────

export async function toggleSpotCardVote(
  cardId: string,
  userId: string
): Promise<{ upvote_count: number; user_has_voted: boolean }> {
  const { error: insertError } = await supabase
    .from("spot_card_votes")
    .insert({ card_id: cardId, profile_id: userId });

  let userHasVoted = true;

  if (insertError) {
    if (insertError.code === "23505") {
      const { error: deleteError } = await supabase
        .from("spot_card_votes")
        .delete()
        .eq("card_id", cardId)
        .eq("profile_id", userId);
      if (deleteError) throw deleteError;
      userHasVoted = false;
    } else {
      throw insertError;
    }
  }

  const { data, error: readError } = await supabase
    .from("spot_cards")
    .select("upvote_count")
    .eq("card_id", cardId)
    .single();
  if (readError) throw readError;

  return { upvote_count: (data as any).upvote_count, user_has_voted: userHasVoted };
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
    result[(row as any).card_id] = true;
  }
  return result;
}
