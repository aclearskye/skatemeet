import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { queryKeys } from "@/utils/queryKeys";
import { reportSpotChatMessage, type ReportSpotChatMessageInput } from "../mutations";

export function useReportSpotChatMessage(roomId: string | null) {
  const { session } = useAuthContext();
  const viewerId = session?.user.id ?? null;
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (input: ReportSpotChatMessageInput) => reportSpotChatMessage(input),
    onSettled: (_data, _err, { block }) => {
      if (!block) return;
      if (roomId) queryClient.invalidateQueries({ queryKey: queryKeys.spotChatMessages(roomId) });
      if (!viewerId) return;
      queryClient.invalidateQueries({ queryKey: queryKeys.myBlocks(viewerId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.friendsList(viewerId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.chatList(viewerId) });
      queryClient.invalidateQueries({ queryKey: ["profile", viewerId, "friendStatus"] });
      queryClient.invalidateQueries({ queryKey: ["profile", viewerId, "blockStatus"] });
    },
  });

  return { report: mutation.mutate, isReporting: mutation.isPending };
}
