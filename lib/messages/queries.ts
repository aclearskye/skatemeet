import { supabase } from "@/lib/supabaseClient";
import { MESSAGE_PAGE_SIZE, type ChatListItem, type ChatOtherState, type Message, type MessageKind, type MessagePage } from "./types";

type ChatRow = {
  conversation_id: string | null;
  other_profile_id: string | null;
  other_username: string | null;
  other_display_name: string | null;
  other_avatar_url: string | null;
  other_state: ChatOtherState;
  other_last_read_at: string | null;
  last_message_id: string | null;
  last_message_body: string | null;
  last_message_sender: string | null;
  last_message_at: string | null;
  unread_count: number;
  can_message: boolean;
  muted: boolean;
};

function toChatListItem(row: ChatRow): ChatListItem {
  return {
    conversationId: row.conversation_id,
    otherProfileId: row.other_profile_id,
    otherUsername: row.other_username,
    otherDisplayName: row.other_display_name,
    otherAvatarUrl: row.other_avatar_url,
    otherState: row.other_state,
    otherLastReadAt: row.other_last_read_at,
    lastMessageId: row.last_message_id,
    lastMessageBody: row.last_message_body,
    lastMessageSenderId: row.last_message_sender,
    lastMessageAt: row.last_message_at,
    unreadCount: row.unread_count,
    canMessage: row.can_message,
    muted: row.muted ?? false,
  };
}

export type MessageRow = {
  message_id: string;
  conversation_id: string;
  sender_id: string;
  kind: MessageKind;
  body: string | null;
  created_at: string;
};

export function toMessage(row: MessageRow): Message {
  return {
    messageId: row.message_id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    kind: row.kind,
    body: row.body,
    createdAt: row.created_at,
  };
}

export async function fetchMyChats(): Promise<ChatListItem[]> {
  const { data, error } = await supabase.rpc("get_my_chats");
  if (error) throw error;
  return (data as ChatRow[]).map(toChatListItem);
}

// One conversation's card, for the thread header. Still returned after a
// one-sided delete, unlike the list.
export async function fetchChatSummary(conversationId: string): Promise<ChatListItem | null> {
  const { data, error } = await supabase.rpc("get_my_chats", { p_conversation_id: conversationId });
  if (error) throw error;
  const row = (data as ChatRow[])[0];
  return row ? toChatListItem(row) : null;
}

// Newest first, keyset-paged on created_at. RLS already hides anything the
// caller cleared.
export async function fetchMessages(conversationId: string, before: string | null): Promise<MessagePage> {
  let query = supabase
    .from("messages")
    .select("message_id, conversation_id, sender_id, kind, body, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(MESSAGE_PAGE_SIZE);
  if (before) query = query.lt("created_at", before);

  const { data, error } = await query;
  if (error) throw error;

  const messages = (data as MessageRow[]).map(toMessage);
  return {
    messages,
    nextCursor: messages.length === MESSAGE_PAGE_SIZE ? messages[messages.length - 1].createdAt : null,
  };
}

// The other member's read position (only columns granted to clients come
// back -- never their cleared/deleted state).
export async function fetchOtherLastReadAt(conversationId: string, viewerId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("conversation_members")
    .select("profile_id, last_read_at")
    .eq("conversation_id", conversationId)
    .neq("profile_id", viewerId)
    .maybeSingle();
  if (error) throw error;
  return data?.last_read_at ?? null;
}

export async function fetchUnreadChatCount(): Promise<number> {
  const { data, error } = await supabase.rpc("get_unread_chat_count");
  if (error) throw error;
  return (data as number | null) ?? 0;
}
