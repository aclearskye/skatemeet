import { checkIn, CheckInError, checkOut } from "@/lib/checkins/mutations";
import { fetchActiveCheckIn, fetchUserStreak } from "@/lib/checkins/queries";
import { EntityRef, isSameEntity } from "@/lib/checkins/types";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { useToast } from "@/lib/context/toast-context";
import { useLiveCount } from "@/lib/shared/hooks/useLiveCount";
import { queryKeys } from "@/utils/queryKeys";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Location from "expo-location";
import { useState } from "react";

// One cohesive hook for the whole check-in interaction on a single entity
// (status, live count, and the toggle itself) rather than splitting it
// further -- mirrors useReviewableEntity's shape for the same reason: these
// pieces are only ever used together, by one toggle.
export function useCheckIn(ref: EntityRef) {
  const { session } = useAuthContext();
  const profileId = session?.user.id ?? null;
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: activeCheckIn = null, isLoading: isLoadingStatus } = useQuery({
    queryKey: queryKeys.checkInStatus(profileId ?? ""),
    queryFn: () => fetchActiveCheckIn(profileId!),
    enabled: !!profileId,
  });

  const liveCount = useLiveCount(ref);

  const isCheckedInHere =
    activeCheckIn != null &&
    isSameEntity(ref, {
      spotId: activeCheckIn.spot_id,
      osmSpotPlaceId: activeCheckIn.osm_spot_place_id,
      storeId: activeCheckIn.store_id,
      osmStorePlaceId: activeCheckIn.osm_store_place_id,
    });

  function invalidateAfterChange() {
    queryClient.invalidateQueries({ queryKey: queryKeys.checkInStatus(profileId ?? "") });
    queryClient.invalidateQueries({ queryKey: queryKeys.liveCount(ref) });
    // The map's per-tile live counts (useMapRegionData.ts) are a separate
    // cache from the single-entity query above -- without this, a marker's
    // dot wouldn't catch up until its next ~25s poll if the map happened to
    // already be mounted underneath (e.g. checking in, then navigating
    // back). Prefix match invalidates every cached tile at once; only
    // whichever are currently observed actually refetch.
    queryClient.invalidateQueries({ queryKey: ["checkIn", "liveCounts"] });
    // "Spots visited" on the profile screen is keyed under profileStats(id) +
    // "spots" (see ProfileView.tsx) -- it's now backed by this same ledger.
    if (profileId) {
      queryClient.invalidateQueries({ queryKey: [...queryKeys.profileStats(profileId), "spots"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.userStreak(profileId) });
    }
  }

  const checkInMutation = useMutation({
    mutationFn: async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        throw new CheckInError("PERMISSION_DENIED", "Location permission is required to check in.");
      }
      const { coords } = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const result = await checkIn(ref, coords.latitude, coords.longitude);
      const streak = profileId ? await fetchUserStreak(profileId) : null;
      return { result, streak };
    },
    onSuccess: ({ result, streak }) => {
      setErrorMessage(null);
      invalidateAfterChange();
      // Written directly, not just left to invalidateAfterChange's refetch,
      // so the profile's StreakBadge updates the instant this resolves
      // (possibly from a screen other than the profile itself) rather than
      // waiting on a second round trip.
      if (profileId && streak) {
        queryClient.setQueryData(queryKeys.userStreak(profileId), streak);
      }
      const streakLabel =
        streak && streak.current_streak >= 1 ? ` · ${streak.current_streak} DAY STREAK` : "";
      // Reflects exactly why XP did or didn't pay out this time (see
      // CheckInXpStatus) rather than always claiming +10 XP.
      const message = result.spotVerifiedNow
        ? `SPOT COMMUNITY VERIFIED · +10 XP${streakLabel}`
        : result.xpStatus === "awarded"
          ? `+10 XP · CHECKED IN${streakLabel}`
          : result.xpStatus === "banked"
            ? `CHECKED IN · XP BANKED UNTIL VERIFIED${streakLabel}`
            : result.xpStatus === "daily_cap"
              ? `CHECKED IN · DAILY XP ALREADY EARNED${streakLabel}`
              : `CHECKED IN${streakLabel}`;
      showToast({ message, variant: "success" });
    },
    onError: (error: unknown) => {
      setErrorMessage(error instanceof CheckInError ? error.message : "Couldn't check in — try again.");
    },
  });

  const checkOutMutation = useMutation({
    mutationFn: () => checkOut(),
    onSuccess: () => {
      setErrorMessage(null);
      invalidateAfterChange();
    },
    onError: () => setErrorMessage("Couldn't check out — try again."),
  });

  return {
    liveCount,
    isCheckedInHere,
    isLoadingStatus,
    errorMessage,
    isSubmitting: checkInMutation.isPending || checkOutMutation.isPending,
    toggle: () => (isCheckedInHere ? checkOutMutation.mutate() : checkInMutation.mutate()),
  };
}
