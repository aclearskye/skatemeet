import { useQuery } from "@tanstack/react-query";
import { fetchStoreForProfile } from "@/lib/storeAccounts/queries";
import { queryKeys } from "@/utils/queryKeys";

// The store an approved Store account owns. Disabled unless the profile is
// known to be a Store account.
export function useStoreForProfile(profileId: string | null, isStoreAccount: boolean) {
  return useQuery({
    queryKey: queryKeys.storeForProfile(profileId ?? ""),
    queryFn: () => fetchStoreForProfile(profileId!),
    enabled: profileId != null && isStoreAccount,
  });
}
