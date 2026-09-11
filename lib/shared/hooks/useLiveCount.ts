import { fetchLiveCount } from "@/lib/checkins/queries";
import { entityKeyOf, EntityRef } from "@/lib/checkins/types";
import { queryKeys } from "@/utils/queryKeys";
import { useQuery } from "@tanstack/react-query";

// Split out from useCheckIn so read-only contexts (preview cards, search
// results, many-at-once) don't also pull in the toggle/mutation machinery
// that only a detail page's CheckInSection needs.
export function useLiveCount(ref: EntityRef): number | null {
  const { data } = useQuery({
    queryKey: queryKeys.liveCount(ref),
    queryFn: () => fetchLiveCount(ref),
    enabled: entityKeyOf(ref) != null,
    refetchInterval: 25_000,
  });
  return data ?? null;
}
