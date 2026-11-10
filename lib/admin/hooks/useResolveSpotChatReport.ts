import { useMutation, useQueryClient } from "@tanstack/react-query";
import { dismissSpotChatReport, removeSpotChatMessage } from "@/lib/admin/spotChatReportMutations";
import { queryKeys } from "@/utils/queryKeys";

type ResolveVars =
  | { action: "dismiss"; reportId: string }
  | { action: "remove"; messageId: string };

export function useResolveSpotChatReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (vars: ResolveVars) =>
      vars.action === "dismiss" ? dismissSpotChatReport(vars.reportId) : removeSpotChatMessage(vars.messageId),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminSpotChatReports() });
    },
  });
}
