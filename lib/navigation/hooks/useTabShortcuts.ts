import { useQuery } from "@tanstack/react-query";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { fetchTabShortcuts } from "@/lib/navigation/queries";
import { resolveTabKeys, type TabShortcutKey } from "@/lib/navigation/types";
import { useMyStorePage } from "@/lib/storeAccounts/hooks/useMyStorePage";
import { isApprovedStoreProfile } from "@/lib/storeAccounts/types";
import { queryKeys } from "@/utils/queryKeys";

// The bottom bar's tabs for this account on this device: what the user
// picked in Settings, or the default bar (with Scan for a store that sells
// tickets first). customised: whether they've changed it.
// isLoaded: the saved choice has been read from the device.
export function useTabShortcuts(): {
  keys: TabShortcutKey[];
  customised: boolean;
  isApprovedStore: boolean;
  isLoaded: boolean;
} {
  const { profile } = useAuthContext();
  const profileId = profile?.profile_id ?? "";
  const isApprovedStore = isApprovedStoreProfile(profile);
  const { data: storePage } = useMyStorePage();
  const { data: saved = null, isSuccess } = useQuery({
    queryKey: queryKeys.tabShortcuts(profileId),
    queryFn: () => fetchTabShortcuts(profileId),
    enabled: profileId !== "",
    staleTime: Infinity,
  });
  const scanByDefault = storePage?.style.featuredSection === "tickets";
  return {
    keys: resolveTabKeys(saved, isApprovedStore, scanByDefault),
    customised: saved != null,
    isApprovedStore,
    isLoaded: isSuccess,
  };
}
