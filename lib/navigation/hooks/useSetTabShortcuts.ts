import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { saveTabShortcuts } from "@/lib/navigation/mutations";
import type { TabShortcutKey } from "@/lib/navigation/types";
import { queryKeys } from "@/utils/queryKeys";

// Saves the bottom bar's tabs (null: back to the default) and updates the
// bar straight away.
export function useSetTabShortcuts() {
  const queryClient = useQueryClient();
  const { profile } = useAuthContext();
  const key = queryKeys.tabShortcuts(profile?.profile_id ?? "");

  return useMutation({
    mutationFn: (keys: TabShortcutKey[] | null) => saveTabShortcuts(profile?.profile_id ?? "", keys),
    onMutate: (keys: TabShortcutKey[] | null) => {
      const previous = queryClient.getQueryData<TabShortcutKey[] | null>(key);
      queryClient.setQueryData(key, keys);
      return { previous };
    },
    onError: (_err, _keys, context) => queryClient.setQueryData(key, context?.previous ?? null),
  });
}
