import { useQuery } from "@tanstack/react-query";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { fetchMyStorefront } from "@/lib/commerce/queries";
import { isApprovedStoreProfile } from "@/lib/storeAccounts/types";
import { queryKeys } from "@/utils/queryKeys";

// The approved store's own platform connection.
export function useMyStorefront() {
  const { profile } = useAuthContext();
  return useQuery({
    queryKey: queryKeys.myStorefront(profile?.profile_id ?? ""),
    queryFn: fetchMyStorefront,
    enabled: isApprovedStoreProfile(profile),
  });
}
