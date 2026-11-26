import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { resolveTicketRequest } from "@/lib/tickets/requestMutations";
import type { ResolveRequestAction } from "@/lib/tickets/requestTypes";
import { queryKeys } from "@/utils/queryKeys";

type Vars = { requestId: string; action: ResolveRequestAction };

// The store refunds, swaps or declines a request, then refreshes the list
// and its ticketing status (the open-request count).
export function useResolveTicketRequest() {
  const queryClient = useQueryClient();
  const { profile } = useAuthContext();
  const profileId = profile?.profile_id ?? "";

  return useMutation({
    mutationFn: ({ requestId, action }: Vars) => resolveTicketRequest(requestId, action),
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.storeTicketRequests(profileId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.myTicketing(profileId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.myTicketTypes(profileId) }),
      ]),
  });
}
