import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { setTicketingUnder18 } from "@/lib/tickets/mutations";
import type { MyTicketing } from "@/lib/tickets/types";
import { queryKeys } from "@/utils/queryKeys";

// Turns under-18 ticket sales on or off for the store.
export function useSetTicketingUnder18() {
  const queryClient = useQueryClient();
  const { profile } = useAuthContext();
  const key = queryKeys.myTicketing(profile?.profile_id ?? "");

  return useMutation({
    mutationFn: setTicketingUnder18,
    onMutate: async (allow: boolean) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<MyTicketing | null>(key);
      if (previous) queryClient.setQueryData<MyTicketing>(key, { ...previous, allowUnder18: allow });
      return { previous };
    },
    onError: (_err, _allow, context) => {
      if (context?.previous !== undefined) queryClient.setQueryData(key, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });
}
