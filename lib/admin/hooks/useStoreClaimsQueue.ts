import { useQuery } from "@tanstack/react-query";
import { fetchStoreClaimsQueue } from "@/lib/admin/storeClaimQueries";
import { queryKeys } from "@/utils/queryKeys";

export function useStoreClaimsQueue() {
  return useQuery({
    queryKey: queryKeys.adminStoreClaims(),
    queryFn: fetchStoreClaimsQueue,
  });
}
