import { fetchOsmSpotsInBounds, fetchSpotsInBounds } from "@/lib/spots/queries";
import { BoundingBox, OsmSpot, OsmStore, SkateSpot } from "@/lib/spots/types";
import { fetchOsmStoresInBounds, fetchUserStoresInBounds } from "@/lib/stores/queries";
import { UserStore } from "@/lib/stores/types";

export type OsmMarkersResult = {
  osmSpots: OsmSpot[];
  osmStores: OsmStore[];
  userStores: UserStore[];
};

export async function loadOsmMarkers(bbox: BoundingBox): Promise<OsmMarkersResult> {
  const [osmSpots, osmStores, userStores] = await Promise.all([
    fetchOsmSpotsInBounds(bbox),
    fetchOsmStoresInBounds(bbox),
    fetchUserStoresInBounds(bbox),
  ]);
  return { osmSpots, osmStores, userStores };
}

export async function loadUserMarkers(bbox: BoundingBox): Promise<{ userSpots: SkateSpot[] }> {
  const userSpots = await fetchSpotsInBounds(bbox);
  return { userSpots };
}
