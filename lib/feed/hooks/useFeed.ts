import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchFeedPage } from "@/lib/feed/queries";
import type { FeedCursor, FeedTab } from "@/lib/feed/types";
import { getCachedLocation } from "@/lib/map/locationCache";
import type { Coordinates } from "@/lib/map/types";
import { queryKeys } from "@/utils/queryKeys";

// asOf is pinned so keyset pages line up. It lives in the query cache rather
// than component state so the upload queue can re-pin it when your own post
// goes live (invalidating feedAsOfBase); pull-to-refresh does the same.
export function useFeed(tab: FeedTab) {
  const queryClient = useQueryClient();
  const { data: asOf = "" } = useQuery({
    queryKey: queryKeys.feedAsOf(tab),
    queryFn: () => new Date().toISOString(),
    initialData: () => new Date().toISOString(),
    staleTime: Infinity,
  });

  const { data: location, isFetched: locationReady } = useQuery({
    queryKey: queryKeys.cachedLocation(),
    queryFn: async (): Promise<Coordinates | null> => {
      const cached = await getCachedLocation();
      return cached ? { lat: cached.latitude, lng: cached.longitude } : null;
    },
  });

  const query = useInfiniteQuery({
    queryKey: queryKeys.feed(tab, asOf),
    queryFn: ({ pageParam }) => fetchFeedPage(tab, location ?? null, asOf, pageParam),
    initialPageParam: null as FeedCursor | null,
    getNextPageParam: (last) => last.nextCursor,
    enabled: locationReady,
  });

  return {
    posts: query.data?.pages.flatMap((p) => p.posts) ?? [],
    isLoading: query.isLoading || !locationReady,
    isError: query.isError,
    isRefreshing: query.isRefetching && !query.isFetchingNextPage,
    hasMore: !!query.hasNextPage,
    loadMore: () => query.hasNextPage && !query.isFetchingNextPage && query.fetchNextPage(),
    refresh: () => queryClient.invalidateQueries({ queryKey: queryKeys.feedAsOf(tab) }),
  };
}
