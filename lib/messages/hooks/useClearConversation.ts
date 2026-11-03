import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { queryKeys } from "@/utils/queryKeys";
import { clearConversation } from "../mutations";

export function useClearConversation(conversationId: string) {
  const { session } = useAuthContext();
  const viewerId = session?.user.id ?? null;
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => clearConversation(conversationId),
    onSettled: () => {
      queryClient.resetQueries({ queryKey: queryKeys.chatMessages(conversationId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.chatSummary(conversationId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.chatList(viewerId ?? "") });
      queryClient.invalidateQueries({ queryKey: queryKeys.chatUnreadCount(viewerId ?? "") });
    },
  });

  return { clear: mutation.mutate, isClearing: mutation.isPending };
}
