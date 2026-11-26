import { useQuery } from "@tanstack/react-query";
import { fetchStoreShop } from "@/lib/commerce/queries";
import { queryKeys } from "@/utils/queryKeys";

// Whether a store has a shop, and whether this viewer can buy from it.
export function useStoreShop(storeOwnerId: string | null) {
  return useQuery({
    queryKey: queryKeys.storeShop(storeOwnerId ?? ""),
    queryFn: () => fetchStoreShop(storeOwnerId!),
    enabled: storeOwnerId != null,
  });
}
