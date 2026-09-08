import { fetchOsmSpotsInBounds, fetchSpotsInBounds } from "@/lib/spots/queries";
import { OsmSpot, OsmStore, regionToBoundingBox, SkateSpot } from "@/lib/spots/types";
import { fetchOsmStoresInBounds, fetchUserStoresInBounds } from "@/lib/stores/queries";
import { UserStore } from "@/lib/stores/types";
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
