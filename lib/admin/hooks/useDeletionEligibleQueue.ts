import { fetchDeletionEligible } from "@/lib/admin/queries";
import { queryKeys } from "@/utils/queryKeys";
import { useQuery } from "@tanstack/react-query";

export function useDeletionEligibleQueue() {
  return useQuery({
    queryKey: queryKeys.adminDeletionEligible(),
    queryFn: fetchDeletionEligible,
  });
}
