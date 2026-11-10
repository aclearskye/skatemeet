import { useQuery } from "@tanstack/react-query";
import type { PreviewItem } from "@/components/map/MapPreviewCard";
import { getCachedLocation } from "@/lib/map/locationCache";
import { boundingBoxAround, type Coordinates } from "@/lib/map/types";
import { previewItemToTagOption, type EntityTagOption } from "@/lib/posts/entityTagOptions";
import { fetchOsmSpotsInBounds, fetchSpotsInBounds } from "@/lib/spots/queries";
import { fetchOsmStoresInBounds, fetchUserStoresInBounds } from "@/lib/stores/queries";
import { queryKeys } from "@/utils/queryKeys";

const NEARBY_COUNT = 5;
const NEARBY_RADIUS_KM = 25;

// The composer's default tag suggestions: the 5 entities closest to the
// user's last known location (cached by the map), any type.
export function useNearbyEntityTags() {
  const { data: location } = useQuery({
    queryKey: queryKeys.cachedLocation(),
    queryFn: async (): Promise<Coordinates | null> => {
      const cached = await getCachedLocation();
      return cached ? { lat: cached.latitude, lng: cached.longitude } : null;
    },
  });

  const nearby = useQuery({
    queryKey: queryKeys.nearbyEntityTags(location ?? { lat: 0, lng: 0 }),
    enabled: location != null,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<EntityTagOption[]> => {
      const bbox = boundingBoxAround(location!, NEARBY_RADIUS_KM);
      const [osmSpots, userSpots, osmStores, userStores] = await Promise.all([
        fetchOsmSpotsInBounds(bbox),
        fetchSpotsInBounds(bbox),
        fetchOsmStoresInBounds(bbox),
        fetchUserStoresInBounds(bbox),
      ]);
      const items: PreviewItem[] = [
        ...userSpots.map((data) => ({ kind: "user-spot" as const, data })),
        ...osmSpots.map((data) => ({ kind: "osm-spot" as const, data })),
        ...userStores.map((data) => ({ kind: "user-store" as const, data })),
        ...osmStores.map((data) => ({ kind: "osm-store" as const, data })),
      ];
      return items
        .map((item) => previewItemToTagOption(item, location!))
        .sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity))
        .slice(0, NEARBY_COUNT);
    },
  });

  return { location: location ?? null, options: nearby.data ?? [], isLoading: nearby.isLoading && location != null };
}
