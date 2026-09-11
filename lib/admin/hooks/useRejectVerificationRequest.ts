import { rejectVerificationRequest } from "@/lib/admin/mutations";
import { queryKeys } from "@/utils/queryKeys";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useRejectVerificationRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: rejectVerificationRequest,
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminVerificationQueue() });
    },
  });
}
