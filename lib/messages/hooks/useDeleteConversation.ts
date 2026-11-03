import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { queryKeys } from "@/utils/queryKeys";
import { deleteConversation } from "../mutations";
import type { ChatListItem } from "../types";

export function useDeleteConversation(conversationId: string) {
  const { session } = useAuthContext();
  const viewerId = session?.user.id ?? null;
  const queryClient = useQueryClient();
  const listKey = queryKeys.chatList(viewerId ?? "");

  const mutation = useMutation({
    mutationFn: () => deleteConversation(conversationId),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: listKey });
      const previous = queryClient.getQueryData<ChatListItem[]>(listKey);
      queryClient.setQueryData<ChatListItem[]>(listKey, (old) =>
        old?.filter((chat) => chat.conversationId !== conversationId)
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(listKey, context.previous);
    },
    onSettled: () => {
      queryClient.removeQueries({ queryKey: queryKeys.chatMessages(conversationId) });
      queryClient.invalidateQueries({ queryKey: listKey });
      queryClient.invalidateQueries({ queryKey: queryKeys.chatUnreadCount(viewerId ?? "") });
    },
  });

  return { deleteChat: mutation.mutate, isDeleting: mutation.isPending };
}
