import { useQuery } from "@tanstack/react-query";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { isApprovedStoreProfile } from "@/lib/storeAccounts/types";
import { fetchMyTicketTypes } from "@/lib/tickets/queries";
import { queryKeys } from "@/utils/queryKeys";

// Every ticket the store has made, on sale or not, with how many have sold.
export function useMyTicketTypes() {
  const { profile } = useAuthContext();
  return useQuery({
    queryKey: queryKeys.myTicketTypes(profile?.profile_id ?? ""),
    queryFn: fetchMyTicketTypes,
    enabled: isApprovedStoreProfile(profile),
  });
}
