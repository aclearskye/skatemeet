import { useCallback, useEffect, useRef } from "react";
import { AppState } from "react-native";
import * as Location from "expo-location";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { haversineDistanceKm, type Coordinates } from "@/lib/map/types";
import { reportLiveLocation } from "@/lib/nearby/mutations";
import {
  LAST_KNOWN_FIX_MAX_AGE_MS,
  LIVE_LOCATION_REPORT_INTERVAL_MS,
  LIVE_LOCATION_REPORT_MIN_MOVE_KM,
} from "@/utils/constants";

// Keeps the signed-in user's "last live location" for nearby search up to
// date: on mount and whenever the app comes back to the foreground. Never
// asks for location permission, and does nothing for accounts that are
// private, not discoverable or not age-confirmed, so their location is never
// sent. The server rounds whatever it gets to a ~2 km cell. Mounted once, in
// RootNavigation.
export function useLiveLocationReporter() {
  const { session, profile } = useAuthContext();
  const profileId = session?.user.id ?? null;
  const isEligible = !!profile && profile.show_in_nearby && !profile.is_private && !!profile.age_confirmed_at;
  const lastReportRef = useRef<{ at: number; coords: Coordinates } | null>(null);
  const isReportingRef = useRef(false);

  useEffect(() => {
    lastReportRef.current = null;
  }, [profileId, isEligible]);

  const report = useCallback(async () => {
    if (!profileId || !isEligible || isReportingRef.current) return;
    isReportingRef.current = true;
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== "granted") return;

      const lastKnown = await Location.getLastKnownPositionAsync({ maxAge: LAST_KNOWN_FIX_MAX_AGE_MS }).catch(
        () => null
      );
      const fix = lastKnown ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
      const coords = { lat: fix.coords.latitude, lng: fix.coords.longitude };

      const last = lastReportRef.current;
      if (
        last &&
        Date.now() - last.at < LIVE_LOCATION_REPORT_INTERVAL_MS &&
        haversineDistanceKm(last.coords, coords) < LIVE_LOCATION_REPORT_MIN_MOVE_KM
      ) {
        return;
      }

      await reportLiveLocation(coords);
      lastReportRef.current = { at: Date.now(), coords };
    } catch {
      // Best-effort: the next foreground event gets another chance.
    } finally {
      isReportingRef.current = false;
    }
  }, [profileId, isEligible]);

  useEffect(() => {
    report();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") report();
    });
    return () => subscription.remove();
  }, [report]);
}
