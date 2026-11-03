import { dismissMessageReport, removeMessage } from "@/lib/admin/messageReportMutations";
import { queryKeys } from "@/utils/queryKeys";
import { useMutation, useQueryClient } from "@tanstack/react-query";

type ResolveVars =
  | { action: "dismiss"; reportId: string }
  | { action: "remove"; messageId: string };

export function useResolveMessageReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (vars: ResolveVars) =>
      vars.action === "dismiss" ? dismissMessageReport(vars.reportId) : removeMessage(vars.messageId),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminMessageReports() });
    },
  });
}
