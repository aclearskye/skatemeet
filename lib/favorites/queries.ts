import type { PreviewItem } from "@/components/map/MapPreviewCard";
import { fetchOsmSpotsByIds, fetchUserSpotsByIds } from "@/lib/spots/queries";
import { fetchOsmStoresByIds, fetchUserStoresByIds } from "@/lib/stores/queries";
import { supabase } from "@/lib/supabaseClient";
import type { SpotFavoriteRow, StoreFavoriteRow } from "./types";

export async function fetchProfileFavorites(profileId: string): Promise<PreviewItem[]> {
  const [spotFavRes, storeFavRes] = await Promise.all([
    supabase
      .from("spot_favorites")
      .select("created_at, spot_id, osm_place_id")
      .eq("profile_id", profileId),
    supabase
      .from("store_favorites")
      .select("created_at, store_id, osm_place_id")
      .eq("profile_id", profileId),
  ]);
  if (spotFavRes.error) throw spotFavRes.error;
  if (storeFavRes.error) throw storeFavRes.error;

  const spotFavs = spotFavRes.data as SpotFavoriteRow[];
  const storeFavs = storeFavRes.data as StoreFavoriteRow[];

  const [userSpots, osmSpots, userStores, osmStores] = await Promise.all([
    fetchUserSpotsByIds(spotFavs.filter((f) => f.spot_id).map((f) => f.spot_id!)),
    fetchOsmSpotsByIds(spotFavs.filter((f) => f.osm_place_id).map((f) => f.osm_place_id!)),
    fetchUserStoresByIds(storeFavs.filter((f) => f.store_id).map((f) => f.store_id!)),
    fetchOsmStoresByIds(storeFavs.filter((f) => f.osm_place_id).map((f) => f.osm_place_id!)),
  ]);

  const userSpotMap = new Map(userSpots.map((s) => [s.spot_id, s]));
  const osmSpotMap = new Map(osmSpots.map((s) => [s.place_id, s]));
  const userStoreMap = new Map(userStores.map((s) => [s.store_id, s]));
  const osmStoreMap = new Map(osmStores.map((s) => [s.place_id, s]));

  const dated: { createdAt: string; item: PreviewItem }[] = [];

  for (const fav of spotFavs) {
    if (fav.spot_id) {
      const data = userSpotMap.get(fav.spot_id);
      if (data) dated.push({ createdAt: fav.created_at, item: { kind: "user-spot", data } });
    } else if (fav.osm_place_id) {
      const data = osmSpotMap.get(fav.osm_place_id);
      if (data) dated.push({ createdAt: fav.created_at, item: { kind: "osm-spot", data } });
    }
  }
  for (const fav of storeFavs) {
    if (fav.store_id) {
      const data = userStoreMap.get(fav.store_id);
      if (data) dated.push({ createdAt: fav.created_at, item: { kind: "user-store", data } });
    } else if (fav.osm_place_id) {
      const data = osmStoreMap.get(fav.osm_place_id);
      if (data) dated.push({ createdAt: fav.created_at, item: { kind: "osm-store", data } });
    }
  }

  dated.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return dated.map((d) => d.item);
}
