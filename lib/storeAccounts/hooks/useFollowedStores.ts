import { useQuery } from "@tanstack/react-query";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { fetchFollowedStores } from "@/lib/storeAccounts/queries";
import { queryKeys } from "@/utils/queryKeys";

// The approved stores the viewer follows (Stores tab, Following).
export function useFollowedStores(enabled = true) {
  const { profile } = useAuthContext();
  return useQuery({
    queryKey: queryKeys.followedStores(profile?.profile_id ?? ""),
    queryFn: fetchFollowedStores,
    enabled: !!profile && enabled,
  });
}
