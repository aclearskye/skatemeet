import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { useToast } from "@/lib/context/toast-context";
import { dmChatKey, isActiveChat } from "@/lib/shared/activeChat";
import { queryKeys } from "@/utils/queryKeys";
import { fetchChatSummary, type MessageRow } from "../queries";
import { chatDisplayName } from "../types";

// Returns a handler for a newly arrived DM row: shows a tappable in-app
// banner unless it's the viewer's own message, its chat is on screen, or
// the chat is muted.
export function useIncomingDmBanner() {
  const { session } = useAuthContext();
  const viewerId = session?.user.id ?? null;
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const router = useRouter();

  return useCallback(
    async (row: MessageRow) => {
      if (!viewerId || row.sender_id === viewerId) return;
      if (isActiveChat(dmChatKey(row.conversation_id))) return;
      try {
        const chat = await queryClient.fetchQuery({
          queryKey: queryKeys.chatSummary(row.conversation_id),
          queryFn: () => fetchChatSummary(row.conversation_id),
        });
        if (!chat || chat.muted || chat.otherState !== "active") return;
        showToast({
          label: chatDisplayName(chat).toUpperCase(),
          message: row.body ?? "Sent you a message",
          variant: "info",
          onPress: () => router.push(`/chat/${row.conversation_id}` as never),
        });
      } catch {
        // No banner; the Chats tab still shows it unread.
      }
    },
    [viewerId, queryClient, showToast, router]
  );
}
