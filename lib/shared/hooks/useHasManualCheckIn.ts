import { useAuthContext } from "@/lib/context/use-auth-context";
import { supabase } from "@/lib/supabaseClient";
import { EntityRef, entityKeyOf } from "@/lib/checkins/types";
import { queryKeys } from "@/utils/queryKeys";
import { useQuery } from "@tanstack/react-query";

async function fetchHasManualCheckIn(ref: EntityRef): Promise<boolean> {
  const { data, error } = await supabase.rpc("has_manual_checkin", {
    p_spot_id: ref.spotId,
    p_osm_spot_place_id: ref.osmSpotPlaceId,
    p_store_id: ref.storeId,
    p_osm_store_place_id: ref.osmStorePlaceId,
  });
  if (error) throw error;
  return data as boolean;
}

// "Has this profile ever manually checked in here" — distinct from
// useCheckIn's isCheckedInHere, which only tracks an active session. Used to
// gate review/photo-upload eligibility, which cares about proof-of-presence
// ever having happened, not current presence.
export function useHasManualCheckIn(ref: EntityRef) {
  const { session } = useAuthContext();
  const entityKey = entityKeyOf(ref);

  const { data: hasCheckedIn = false, isLoading } = useQuery({
    queryKey: queryKeys.hasManualCheckIn(entityKey ?? ""),
    queryFn: () => fetchHasManualCheckIn(ref),
    enabled: !!session && !!entityKey,
  });

  return { hasCheckedIn, isLoading };
}
