import { useMutation, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { queryKeys } from "@/utils/queryKeys";
import { sendMessage } from "../mutations";
import type { Message, MessagePage } from "../types";

type Pages = InfiniteData<MessagePage, string | null>;

function prepend(old: Pages | undefined, message: Message): Pages | undefined {
  if (!old) return old;
  const [first, ...rest] = old.pages;
  return { ...old, pages: [{ ...first, messages: [message, ...first.messages] }, ...rest] };
}

function replace(old: Pages | undefined, tempId: string, message: Message | null): Pages | undefined {
  if (!old) return old;
  return {
    ...old,
    pages: old.pages.map((page) => ({
      ...page,
      messages: page.messages.flatMap((m) => {
        if (m.messageId === tempId) return message ? [message] : [];
        // Realtime may have delivered the real row first -- drop the dupe.
        if (message && m.messageId === message.messageId) return [];
        return [m];
      }),
    })),
  };
}

export function useSendMessage(conversationId: string) {
  const { session } = useAuthContext();
  const viewerId = session?.user.id ?? null;
  const queryClient = useQueryClient();
  const threadKey = queryKeys.chatMessages(conversationId);

  const mutation = useMutation({
    mutationFn: ({ body }: { body: string; tempId: string }) => sendMessage(conversationId, body),
    onMutate: async ({ body, tempId }) => {
      await queryClient.cancelQueries({ queryKey: threadKey });
      const optimistic: Message = {
        messageId: tempId,
        conversationId,
        senderId: viewerId ?? "",
        kind: "text",
        body,
        createdAt: new Date().toISOString(),
        isPending: true,
      };
      queryClient.setQueryData<Pages>(threadKey, (old) => prepend(old, optimistic));
    },
    onSuccess: (message, { tempId }) => {
      queryClient.setQueryData<Pages>(threadKey, (old) => replace(old, tempId, message));
    },
    onError: (_err, { tempId }) => {
      queryClient.setQueryData<Pages>(threadKey, (old) => replace(old, tempId, null));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chatList(viewerId ?? "") });
      queryClient.invalidateQueries({ queryKey: queryKeys.chatSummary(conversationId) });
    },
  });

  return {
    send: (body: string, options?: { onError?: (err: Error) => void }) =>
      mutation.mutate({ body, tempId: `pending-${Date.now()}-${Math.random().toString(36).slice(2)}` }, options),
    isSending: mutation.isPending,
  };
}
