import { unbanUser } from "@/lib/admin/mutations";
import { queryKeys } from "@/utils/queryKeys";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useUnbanUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (profileId: string) => unbanUser(profileId),
    onSuccess: (_result, profileId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminBanHistory(profileId) });
    },
  });
}
