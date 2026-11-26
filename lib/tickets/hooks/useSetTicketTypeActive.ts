import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { setTicketTypeActive } from "@/lib/tickets/mutations";
import type { OwnTicketType } from "@/lib/tickets/types";
import { queryKeys } from "@/utils/queryKeys";

type Vars = { ticketTypeId: string; active: boolean };

// Puts a ticket type on or off sale. Types are never deleted, because sold
// tickets point at them.
export function useSetTicketTypeActive() {
  const queryClient = useQueryClient();
  const { profile } = useAuthContext();
  const profileId = profile?.profile_id ?? "";
  const key = queryKeys.myTicketTypes(profileId);

  return useMutation({
    mutationFn: ({ ticketTypeId, active }: Vars) => setTicketTypeActive(ticketTypeId, active),
    onMutate: async ({ ticketTypeId, active }: Vars) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<OwnTicketType[]>(key);
      queryClient.setQueryData<OwnTicketType[]>(key, (types) =>
        types?.map((t) => (t.ticketTypeId === ticketTypeId ? { ...t, isActive: active } : t))
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: key }),
        queryClient.invalidateQueries({ queryKey: queryKeys.storeTickets(profileId) }),
      ]),
  });
}
