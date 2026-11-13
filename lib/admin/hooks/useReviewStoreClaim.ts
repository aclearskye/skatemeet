import { useMutation, useQueryClient } from "@tanstack/react-query";
import { reviewStoreClaim } from "@/lib/admin/storeClaimMutations";
import { queryKeys } from "@/utils/queryKeys";

export function useReviewStoreClaim() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: reviewStoreClaim,
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminStoreClaims() });
    },
  });
}
