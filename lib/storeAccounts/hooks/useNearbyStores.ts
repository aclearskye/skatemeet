import { useQuery } from "@tanstack/react-query";
import { searchNearbyStores } from "@/lib/storeAccounts/queries";
import { queryKeys } from "@/utils/queryKeys";

type Coords = { lat: number; lng: number } | null;

// Approved stores within 50 km of the search point.
export function useNearbyStores(coords: Coords) {
  // Rounded to ~1 km so small location changes reuse the cached result.
  const lat = coords ? Math.round(coords.lat * 100) / 100 : 0;
  const lng = coords ? Math.round(coords.lng * 100) / 100 : 0;
  return useQuery({
    queryKey: queryKeys.nearbyStores(lat, lng),
    queryFn: () => searchNearbyStores(lat, lng),
    enabled: coords != null,
    staleTime: 5 * 60 * 1000,
  });
}
