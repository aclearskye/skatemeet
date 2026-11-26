import { useQuery } from "@tanstack/react-query";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { isApprovedStoreProfile } from "@/lib/storeAccounts/types";
import { fetchMyStoreWaiver } from "@/lib/tickets/waiverQueries";
import { queryKeys } from "@/utils/queryKeys";

// The store's current waiver text, or null before it writes one.
export function useMyStoreWaiver() {
  const { profile } = useAuthContext();
  return useQuery({
    queryKey: queryKeys.myStoreWaiver(profile?.profile_id ?? ""),
    queryFn: fetchMyStoreWaiver,
    enabled: isApprovedStoreProfile(profile),
  });
}
