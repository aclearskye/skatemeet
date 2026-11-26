import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { cancelTicketRequest, requestTicketChange } from "@/lib/tickets/requestMutations";
import type { RequestOutcome, TicketRequestKind } from "@/lib/tickets/requestTypes";
import { queryKeys } from "@/utils/queryKeys";

type Vars =
  | { action: "request"; ticketId: string; kind: TicketRequestKind; swapTicketTypeId: string | null }
  | { action: "cancel"; requestId: string };

// The skater's side of a refund or swap request: ask, or take it back.
// Refreshes My tickets after.
export function useTicketRequest() {
  const queryClient = useQueryClient();
  const { profile } = useAuthContext();

  return useMutation({
    // A request resolves to what happened (done straight away when the
    // store auto-approves, or pending); a cancel to null.
    mutationFn: async (vars: Vars): Promise<RequestOutcome | null> => {
      if (vars.action === "cancel") {
        await cancelTicketRequest(vars.requestId);
        return null;
      }
      return requestTicketChange(vars.ticketId, vars.kind, vars.swapTicketTypeId);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.myTickets(profile?.profile_id ?? "") }),
  });
}
