import { useQuery } from "@tanstack/react-query";
import { fetchStorePage } from "@/lib/storeAccounts/queries";
import { queryKeys } from "@/utils/queryKeys";

// The owner's layer of a store page. Null data means nobody owns the store.
export function useStorePage(storeId: string | null, osmPlaceId: string | null) {
  return useQuery({
    queryKey: queryKeys.storePage(storeId, osmPlaceId),
    queryFn: () => fetchStorePage(storeId, osmPlaceId),
    enabled: storeId != null || osmPlaceId != null,
  });
}
