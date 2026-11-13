// Kept in sync with the CHECK constraint on messages.kind in
// supabase/migrations/20261008000000_messaging.sql. Widen both for
// spot-share messages.
export type MessageKind = "text";

export type MessageStatus = "sending" | "sent" | "read";

export type Message = {
  messageId: string;
  conversationId: string;
  senderId: string;
  kind: MessageKind;
  body: string | null;
  createdAt: string;
  // Client-only: set on the optimistic copy until send_message resolves.
  isPending?: boolean;
};

// See get_my_chats' comment: 'unavailable' covers both a deleted account
// and one that blocked the viewer, deliberately indistinguishable.
export type ChatOtherState = "active" | "blocked_by_me" | "unavailable";

export type ChatListItem = {
  // null for a friend with no conversation yet (a "Say hi" card).
  conversationId: string | null;
  otherProfileId: string | null;
  otherUsername: string | null;
  otherDisplayName: string | null;
  otherAvatarUrl: string | null;
  otherState: ChatOtherState;
  otherLastReadAt: string | null;
  lastMessageId: string | null;
  lastMessageBody: string | null;
  lastMessageSenderId: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  canMessage: boolean;
  // Muted by the viewer: no push and no in-app banner for new messages.
  muted: boolean;
};

export type MessagePage = {
  messages: Message[];
  // created_at of the oldest message in this page, when more may exist.
  nextCursor: string | null;
};

export type MessageErrorCode =
  | "CANNOT_MESSAGE_SELF"
  | "NOT_A_MEMBER"
  | "NOT_FRIENDS"
  | "BLOCKED"
  | "BANNED"
  | "PARTICIPANT_GONE"
  | "EMPTY_MESSAGE"
  | "MESSAGE_TOO_LONG"
  | "RATE_LIMITED"
  | "MESSAGE_NOT_FOUND"
  | "CANNOT_REPORT_OWN_MESSAGE"
  | "UNKNOWN";

// Kept in sync with the CHECK constraint on message_reports.reason in
// supabase/migrations/20261009000000_privacy_blocks_and_message_reports.sql.
export const MESSAGE_REPORT_REASONS = [
  { code: "harassment", label: "Bullying or harassment" },
  { code: "spam", label: "Spam" },
  { code: "inappropriate_content", label: "Inappropriate content" },
  { code: "other", label: "Other" },
] as const;

export type MessageReportReason = (typeof MESSAGE_REPORT_REASONS)[number]["code"];

export const MESSAGE_MAX_LENGTH = 2000;
export const MESSAGE_PAGE_SIZE = 50;

export const UNAVAILABLE_SKATER = "Unavailable skater";

export function chatDisplayName(chat: Pick<ChatListItem, "otherState" | "otherDisplayName" | "otherUsername">): string {
  if (chat.otherState === "unavailable") return UNAVAILABLE_SKATER;
  return chat.otherDisplayName || chat.otherUsername || UNAVAILABLE_SKATER;
}

// "14:05" today, "MON" this week, "3 NOV" otherwise.
export function formatChatTime(iso: string, now = new Date()): string {
  const date = new Date(iso);
  const dayMs = 24 * 60 * 60 * 1000;
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (date.getTime() >= startOfToday) {
    return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  }
  if (date.getTime() >= startOfToday - 6 * dayMs) {
    return date.toLocaleDateString(undefined, { weekday: "short" }).toUpperCase();
  }
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short" }).toUpperCase();
}

// A sent message is read once the other member's read position reaches it.
// Compared as parsed dates, not strings: PostgREST and realtime payloads
// format the same timestamptz differently.
export function messageStatus(message: Message, otherLastReadAt: string | null): MessageStatus {
  if (message.isPending) return "sending";
  if (otherLastReadAt && Date.parse(otherLastReadAt) >= Date.parse(message.createdAt)) return "read";
  return "sent";
}
