import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { updateStorePage } from "@/lib/storeAccounts/mutations";
import type { UpdateStorePagePayload } from "@/lib/storeAccounts/types";
import { queryKeys } from "@/utils/queryKeys";

// Saves the page, then refreshes the editor, the public page and the
// account's profile (its display name and avatar follow the page).
export function useUpdateStorePage() {
  const queryClient = useQueryClient();
  const { profile, refreshProfile } = useAuthContext();

  return useMutation({
    mutationFn: (payload: UpdateStorePagePayload) => updateStorePage(payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.myStorePage(profile?.profile_id ?? "") }),
        queryClient.invalidateQueries({ queryKey: ["store"] }),
        refreshProfile(),
      ]);
    },
  });
}
