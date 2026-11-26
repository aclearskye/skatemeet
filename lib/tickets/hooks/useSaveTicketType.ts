import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { saveTicketType } from "@/lib/tickets/mutations";
import type { SaveTicketTypePayload } from "@/lib/tickets/types";
import { queryKeys } from "@/utils/queryKeys";

// Creates or edits a ticket type, then refreshes the store's list and its
// public page.
export function useSaveTicketType() {
  const queryClient = useQueryClient();
  const { profile } = useAuthContext();
  const profileId = profile?.profile_id ?? "";

  return useMutation({
    mutationFn: (payload: SaveTicketTypePayload) => saveTicketType(payload),
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.myTicketTypes(profileId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.storeTickets(profileId) }),
      ]),
  });
}
