import { approveVerificationRequest } from "@/lib/admin/mutations";
import { queryKeys } from "@/utils/queryKeys";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useApproveVerificationRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: approveVerificationRequest,
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminVerificationQueue() });
    },
  });
}
