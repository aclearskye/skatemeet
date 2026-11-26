import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchStoreProducts } from "@/lib/commerce/queries";
import { queryKeys } from "@/utils/queryKeys";

// A store's products, live from its platform, a page at a time.
export function useStoreProducts(storeOwnerId: string | null, query: string, enabled = true) {
  return useInfiniteQuery({
    queryKey: queryKeys.storeProducts(storeOwnerId ?? "", query),
    queryFn: ({ pageParam }) => fetchStoreProducts(storeOwnerId!, query, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    enabled: storeOwnerId != null && enabled,
    staleTime: 2 * 60 * 1000,
  });
}
