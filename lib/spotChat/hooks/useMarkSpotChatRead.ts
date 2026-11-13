import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { queryKeys } from "@/utils/queryKeys";
import { markSpotChatRead } from "../mutations";

// While a spot chat is open, marks it read whenever its newest message
// changes, so the Chats tab's unread dot clears. Best-effort: a failure
// only leaves the dot showing until the next open.
export function useMarkSpotChatRead(roomId: string | null, isMember: boolean, newestMessageId: string | null) {
  const { session } = useAuthContext();
  const viewerId = session?.user.id ?? "";
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!roomId || !isMember) return;
    markSpotChatRead(roomId)
      .then(() => queryClient.invalidateQueries({ queryKey: queryKeys.mySpotChats(viewerId) }))
      .catch(() => {});
  }, [roomId, isMember, newestMessageId, viewerId, queryClient]);
}
