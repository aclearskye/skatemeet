import { syncCheckInStatus } from "@/lib/checkins/mutations";
import { fetchActiveCheckIn } from "@/lib/checkins/queries";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { useToast } from "@/lib/context/toast-context";
import { queryKeys } from "@/utils/queryKeys";
import { useQueryClient } from "@tanstack/react-query";
import * as Location from "expo-location";
import { useCallback, useEffect, useRef } from "react";
import { AppState } from "react-native";

// Foreground-only auto-checkout (see CHECKIN_FEATURE_PLAN.md for why there's
// no background geofencing): opportunistically double-checks the caller's
// active check-in, if any, on app foreground and on mount (screens that want
// an extra check — e.g. spot/store detail — can call this too; it's cheap
// and a no-op without an active check-in). Mounted once, in RootNavigation,
// rather than per-screen, so app-wide foreground events are only handled
// once.
export function useCheckInSync() {
  const { session } = useAuthContext();
  const profileId = session?.user.id ?? null;
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const isSyncing = useRef(false);

  const runSync = useCallback(async () => {
    if (!profileId || isSyncing.current) return;
    isSyncing.current = true;
    try {
      const active = await fetchActiveCheckIn(profileId);
      if (!active) return;

      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== "granted") return;

      const { coords } = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const result = await syncCheckInStatus(coords.latitude, coords.longitude);

      if (!result.isActive) {
        queryClient.invalidateQueries({ queryKey: queryKeys.checkInStatus(profileId) });
        showToast({
          message:
            result.checkedOutReason === "auto_expired"
              ? "CHECKED OUT · SESSION EXPIRED"
              : "CHECKED OUT · YOU LEFT THE AREA",
          variant: "info",
        });
      }
    } catch {
      // Best-effort — the next foreground event or screen mount gets another
      // chance; nothing here is worth surfacing an error for.
    } finally {
      isSyncing.current = false;
    }
  }, [profileId, queryClient, showToast]);

  useEffect(() => {
    runSync();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") runSync();
    });
    return () => subscription.remove();
  }, [runSync]);
}
