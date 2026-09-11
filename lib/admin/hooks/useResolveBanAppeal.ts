import { resolveBanAppeal } from "@/lib/admin/mutations";
import { queryKeys } from "@/utils/queryKeys";
import { useMutation, useQueryClient } from "@tanstack/react-query";

type Variables = {
  appealId: string;
  profileId: string;
  decision: "reinstated" | "denied";
};

export function useResolveBanAppeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ appealId, profileId, decision }: Variables) =>
      resolveBanAppeal(appealId, profileId, decision),
    onSettled: (_result, _error, { profileId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminBanAppeals() });
      queryClient.invalidateQueries({ queryKey: queryKeys.adminBanHistory(profileId) });
    },
  });
}
