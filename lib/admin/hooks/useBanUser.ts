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
      // profile, and any message reports against them, as a side effect.
      queryClient.invalidateQueries({ queryKey: queryKeys.adminProfileReports() });
      queryClient.invalidateQueries({ queryKey: queryKeys.adminMessageReports() });
    },
  });
}
