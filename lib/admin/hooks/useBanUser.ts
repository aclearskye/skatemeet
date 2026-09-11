import { banUser } from "@/lib/admin/mutations";
import { queryKeys } from "@/utils/queryKeys";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useBanUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ profileId, reason }: { profileId: string; reason: string }) =>
      banUser(profileId, reason),
    onSuccess: (_result, { profileId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminBanHistory(profileId) });
      // admin_ban_user auto-resolves any open profile_reports on the banned
      // profile as a side effect (see the report+ban migration's comment).
      queryClient.invalidateQueries({ queryKey: queryKeys.adminProfileReports() });
    },
  });
}
