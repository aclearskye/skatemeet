import { loadOsmMarkers, loadUserMarkers } from "@/lib/map/mapData";
import { OsmSpot, OsmStore, SkateSpot } from "@/lib/spots/skateSpots";
import { UserStore } from "@/lib/stores/skateStores";
import { MAX_DELTA, SCAN_MIN_MS, SPOTS_DEBOUNCE_MS } from "@/utils/constants";
import * as Location from "expo-location";
import { useCallback, useEffect, useRef, useState } from "react";
import { Region } from "react-native-maps";

type Status = "loading" | "denied" | "ready";

export function useMapRegionData() {
  const [status, setStatus] = useState<Status>("loading");
  const [initialRegion, setInitialRegion] = useState<Region | null>(null);

  const [osmStores, setOsmStores] = useState<OsmStore[]>([]);
  const [osmSpots, setOsmSpots] = useState<OsmSpot[]>([]);
  const [userSpots, setUserSpots] = useState<SkateSpot[]>([]);
  const [userStores, setUserStores] = useState<UserStore[]>([]);

  const [dismissedEmpty, setDismissedEmpty] = useState(false);
  const [markersLoading, setMarkersLoading] = useState(false);
  const [scanningMinimum, setScanningMinimum] = useState(false);
  const [tooZoomedOut, setTooZoomedOut] = useState(false);
  const scanningMinRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const spotsDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadMarkers = useCallback(async (region: Region) => {
    setDismissedEmpty(false);
    setMarkersLoading(true);
    if (scanningMinRef.current) clearTimeout(scanningMinRef.current);
    setScanningMinimum(true);
    scanningMinRef.current = setTimeout(() => setScanningMinimum(false), SCAN_MIN_MS);
    try {
      await Promise.all([
        loadOsmMarkers(region)
          .then(({ osmSpots, osmStores, userStores }) => {
            setOsmSpots(osmSpots);
            setOsmStores(osmStores);
            setUserStores(userStores);
          })
          .catch(() => {
            // OSM data is best-effort; don't surface an error banner
          }),
        loadUserMarkers(region)
          .then(({ userSpots }) => setUserSpots(userSpots))
          .catch(() => {
            // silently ignore
          }),
      ]);
    } finally {
      setMarkersLoading(false);
    }
  }, []);

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
      setMarkersLoading(true);
      setStatus("ready");

      await loadMarkers(region);
    })();
  }, [loadMarkers]);

  const handleRegionChangeComplete = useCallback(
    (region: Region) => {
      if (spotsDebounce.current) clearTimeout(spotsDebounce.current);

      if (region.latitudeDelta > MAX_DELTA || region.longitudeDelta > MAX_DELTA) {
        setTooZoomedOut(true);
        return;
      }

      setTooZoomedOut(false);
      spotsDebounce.current = setTimeout(() => {
        loadMarkers(region);
      }, SPOTS_DEBOUNCE_MS);
    },
    [loadMarkers]
  );

  return {
    status,
    initialRegion,
    osmStores,
    osmSpots,
    userSpots,
    userStores,
    setUserSpots,
    setUserStores,
    dismissedEmpty,
    setDismissedEmpty,
    markersLoading,
    scanningMinimum,
    tooZoomedOut,
    handleRegionChangeComplete,
  };
}
