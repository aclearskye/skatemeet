import { useInfiniteQuery } from "@tanstack/react-query";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { isApprovedStoreProfile } from "@/lib/storeAccounts/types";
import { fetchStoreWaivers, WAIVER_PAGE_SIZE } from "@/lib/tickets/waiverExportQueries";
import { queryKeys } from "@/utils/queryKeys";

// The store's signed waivers, 50 at a time, searchable by name.
export function useStoreWaivers(search: string) {
  const { profile } = useAuthContext();
  return useInfiniteQuery({
    queryKey: queryKeys.storeWaivers(profile?.profile_id ?? "", search),
    queryFn: ({ pageParam }) => fetchStoreWaivers(search, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) =>
      lastPage.length === WAIVER_PAGE_SIZE ? lastPage[lastPage.length - 1].signedAt : undefined,
    enabled: isApprovedStoreProfile(profile),
  });
}
