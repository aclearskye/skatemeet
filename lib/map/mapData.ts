import {
  fetchOsmSpotsInBounds,
  fetchOsmStoresInBounds,
  fetchSpotsInBounds,
  OsmSpot,
  OsmStore,
  regionToBoundingBox,
  SkateSpot,
} from "@/lib/spots/skateSpots";
import { fetchUserStoresInBounds, UserStore } from "@/lib/stores/skateStores";
import { Region } from "react-native-maps";

export type OsmMarkersResult = {
  osmSpots: OsmSpot[];
  osmStores: OsmStore[];
  userStores: UserStore[];
};

export async function loadOsmMarkers(region: Region): Promise<OsmMarkersResult> {
  const bbox = regionToBoundingBox(
    region.latitude,
    region.longitude,
    region.latitudeDelta,
    region.longitudeDelta
  );
  const [osmSpots, osmStores, userStores] = await Promise.all([
    fetchOsmSpotsInBounds(bbox),
    fetchOsmStoresInBounds(bbox),
    fetchUserStoresInBounds(bbox),
  ]);
  return { osmSpots, osmStores, userStores };
}

export async function loadUserMarkers(region: Region): Promise<{ userSpots: SkateSpot[] }> {
  const bbox = regionToBoundingBox(
    region.latitude,
    region.longitude,
    region.latitudeDelta,
    region.longitudeDelta
  );
  const userSpots = await fetchSpotsInBounds(bbox);
  return { userSpots };
}
