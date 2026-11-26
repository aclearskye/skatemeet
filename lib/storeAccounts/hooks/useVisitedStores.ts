import { useQuery } from "@tanstack/react-query";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { fetchVisitedStores } from "@/lib/storeAccounts/queries";
import { queryKeys } from "@/utils/queryKeys";

// Stores the viewer has checked in at, most recent first (Stores tab, Visited).
export function useVisitedStores(enabled = true) {
  const { profile } = useAuthContext();
  return useQuery({
    queryKey: queryKeys.visitedStores(profile?.profile_id ?? ""),
    queryFn: fetchVisitedStores,
    enabled: !!profile && enabled,
  });
}
