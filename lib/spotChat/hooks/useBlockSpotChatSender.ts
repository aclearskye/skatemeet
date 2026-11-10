import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { queryKeys } from "@/utils/queryKeys";
import { blockSpotChatSender } from "../mutations";

// A normal, app-wide block (block_profile) made from a message, since the
// viewer never learns who sent it.
export function useBlockSpotChatSender(roomId: string | null) {
  const { session } = useAuthContext();
  const viewerId = session?.user.id ?? null;
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (messageId: string) => blockSpotChatSender(messageId),
    onSettled: () => {
      if (roomId) queryClient.invalidateQueries({ queryKey: queryKeys.spotChatMessages(roomId) });
      if (!viewerId) return;
      // Same fan-out as useBlockProfile: friendships and DMs change too.
      queryClient.invalidateQueries({ queryKey: queryKeys.myBlocks(viewerId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.friendsList(viewerId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.chatList(viewerId) });
      queryClient.invalidateQueries({ queryKey: ["profile", viewerId, "friendStatus"] });
      queryClient.invalidateQueries({ queryKey: ["profile", viewerId, "blockStatus"] });
    },
  });

  return { blockSender: mutation.mutate, isBlocking: mutation.isPending };
}
