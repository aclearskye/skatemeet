import { useEffect } from "react";
import { useQueryClient, type InfiniteData, type QueryClient } from "@tanstack/react-query";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { supabase } from "@/lib/supabaseClient";
import { queryKeys } from "@/utils/queryKeys";
import { toMessage, type MessageRow } from "../queries";
import type { ChatListItem, MessagePage } from "../types";

type Pages = InfiniteData<MessagePage, string | null>;

type FriendRequestRow = {
  requester_id: string;
  recipient_id: string;
  status: string;
};

type MemberRow = {
  conversation_id: string;
  profile_id: string;
  last_read_at: string | null;
};

function isThreadKey(key: readonly unknown[]): boolean {
  return key[0] === "chat" && key[2] === "messages";
}

function addMessage(queryClient: QueryClient, row: MessageRow) {
  const message = toMessage(row);
  queryClient.setQueryData<Pages>(queryKeys.chatMessages(message.conversationId), (old) => {
    if (!old) return old;
    const exists = old.pages.some((page) => page.messages.some((m) => m.messageId === message.messageId));
    if (exists) return old;
    const [first, ...rest] = old.pages;
    return { ...old, pages: [{ ...first, messages: [message, ...first.messages] }, ...rest] };
  });
}

function removeMessage(queryClient: QueryClient, messageId: string) {
  queryClient.setQueriesData<Pages>({ predicate: (query) => isThreadKey(query.queryKey) }, (old) =>
    old
      ? {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            messages: page.messages.filter((m) => m.messageId !== messageId),
          })),
        }
      : old
  );
}

// One channel per signed-in user. postgres_changes applies the user's RLS,
// so only messages (and member read positions) they could SELECT arrive.
// Mounted once in app/_layout.tsx.
export function useChatRealtime() {
  const { session } = useAuthContext();
  const viewerId = session?.user.id ?? null;
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!viewerId) return;

    const refreshLists = () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chatList(viewerId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.chatUnreadCount(viewerId) });
    };

    const channel = supabase
      .channel(`chats:${viewerId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const row = payload.new as MessageRow;
        addMessage(queryClient, row);
        queryClient.invalidateQueries({ queryKey: queryKeys.chatSummary(row.conversation_id) });
        refreshLists();
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "messages" }, (payload) => {
        // Deletes carry only the primary key (an admin removal or cleanup).
        const messageId = (payload.old as { message_id?: string }).message_id;
        if (messageId) removeMessage(queryClient, messageId);
        refreshLists();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "conversation_members" }, (payload) => {
        const row = payload.new as MemberRow;
        if (row.profile_id === viewerId) {
          // Read on another device.
          refreshLists();
          return;
        }
        queryClient.setQueryData(queryKeys.chatReadReceipt(row.conversation_id), row.last_read_at);
        queryClient.setQueryData<ChatListItem[]>(queryKeys.chatList(viewerId), (old) =>
          old?.map((chat) =>
            chat.conversationId === row.conversation_id ? { ...chat, otherLastReadAt: row.last_read_at } : chat
          )
        );
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "conversation_members" }, () => {
        // The other side deactivated -- their card turns "unavailable" and
        // an open thread locks. Delete events carry only the key, so which
        // conversation it was isn't known here.
        refreshLists();
        queryClient.invalidateQueries({
          predicate: (query) => query.queryKey[0] === "chat" && query.queryKey[2] === "summary",
        });
      })
      // An accepted request adds a "Say Hi" card to both lists -- the
      // accepter's own client refreshes via useRespondToFriendRequest; this
      // covers the requester. Filtered to rows naming the viewer (deletes
      // can't be filtered, so unfriending isn't listened for here).
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "friend_requests", filter: `requester_id=eq.${viewerId}` },
        (payload) => {
          const row = payload.new as FriendRequestRow;
          if (row.status !== "accepted") return;
          queryClient.invalidateQueries({ queryKey: queryKeys.chatList(viewerId) });
          queryClient.invalidateQueries({ queryKey: queryKeys.friendsList(viewerId) });
          queryClient.invalidateQueries({ queryKey: queryKeys.friendStatus(viewerId, row.recipient_id) });
          queryClient.invalidateQueries({ queryKey: queryKeys.userProfile(row.recipient_id) });
          queryClient.invalidateQueries({ queryKey: queryKeys.profileStats(viewerId) });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [viewerId, queryClient]);
}
