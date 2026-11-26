import { useQuery } from "@tanstack/react-query";
import { fetchStoreProduct } from "@/lib/commerce/queries";
import { queryKeys } from "@/utils/queryKeys";

export function useStoreProduct(storeOwnerId: string, productId: string | null) {
  return useQuery({
    queryKey: queryKeys.storeProduct(storeOwnerId, productId ?? ""),
    queryFn: () => fetchStoreProduct(storeOwnerId, productId!),
    enabled: productId != null,
    staleTime: 60 * 1000,
  });
}
