import { approveHeldPost, flagSuspectedCsam, removeHeldPost } from "@/lib/admin/postModerationMutations";
import { queryKeys } from "@/utils/queryKeys";
import { useMutation, useQueryClient } from "@tanstack/react-query";

type Vars =
  | { action: "approve"; postId: string }
  | { action: "remove"; postId: string; reason: string | null }
  | { action: "csam"; postId: string };

export function useModerateHeldPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (vars: Vars) => {
      if (vars.action === "approve") return approveHeldPost(vars.postId);
      if (vars.action === "remove") return removeHeldPost(vars.postId, vars.reason);
      return flagSuspectedCsam(vars.postId);
    },
    onSettled: (_data, _error, vars) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminHeldPosts() });
      if (vars.action === "csam") {
        queryClient.invalidateQueries({ queryKey: queryKeys.adminCsamHolds() });
      }
    },
  });
}
