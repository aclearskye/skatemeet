import { supabase } from "@/lib/supabaseClient";
import { toSpotChatMessage, type SpotChatMessageRow } from "./queries";
import type {
  SpotChatErrorCode,
  SpotChatFilterReason,
  SpotChatMessage,
  SpotChatReportReason,
  SpotChatSpotRef,
} from "./types";

const MESSAGES: Record<SpotChatErrorCode, string> = {
  NOT_A_MEMBER: "Join the chat first.",
  NOT_ELIGIBLE: "Your account can't use spot chats.",
  BANNED: "Your account can't send messages.",
  INVALID_SPOT: "This spot doesn't have a chat.",
  SPOT_NOT_FOUND: "This spot no longer exists.",
  EMPTY_MESSAGE: "Write something first.",
  MESSAGE_TOO_LONG: "That message is too long.",
  RATE_LIMITED: "You're sending messages too fast — wait a moment.",
  MESSAGE_NOT_FOUND: "That message no longer exists.",
  CANNOT_REPORT_OWN_MESSAGE: "You can't report your own message.",
  CANNOT_BLOCK_SELF: "You can't block yourself.",
  INVALID_REASON: "Pick a reason for the report.",
  FILTERED_slur: "Not sent. Slurs and hate speech aren't allowed.",
  FILTERED_phone_number: "Not sent. Phone numbers can't be shared in spot chats.",
  FILTERED_email: "Not sent. Email addresses can't be shared in spot chats.",
  FILTERED_contact_handle: "Not sent. Usernames and other apps can't be shared in spot chats.",
  FILTERED_link: "Not sent. Links can't be shared in spot chats.",
  UNKNOWN: "Something went wrong — try again.",
};

export class SpotChatError extends Error {
  code: SpotChatErrorCode;
  constructor(code: SpotChatErrorCode) {
    super(MESSAGES[code]);
    this.code = code;
  }
}

function toSpotChatError(error: { message: string }): SpotChatError {
  const code = (Object.keys(MESSAGES) as SpotChatErrorCode[]).find(
    (c) => !c.startsWith("FILTERED_") && error.message.includes(c)
  );
  return new SpotChatError(code ?? "UNKNOWN");
}

export async function joinSpotChat(ref: SpotChatSpotRef): Promise<string> {
  const { data, error } = await supabase.rpc("join_spot_chat", {
    p_spot_id: ref.spotId,
    p_osm_spot_place_id: ref.osmSpotPlaceId,
  });
  if (error) throw toSpotChatError(error);
  return data as string;
}

export async function leaveSpotChat(roomId: string): Promise<void> {
  const { error } = await supabase.rpc("leave_spot_chat", { p_room_id: roomId });
  if (error) throw toSpotChatError(error);
}

export async function clearSpotChat(roomId: string): Promise<void> {
  const { error } = await supabase.rpc("clear_spot_chat", { p_room_id: roomId });
  if (error) throw toSpotChatError(error);
}

type SendResult = { message: SpotChatMessageRow } | { blocked: SpotChatFilterReason };

// A message the filter refuses comes back as a SpotChatError with a
// FILTERED_* code, so callers handle it like any other failed send.
export async function sendSpotChatMessage(roomId: string, body: string): Promise<SpotChatMessage> {
  const { data, error } = await supabase.rpc("send_spot_chat_message", {
    p_room_id: roomId,
    p_body: body,
  });
  if (error) throw toSpotChatError(error);
  const result = data as SendResult;
  if ("blocked" in result) throw new SpotChatError(`FILTERED_${result.blocked}`);
  return toSpotChatMessage(result.message);
}

export async function hideSpotChatMessage(messageId: string): Promise<void> {
  const { error } = await supabase.rpc("hide_spot_chat_message", { p_message_id: messageId });
  if (error) throw toSpotChatError(error);
}

export async function blockSpotChatSender(messageId: string): Promise<void> {
  const { error } = await supabase.rpc("block_spot_chat_sender", { p_message_id: messageId });
  if (error) throw toSpotChatError(error);
}

export type ReportSpotChatMessageInput = {
  messageId: string;
  reason: SpotChatReportReason;
  details: string | null;
  block: boolean;
};

export async function reportSpotChatMessage({ messageId, reason, details, block }: ReportSpotChatMessageInput) {
  const { error } = await supabase.rpc("report_spot_chat_message", {
    p_message_id: messageId,
    p_reason: reason,
    p_details: details,
    p_block: block,
  });
  if (error) throw toSpotChatError(error);
}
