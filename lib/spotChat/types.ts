// Spot chats: one group chat per skate spot / DIY spot. Never for stores.
// Server side: supabase/migrations/20261110120000_spot_chats.sql.

// Exactly one of the two is set -- a user spot (including DIY) or an OSM spot.
export type SpotChatSpotRef = {
  spotId: string | null;
  osmSpotPlaceId: string | null;
};

export type SpotChatRoom = {
  // null until someone joins the spot's chat for the first time.
  roomId: string | null;
  isMember: boolean;
  memberCount: number;
  // False for accounts that can't use spot chats (banned, age unconfirmed).
  canJoin: boolean;
};

// Deliberately no username or profile id: other members only ever see a
// display name and avatar. senderAlias is random per member, just for
// grouping consecutive messages.
export type SpotChatMessage = {
  messageId: string;
  body: string;
  createdAt: string;
  isMine: boolean;
  // Hidden from others by the automatic scan, pending admin review. Only
  // ever true on the viewer's own messages.
  isHeld: boolean;
  senderAlias: string | null;
  senderName: string;
  senderAvatarUrl: string | null;
  // Client-only: set on the optimistic copy until the send resolves.
  isPending?: boolean;
};

export type SpotChatMessagePage = {
  messages: SpotChatMessage[];
  nextCursor: string | null;
};

// Why send_spot_chat_message refused a message (_spot_chat_filter).
export type SpotChatFilterReason = "slur" | "phone_number" | "email" | "contact_handle" | "link";

export type SpotChatErrorCode =
  | "NOT_A_MEMBER"
  | "NOT_ELIGIBLE"
  | "BANNED"
  | "INVALID_SPOT"
  | "SPOT_NOT_FOUND"
  | "EMPTY_MESSAGE"
  | "MESSAGE_TOO_LONG"
  | "RATE_LIMITED"
  | "MESSAGE_NOT_FOUND"
  | "CANNOT_REPORT_OWN_MESSAGE"
  | "CANNOT_BLOCK_SELF"
  | "INVALID_REASON"
  | `FILTERED_${SpotChatFilterReason}`
  | "UNKNOWN";

// Kept in sync with the user reasons accepted by report_spot_chat_message.
export const SPOT_CHAT_REPORT_REASONS = [
  { code: "harassment", label: "Bullying or harassment" },
  { code: "threat", label: "Threats or violence" },
  { code: "inappropriate_content", label: "Sexual or inappropriate content" },
  { code: "personal_info", label: "Sharing personal info or asking to meet privately" },
  { code: "self_harm", label: "Someone may be at risk of harm" },
  { code: "spam", label: "Spam" },
  { code: "other", label: "Other" },
] as const;

export type SpotChatReportReason = (typeof SPOT_CHAT_REPORT_REASONS)[number]["code"];

export const SPOT_CHAT_MAX_LENGTH = 2000;
export const SPOT_CHAT_PAGE_SIZE = 50;

export function spotChatKey(ref: SpotChatSpotRef): string {
  return ref.spotId ?? ref.osmSpotPlaceId ?? "";
}

// The avatar and name show only on the first message of a run from the
// same sender. The list is newest-first, so the "previous" message on
// screen is the next item in the array.
export function startsSenderRun(messages: SpotChatMessage[], index: number): boolean {
  const older = messages[index + 1];
  return !older || older.senderAlias !== messages[index].senderAlias;
}
