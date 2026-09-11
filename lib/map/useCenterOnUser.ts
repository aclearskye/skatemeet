import type { Coordinates } from "@/lib/map/types";
import * as Location from "expo-location";
import { useCallback, useState } from "react";
import type MapViewNative from "react-native-maps";
import { Region } from "react-native-maps";

const LOCATE_DELTA = 0.01;

function regionAround(latitude: number, longitude: number): Region {
  return { latitude, longitude, latitudeDelta: LOCATE_DELTA, longitudeDelta: LOCATE_DELTA };
}

export function useCenterOnUser(
  mapRef: React.RefObject<MapViewNative | null>,
  knownLocation: Coordinates | null,
  onLocated?: (latitude: number, longitude: number) => void
) {
  const [isLocating, setIsLocating] = useState(false);

  const centerOnUser = useCallback(async () => {
    // The background live-tracking watch (see useMapRegionData) already
    // keeps this current while the app is foregrounded, so there's no need
    // to wait on a fresh GPS fix just to recenter — that was making every
    // press slow on devices where getCurrentPositionAsync is slow, for no
    // benefit. Only fall back to fetching when nothing's known yet (e.g.
    // permission was just granted, or the app was reopened from closed/
    // backgrounded before tracking has caught back up).
    if (knownLocation) {
      mapRef.current?.animateToRegion(regionAround(knownLocation.lat, knownLocation.lng), 400);
      return;
    }

    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      const { coords } = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      mapRef.current?.animateToRegion(regionAround(coords.latitude, coords.longitude), 400);
      onLocated?.(coords.latitude, coords.longitude);
    } finally {
      setIsLocating(false);
    }
  }, [mapRef, knownLocation, onLocated]);

  return { centerOnUser, isLocating };
}
