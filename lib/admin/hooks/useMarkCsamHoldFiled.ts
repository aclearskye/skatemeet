import { markCsamHoldFiled } from "@/lib/admin/postModerationMutations";
import { queryKeys } from "@/utils/queryKeys";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useMarkCsamHoldFiled() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ holdId, reference }: { holdId: string; reference: string }) =>
      markCsamHoldFiled(holdId, reference),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminCsamHolds() });
    },
  });
}
