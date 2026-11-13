import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { queryKeys } from "@/utils/queryKeys";
import { setConversationMuted } from "../mutations";
import type { ChatListItem } from "../types";

// Optimistic: the bell icon flips on the card straight away.
export function useSetConversationMuted(conversationId: string) {
  const { session } = useAuthContext();
  const queryClient = useQueryClient();
  const listKey = queryKeys.chatList(session?.user.id ?? "");

  const mutation = useMutation({
    mutationFn: (muted: boolean) => setConversationMuted(conversationId, muted),
    onMutate: async (muted) => {
      await queryClient.cancelQueries({ queryKey: listKey });
      const previous = queryClient.getQueryData<ChatListItem[]>(listKey);
      queryClient.setQueryData<ChatListItem[]>(listKey, (old) =>
        old?.map((chat) => (chat.conversationId === conversationId ? { ...chat, muted } : chat))
      );
      return { previous };
    },
    onError: (_err, _muted, context) => {
      if (context?.previous) queryClient.setQueryData(listKey, context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: listKey });
      queryClient.invalidateQueries({ queryKey: queryKeys.chatSummary(conversationId) });
    },
  });

  return { setMuted: mutation.mutate, isSettingMuted: mutation.isPending };
}
