import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { queryKeys } from "@/utils/queryKeys";
import { markConversationRead } from "../mutations";
import type { ChatListItem } from "../types";

export function useMarkConversationRead(conversationId: string | undefined) {
  const { session } = useAuthContext();
  const viewerId = session?.user.id ?? null;
  const queryClient = useQueryClient();
  const listKey = queryKeys.chatList(viewerId ?? "");

  const mutation = useMutation({
    mutationFn: () => markConversationRead(conversationId!),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: listKey });
      const previous = queryClient.getQueryData<ChatListItem[]>(listKey);
      queryClient.setQueryData<ChatListItem[]>(listKey, (old) =>
        old?.map((chat) => (chat.conversationId === conversationId ? { ...chat, unreadCount: 0 } : chat))
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(listKey, context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: listKey });
      queryClient.invalidateQueries({ queryKey: queryKeys.chatUnreadCount(viewerId ?? "") });
    },
  });

  return {
    markRead: () => {
      if (conversationId && viewerId) mutation.mutate();
    },
  };
}
