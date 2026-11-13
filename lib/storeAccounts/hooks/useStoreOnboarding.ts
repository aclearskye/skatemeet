import { useQuery } from "@tanstack/react-query";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { fetchStoreOnboarding } from "@/lib/storeAccounts/queries";
import { queryKeys } from "@/utils/queryKeys";

// The Store dashboard's server state: business details, public details and
// the latest claim. Only runs for Store accounts.
export function useStoreOnboarding() {
  const { profile } = useAuthContext();
  const profileId = profile?.profile_id ?? "";

  return useQuery({
    queryKey: queryKeys.storeOnboarding(profileId),
    queryFn: fetchStoreOnboarding,
    enabled: profile?.account_type === "store",
  });
}
