import { useQuery } from "@tanstack/react-query";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { fetchMyStoreBilling } from "@/lib/storeAccounts/billingQueries";
import { queryKeys } from "@/utils/queryKeys";

// The Store account's own billing state. Only runs for Store accounts.
export function useStoreBilling() {
  const { profile } = useAuthContext();
  return useQuery({
    queryKey: queryKeys.storeBilling(profile?.profile_id ?? ""),
    queryFn: fetchMyStoreBilling,
    enabled: profile?.account_type === "store",
  });
}
