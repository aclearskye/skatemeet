import { useQuery } from "@tanstack/react-query";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { isApprovedStoreProfile } from "@/lib/storeAccounts/types";
import { fetchStoreTicketRequests } from "@/lib/tickets/requestQueries";
import { queryKeys } from "@/utils/queryKeys";

// The store's open refund and swap requests.
export function useStoreTicketRequests() {
  const { profile } = useAuthContext();
  return useQuery({
    queryKey: queryKeys.storeTicketRequests(profile?.profile_id ?? ""),
    queryFn: fetchStoreTicketRequests,
    enabled: isApprovedStoreProfile(profile),
  });
}
