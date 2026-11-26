import { useInfiniteQuery } from "@tanstack/react-query";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { isApprovedStoreProfile } from "@/lib/storeAccounts/types";
import { CHECKIN_PAGE_SIZE, fetchStoreCheckins } from "@/lib/tickets/scanQueries";
import { queryKeys } from "@/utils/queryKeys";

// The store's check-in list, 50 at a time, searchable by skater name.
export function useStoreCheckins(search: string, todayOnly: boolean) {
  const { profile } = useAuthContext();
  return useInfiniteQuery({
    queryKey: queryKeys.storeCheckins(profile?.profile_id ?? "", search, todayOnly),
    queryFn: ({ pageParam }) => fetchStoreCheckins(search, todayOnly, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) =>
      lastPage.length === CHECKIN_PAGE_SIZE ? lastPage[lastPage.length - 1].checkedInAt : undefined,
    enabled: isApprovedStoreProfile(profile),
  });
}
