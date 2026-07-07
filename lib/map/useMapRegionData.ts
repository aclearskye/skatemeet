import { loadOsmMarkers, loadUserMarkers } from "@/lib/map/mapData";
import { BoundingBox, OsmSpot, OsmStore, regionToBoundingBox, SkateSpot } from "@/lib/spots/skateSpots";
import { UserStore } from "@/lib/stores/skateStores";
import { MAX_DELTA, SCAN_MIN_MS, SPOTS_DEBOUNCE_MS } from "@/utils/constants";
import { queryKeys } from "@/utils/queryKeys";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Location from "expo-location";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Region } from "react-native-maps";

type Status = "loading" | "denied" | "ready";

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

  // Keep a ref so prependUserSpot/prependUserStore always use the latest bbox
  const bboxRef = useRef(bbox);
  useEffect(() => { bboxRef.current = bbox; }, [bbox]);

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: osmData, isFetching: osmFetching } = useQuery({
    queryKey: queryKeys.mapOsmMarkers(bbox),
    queryFn: () => loadOsmMarkers(currentRegion!),
    enabled: bbox !== null,
    staleTime: 60_000,
  });

  const { data: userData, isFetching: userFetching } = useQuery({
    queryKey: queryKeys.mapUserMarkers(bbox),
    queryFn: () => loadUserMarkers(currentRegion!),
    enabled: bbox !== null,
    staleTime: 30_000,
  });

  const osmStores: OsmStore[] = osmData?.osmStores ?? [];
  const osmSpots: OsmSpot[] = osmData?.osmSpots ?? [];
  const userStores: UserStore[] = osmData?.userStores ?? [];
  const userSpots: SkateSpot[] = userData?.userSpots ?? [];
  const markersLoading = osmFetching || userFetching;

  // ── Scanning minimum timer ─────────────────────────────────────────────────

  // When the region changes (i.e. a new load is triggered), show the SCANNING
  // banner for at least SCAN_MIN_MS regardless of how fast the query returns.
  useEffect(() => {
    if (!currentRegion) return;
    setScanningMinimum(true);
    if (scanningMinRef.current) clearTimeout(scanningMinRef.current);
    scanningMinRef.current = setTimeout(() => setScanningMinimum(false), SCAN_MIN_MS);
  }, [currentRegion]);

  // ── Location bootstrap ────────────────────────────────────────────────────

  useEffect(() => {
    (async () => {
      const { status: permStatus } = await Location.requestForegroundPermissionsAsync();

      if (permStatus !== "granted") {
        setStatus("denied");
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = location.coords;
      const region: Region = {
        latitude,
        longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };

      setInitialRegion(region);
      setCurrentRegion(region);
      setStatus("ready");
    })();
  }, []);

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

  const prependUserSpot = useCallback(
    (spot: SkateSpot) => {
      queryClient.setQueryData(
        queryKeys.mapUserMarkers(bboxRef.current),
        (old: { userSpots: SkateSpot[] } | undefined) => ({
          userSpots: [spot, ...(old?.userSpots ?? [])],
        })
      );
    },
    [queryClient]
  );

  const prependUserStore = useCallback(
    (store: UserStore) => {
      queryClient.setQueryData(
        queryKeys.mapOsmMarkers(bboxRef.current),
        (old: { osmSpots: OsmSpot[]; osmStores: OsmStore[]; userStores: UserStore[] } | undefined) => ({
          osmSpots: old?.osmSpots ?? [],
          osmStores: old?.osmStores ?? [],
          userStores: [store, ...(old?.userStores ?? [])],
        })
      );
    },
    [queryClient]
  );

  return {
    status,
    initialRegion,
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
  };
}
