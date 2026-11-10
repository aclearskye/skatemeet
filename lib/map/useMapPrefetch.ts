import { useEffect } from "react";
import * as Location from "expo-location";
import { useQueryClient } from "@tanstack/react-query";
import { setCachedLocation, getCachedLocation } from "@/lib/map/locationCache";
import { loadOsmMarkers, loadUserMarkers } from "@/lib/map/mapData";
import { tilesForBbox, tileToBbox } from "@/lib/map/types";
import { regionToBoundingBox } from "@/lib/spots/types";
import { MAP_INITIAL_DELTA, MAP_TILE_STALE_MS } from "@/utils/constants";
import { queryKeys } from "@/utils/queryKeys";

// The app opens on Feed, so the map tab (mounted lazily) used to start from
// nothing: ask for a GPS fix, wait, then fetch spots. This does that work at
// launch instead, into the same caches the map reads (the cached location
// and the per-tile marker queries in useMapRegionData), so opening the tab
// finds the user's location and nearby spots already there.
//
// Only when location permission was already granted -- it never prompts
// (the map tab still asks, when the user goes there).
export function useMapPrefetch() {
  const queryClient = useQueryClient();

  useEffect(() => {
    let cancelled = false;

    function prefetchAround(latitude: number, longitude: number) {
      const bbox = regionToBoundingBox(latitude, longitude, MAP_INITIAL_DELTA, MAP_INITIAL_DELTA);
      for (const tile of tilesForBbox(bbox)) {
        queryClient.prefetchQuery({
          queryKey: queryKeys.mapOsmTile(tile),
          queryFn: () => loadOsmMarkers(tileToBbox(tile)),
          staleTime: MAP_TILE_STALE_MS,
        });
        queryClient.prefetchQuery({
          queryKey: queryKeys.mapUserTile(tile),
          queryFn: () => loadUserMarkers(tileToBbox(tile)),
          staleTime: MAP_TILE_STALE_MS,
        });
      }
    }

    (async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status !== "granted" || cancelled) return;

        // Last session's spot first -- usually where the user still is, and
        // available instantly.
        const cached = await getCachedLocation();
        if (cached && !cancelled) prefetchAround(cached.latitude, cached.longitude);

        const { coords } = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (cancelled) return;
        await setCachedLocation({ latitude: coords.latitude, longitude: coords.longitude });
        // Tiles already warmed for the cached spot are reused; only new
        // ones fetch.
        prefetchAround(coords.latitude, coords.longitude);
      } catch {
        // Best effort: the map tab does its own location + fetch anyway.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [queryClient]);
}
