import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { setTicketRequestRules } from "@/lib/tickets/requestMutations";
import type { MyTicketing } from "@/lib/tickets/types";
import { queryKeys } from "@/utils/queryKeys";

type Vars = { autoApproveSwaps: boolean; autoRefundMaxMinor: number | null };

// Saves the store's auto-approve rules for refund and swap requests.
export function useSetTicketRequestRules() {
  const queryClient = useQueryClient();
  const { profile } = useAuthContext();
  const key = queryKeys.myTicketing(profile?.profile_id ?? "");

  return useMutation({
    mutationFn: ({ autoApproveSwaps, autoRefundMaxMinor }: Vars) =>
      setTicketRequestRules(autoApproveSwaps, autoRefundMaxMinor),
    onMutate: async (vars: Vars) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<MyTicketing | null>(key);
      if (previous) queryClient.setQueryData<MyTicketing>(key, { ...previous, ...vars });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous !== undefined) queryClient.setQueryData(key, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });
}
