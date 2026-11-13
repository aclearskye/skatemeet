import { useCallback, useEffect, useState } from "react";
import * as Location from "expo-location";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { setCachedLocation } from "@/lib/map/locationCache";
import type { Coordinates } from "@/lib/map/types";
import { getSavedSearchLocation, saveSearchLocation } from "@/lib/nearby/searchLocationStorage";
import type { SearchLocation, SearchLocationStatus } from "@/lib/nearby/types";
import { LAST_KNOWN_FIX_MAX_AGE_MS } from "@/utils/constants";

// The location nearby search looks around: the device's own location by
// default, or a place the user picked (remembered on this device). The
// device location is read once per lookup rather than tracked live, so a
// moving user doesn't keep starting new (rate-limited) searches.
export function useSearchLocation() {
  const { session } = useAuthContext();
  const profileId = session?.user.id ?? null;
  const [location, setLocationState] = useState<SearchLocation | null>(null);
  const [currentCoords, setCurrentCoords] = useState<Coordinates | null>(null);
  const [currentStatus, setCurrentStatus] = useState<SearchLocationStatus>("locating");

  useEffect(() => {
    if (!profileId) return;
    let cancelled = false;
    getSavedSearchLocation(profileId).then((saved) => {
      if (!cancelled) setLocationState(saved ?? { kind: "current" });
    });
    return () => {
      cancelled = true;
    };
  }, [profileId]);

  const locateCurrent = useCallback(async () => {
    setCurrentStatus("locating");
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setCurrentStatus("denied");
        return;
      }
      const lastKnown = await Location.getLastKnownPositionAsync({ maxAge: LAST_KNOWN_FIX_MAX_AGE_MS }).catch(
        () => null
      );
      const fix = lastKnown ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
      setCurrentCoords({ lat: fix.coords.latitude, lng: fix.coords.longitude });
      setCachedLocation({ latitude: fix.coords.latitude, longitude: fix.coords.longitude });
      setCurrentStatus("ready");
    } catch {
      setCurrentStatus("unavailable");
    }
  }, []);

  const isCurrent = location?.kind === "current";
  useEffect(() => {
    if (isCurrent) locateCurrent();
  }, [isCurrent, locateCurrent]);

  const setLocation = useCallback(
    (next: SearchLocation) => {
      setLocationState(next);
      if (profileId) saveSearchLocation(profileId, next);
    },
    [profileId]
  );

  const coords = location?.kind === "custom" ? location.coords : isCurrent ? currentCoords : null;
  const status: SearchLocationStatus = location?.kind === "custom" ? "ready" : currentStatus;

  return { location, coords, status, setLocation, retryCurrent: locateCurrent };
}
