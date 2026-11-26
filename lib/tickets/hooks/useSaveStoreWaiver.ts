import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { saveStoreWaiver } from "@/lib/tickets/waiverMutations";
import { queryKeys } from "@/utils/queryKeys";

// Saves the store's waiver text (a change is a new version), then refreshes
// it and the form buyers see on the store page.
export function useSaveStoreWaiver() {
  const queryClient = useQueryClient();
  const { profile } = useAuthContext();
  const profileId = profile?.profile_id ?? "";

  return useMutation({
    mutationFn: saveStoreWaiver,
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.myStoreWaiver(profileId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.ticketWaiverForm(profileId) }),
      ]),
  });
}
