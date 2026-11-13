import { useQuery } from "@tanstack/react-query";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { fetchMyStorePage } from "@/lib/storeAccounts/queries";
import { isApprovedStoreProfile } from "@/lib/storeAccounts/types";
import { queryKeys } from "@/utils/queryKeys";

// The approved owner's own page, for the store page editor.
export function useMyStorePage() {
  const { profile } = useAuthContext();
  return useQuery({
    queryKey: queryKeys.myStorePage(profile?.profile_id ?? ""),
    queryFn: fetchMyStorePage,
    enabled: isApprovedStoreProfile(profile),
  });
}
