import { getCachedLocation, setCachedLocation } from "@/lib/map/locationCache";
import { loadOsmMarkers, loadUserMarkers } from "@/lib/map/mapData";
import { Coordinates, dedupeById, latLngToTile, tilesForBbox, tileToBbox } from "@/lib/map/types";
import { BoundingBox, OsmSpot, OsmStore, regionToBoundingBox, SkateSpot } from "@/lib/spots/types";
import { UserStore } from "@/lib/stores/types";
import { MAP_TILE_STALE_MS, MAX_DELTA, SCAN_MIN_MS, SPOTS_DEBOUNCE_MS } from "@/utils/constants";
import { queryKeys } from "@/utils/queryKeys";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import * as Location from "expo-location";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Region } from "react-native-maps";

type Status = "loading" | "denied" | "error" | "ready";

function regionToBbox(region: Region): BoundingBox {
  return regionToBoundingBox(
    region.latitude,
    region.longitude,
    region.latitudeDelta,
    region.longitudeDelta
  );
}

export function useMapRegionData() {
  const [status, setStatus] = useState<Status>("loading");
  const [initialRegion, setInitialRegion] = useState<Region | null>(null);
  const [currentRegion, setCurrentRegion] = useState<Region | null>(null);
  // Distance-based search (and "locate me", which recenters on this instead
  // of always waiting on a fresh fix) doesn't need the map's own precise
  // region — a cached last-known fix is "likely" enough to be useful
  // immediately, and gets upgraded to the real one once loadLocation
  // resolves below, then kept fresh by the live-tracking watch further down.
  const [searchLocation, setSearchLocation] = useState<Coordinates | null>(null);
  const [tooZoomedOut, setTooZoomedOut] = useState(false);
  const [dismissedEmpty, setDismissedEmpty] = useState(false);
  const [scanningMinimum, setScanningMinimum] = useState(false);

  const scanningMinRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const spotsDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queryClient = useQueryClient();

  const bbox = useMemo<BoundingBox | null>(
    () => (currentRegion && !tooZoomedOut ? regionToBbox(currentRegion) : null),
    [currentRegion, tooZoomedOut]
  );

  // ── Queries ────────────────────────────────────────────────────────────────
  // The viewport is covered by a fixed lat/lng tile grid (MAP_TILE_SIZE_DEG) and
  // each tile is fetched/cached independently, so panning back over a
  // previously-seen area reuses cached tiles instead of refetching them.

  const tiles = useMemo(() => (bbox ? tilesForBbox(bbox) : []), [bbox]);

  const osmTileResults = useQueries({
    queries: tiles.map((tile) => ({
      queryKey: queryKeys.mapOsmTile(tile),
      queryFn: () => loadOsmMarkers(tileToBbox(tile)),
      staleTime: MAP_TILE_STALE_MS,
    })),
  });

  const userTileResults = useQueries({
    queries: tiles.map((tile) => ({
      queryKey: queryKeys.mapUserTile(tile),
      queryFn: () => loadUserMarkers(tileToBbox(tile)),
      staleTime: MAP_TILE_STALE_MS,
    })),
  });

  const osmSpots: OsmSpot[] = useMemo(
    () => dedupeById(osmTileResults.flatMap((r) => r.data?.osmSpots ?? []), (s) => s.place_id),
    [osmTileResults]
  );
  const osmStores: OsmStore[] = useMemo(
    () => dedupeById(osmTileResults.flatMap((r) => r.data?.osmStores ?? []), (s) => s.place_id),
    [osmTileResults]
  );
  const userStores: UserStore[] = useMemo(
    () => dedupeById(osmTileResults.flatMap((r) => r.data?.userStores ?? []), (s) => s.store_id),
    [osmTileResults]
  );
  const userSpots: SkateSpot[] = useMemo(
    () => dedupeById(userTileResults.flatMap((r) => r.data?.userSpots ?? []), (s) => s.spot_id),
    [userTileResults]
  );

  const markersLoading =
    osmTileResults.some((r) => r.isFetching) || userTileResults.some((r) => r.isFetching);

  // ── Scanning minimum timer ─────────────────────────────────────────────────

  // When the region changes (i.e. a new load is triggered), show the SCANNING
  // banner for at least SCAN_MIN_MS regardless of how fast the query returns.
  useEffect(() => {
    if (!currentRegion) return;
    setScanningMinimum(true);
    if (scanningMinRef.current) clearTimeout(scanningMinRef.current);
    scanningMinRef.current = setTimeout(() => setScanningMinimum(false), SCAN_MIN_MS);
  }, [currentRegion]);

  // ── Cached location ────────────────────────────────────────────────────────
  // Loads once on mount, independent of the real GPS fix below, so the map
  // (and a "nearest" search) can show something useful the instant the app
  // opens instead of blocking on a fresh fix.

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cached = await getCachedLocation();
      if (cancelled || !cached) return;
      // The real fix (below) can resolve first if it's fast — never let a
      // stale cached value clobber it once that's happened.
      const region: Region = {
        latitude: cached.latitude,
        longitude: cached.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
      setInitialRegion((current) => current ?? region);
      setCurrentRegion((current) => current ?? region);
      setSearchLocation((current) => current ?? { lat: cached.latitude, lng: cached.longitude });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Location bootstrap ────────────────────────────────────────────────────
  // getCurrentPositionAsync can reject on-device (some Android versions throw
  // a native "Required value was null" when the fused location provider comes
  // back empty) — without this try/catch that was an unhandled rejection that
  // left the app stuck, or crashed, on the loading screen.

  // Shared by the background fix below and by a manual "locate me" press
  // (see reportLiveLocation) — either way, a real fix always wins.
  // initialRegion only matters for the map's first mount, so setting it again
  // here is a no-op once a cached region already mounted it. currentRegion
  // always takes over though: if that shifts which spots are fetched out from
  // under a user who's already panned elsewhere, pressing "locate me" (which
  // always does its own fresh fetch, right here) is the fix, not preserving a
  // stale center.
  const applyLiveLocation = useCallback((latitude: number, longitude: number) => {
    const region: Region = { latitude, longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 };
    setInitialRegion(region);
    setCurrentRegion(region);
    setStatus("ready");
    setSearchLocation({ lat: latitude, lng: longitude });
    setCachedLocation({ latitude, longitude });
  }, []);

  const loadLocation = useCallback(async () => {
    setStatus("loading");
    try {
      const { status: permStatus } = await Location.requestForegroundPermissionsAsync();

      if (permStatus !== "granted") {
        setStatus("denied");
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      applyLiveLocation(location.coords.latitude, location.coords.longitude);
    } catch {
      setStatus("error");
    }
  }, [applyLiveLocation]);

  useEffect(() => {
    loadLocation();
  }, [loadLocation]);

  // ── Live tracking ─────────────────────────────────────────────────────────
  // Keeps searchLocation moving with the device in the background, so
  // distance search and "locate me" stay accurate without either doing its
  // own fetch. Deliberately doesn't touch initialRegion/currentRegion/status:
  // those stay driven by explicit user actions (pan, "locate me"), so the
  // fetched-spots area never silently shifts just because the user is
  // walking around off-screen.

  useEffect(() => {
    if (status !== "ready" && status !== "error") return;

    let subscription: Location.LocationSubscription | undefined;
    let cancelled = false;

    (async () => {
      try {
        subscription = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, timeInterval: 5000, distanceInterval: 15 },
          (location) => {
            if (cancelled) return;
            setSearchLocation({ lat: location.coords.latitude, lng: location.coords.longitude });
            setCachedLocation({ latitude: location.coords.latitude, longitude: location.coords.longitude });
          }
        );
      } catch {
        // Live tracking is best-effort on top of the one-shot fixes above —
        // no separate error state if the platform can't start it.
      }
    })();

    return () => {
      cancelled = true;
      subscription?.remove();
    };
    // status is enough to know permission was already granted (loadLocation
    // only reaches "ready"/"error" after that check passes).
  }, [status]);

  // ── Region change handler ─────────────────────────────────────────────────

  const handleRegionChangeComplete = useCallback((region: Region) => {
    if (spotsDebounce.current) clearTimeout(spotsDebounce.current);

    if (region.latitudeDelta > MAX_DELTA || region.longitudeDelta > MAX_DELTA) {
      setTooZoomedOut(true);
      return;
    }

    setTooZoomedOut(false);
    spotsDebounce.current = setTimeout(() => {
      setDismissedEmpty(false);
      setCurrentRegion(region);
    }, SPOTS_DEBOUNCE_MS);
  }, []);

  // ── Optimistic prepend after user creates a spot/store ────────────────────
  // The new entity's own coordinates (not the current viewport) determine
  // which cached tile it belongs in — it was just dropped on-screen, so that
  // tile is always among the ones currently rendered.

  const prependUserSpot = useCallback(
    (spot: SkateSpot) => {
      const tile = latLngToTile(spot.latitude, spot.longitude);
      queryClient.setQueryData(
        queryKeys.mapUserTile(tile),
        (old: { userSpots: SkateSpot[] } | undefined) => ({
          userSpots: [spot, ...(old?.userSpots ?? [])],
        })
      );
    },
    [queryClient]
  );

  const prependUserStore = useCallback(
    (store: UserStore) => {
      const tile = latLngToTile(store.latitude, store.longitude);
      queryClient.setQueryData(
        queryKeys.mapOsmTile(tile),
        (old: { osmSpots: OsmSpot[]; osmStores: OsmStore[]; userStores: UserStore[] } | undefined) => ({
          osmSpots: old?.osmSpots ?? [],
          osmStores: old?.osmStores ?? [],
          userStores: [store, ...(old?.userStores ?? [])],
        })
      );
    },
    [queryClient]
  );

  // ── Manual refresh ─────────────────────────────────────────────────────────

  const refreshMarkers = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.mapOsmMarkersBase });
    queryClient.invalidateQueries({ queryKey: queryKeys.mapUserMarkersBase });
  }, [queryClient]);

  return {
    status,
    initialRegion,
    searchLocation,
    osmStores,
    osmSpots,
    userSpots,
    userStores,
    prependUserSpot,
    prependUserStore,
    dismissedEmpty,
    setDismissedEmpty,
    markersLoading,
    scanningMinimum,
    tooZoomedOut,
    handleRegionChangeComplete,
    refreshMarkers,
    retryLocation: loadLocation,
    reportLiveLocation: applyLiveLocation,
  };
}
