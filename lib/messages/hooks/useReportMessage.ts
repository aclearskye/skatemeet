import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { queryKeys } from "@/utils/queryKeys";
import { reportMessage, type ReportMessageInput } from "../mutations";

export function useReportMessage(conversationId: string) {
  const { session } = useAuthContext();
  const viewerId = session?.user.id ?? null;
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (input: ReportMessageInput) => reportMessage(input),
    onSettled: (_data, _err, { block }) => {
      if (!block || !viewerId) return;
      // Blocking from the report flow also locks the chat and drops the
      // friendship, so refresh everything that shows either.
      queryClient.invalidateQueries({ queryKey: queryKeys.chatSummary(conversationId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.chatList(viewerId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.friendsList(viewerId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.myBlocks(viewerId) });
      queryClient.invalidateQueries({ queryKey: ["profile", viewerId, "friendStatus"] });
      queryClient.invalidateQueries({ queryKey: ["profile", viewerId, "blockStatus"] });
    },
  });

  return { report: mutation.mutate, isReporting: mutation.isPending };
}
