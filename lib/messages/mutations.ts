import { supabase } from "@/lib/supabaseClient";
import { toMessage, type MessageRow } from "./queries";
import type { Message, MessageErrorCode, MessageReportReason } from "./types";

const MESSAGES: Record<MessageErrorCode, string> = {
  CANNOT_MESSAGE_SELF: "You can't message yourself.",
  NOT_A_MEMBER: "You're not part of this chat.",
  NOT_FRIENDS: "You can only message friends.",
  DM_NOT_ALLOWED: "You can't message this account.",
  BLOCKED: "You can't message this skater.",
  BANNED: "Your account can't send messages.",
  PARTICIPANT_GONE: "This skater isn't available.",
  EMPTY_MESSAGE: "Write something first.",
  MESSAGE_TOO_LONG: "That message is too long.",
  RATE_LIMITED: "You're sending messages too fast — wait a moment.",
  MESSAGE_NOT_FOUND: "That message no longer exists.",
  CANNOT_REPORT_OWN_MESSAGE: "You can't report your own message.",
  UNKNOWN: "Something went wrong — try again.",
};

export class MessageError extends Error {
  code: MessageErrorCode;
  constructor(code: MessageErrorCode) {
    super(MESSAGES[code]);
    this.code = code;
  }
}

function toMessageError(error: { message: string }): MessageError {
  const code = (Object.keys(MESSAGES) as MessageErrorCode[]).find((c) =>
    error.message.includes(c)
  );
  return new MessageError(code ?? "UNKNOWN");
}

export async function openConversation(otherProfileId: string): Promise<string> {
  const { data, error } = await supabase.rpc("open_conversation", {
    p_other_profile_id: otherProfileId,
  });
  if (error) throw toMessageError(error);
  return data as string;
}

export async function sendMessage(conversationId: string, body: string): Promise<Message> {
  const { data, error } = await supabase.rpc("send_message", {
    p_conversation_id: conversationId,
    p_body: body,
  });
  if (error) throw toMessageError(error);
  return toMessage(data as MessageRow);
}

export async function markConversationRead(conversationId: string): Promise<void> {
  const { error } = await supabase.rpc("mark_conversation_read", {
    p_conversation_id: conversationId,
  });
  if (error) throw toMessageError(error);
}

export async function clearConversation(conversationId: string): Promise<void> {
  const { error } = await supabase.rpc("clear_conversation", {
    p_conversation_id: conversationId,
  });
  if (error) throw toMessageError(error);
}

export async function deleteConversation(conversationId: string): Promise<void> {
  const { error } = await supabase.rpc("delete_conversation", {
    p_conversation_id: conversationId,
  });
  if (error) throw toMessageError(error);
}

export type ReportMessageInput = {
  messageId: string;
  reason: MessageReportReason;
  details: string | null;
  block: boolean;
};

export async function reportMessage({ messageId, reason, details, block }: ReportMessageInput): Promise<void> {
  const { error } = await supabase.rpc("report_message", {
    p_message_id: messageId,
    p_reason: reason,
    p_details: details,
    p_block: block,
  });
  if (error) throw toMessageError(error);
}

// Mute or unmute one conversation for the caller: no push, no in-app banner.
export async function setConversationMuted(conversationId: string, muted: boolean): Promise<void> {
  const { error } = await supabase.rpc("set_conversation_muted", {
    p_conversation_id: conversationId,
    p_muted: muted,
  });
  if (error) throw error;
}
