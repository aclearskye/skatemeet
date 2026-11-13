import { useInfiniteQuery } from "@tanstack/react-query";
import { useAuthContext } from "@/lib/context/use-auth-context";
import type { Coordinates } from "@/lib/map/types";
import { searchNearbySkaters } from "@/lib/nearby/queries";
import { nearbySearchErrorCode, roundSearchCoords } from "@/lib/nearby/types";
import { NEARBY_PAGE_SIZE } from "@/utils/constants";
import { queryKeys } from "@/utils/queryKeys";

// Skaters near `location`, a page at a time as the list is scrolled.
export function useNearbySkaters(location: Coordinates | null) {
  const { session } = useAuthContext();
  const viewerId = session?.user.id ?? null;
  const rounded = location ? roundSearchCoords(location) : null;

  const query = useInfiniteQuery({
    queryKey: queryKeys.nearbySkaters(viewerId ?? "", rounded ?? { lat: 0, lng: 0 }),
    queryFn: ({ pageParam }) => searchNearbySkaters(rounded!, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => (lastPage.length < NEARBY_PAGE_SIZE ? undefined : allPages.length),
    enabled: viewerId != null && rounded != null,
    staleTime: 5 * 60_000,
    // Retrying a rate limit or an ineligible account only fails again.
    retry: (failureCount, error) => nearbySearchErrorCode(error) === "UNKNOWN" && failureCount < 2,
  });

  return {
    results: query.data?.pages.flat() ?? [],
    isLoading: query.isPending && rounded != null,
    isError: query.isError,
    errorCode: query.isError ? nearbySearchErrorCode(query.error) : null,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    fetchNextPage: query.fetchNextPage,
    refetch: query.refetch,
  };
}
