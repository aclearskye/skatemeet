import { supabase } from "@/lib/supabaseClient";
import type { FriendRequestErrorCode } from "./types";

const MESSAGES: Record<FriendRequestErrorCode, string> = {
  CANNOT_FRIEND_SELF: "You can't send yourself a friend request.",
  ALREADY_FRIENDS: "You're already friends.",
  REQUEST_ALREADY_PENDING: "A friend request is already pending.",
  REQUEST_NOT_FOUND: "That friend request no longer exists.",
  NOT_YOUR_REQUEST: "That friend request isn't yours to respond to.",
  REQUEST_ALREADY_RESOLVED: "That friend request has already been resolved.",
  NOT_FRIENDS: "You're not friends with this person.",
  UNKNOWN: "Something went wrong — try again.",
};

export class FriendRequestError extends Error {
  code: FriendRequestErrorCode;
  constructor(code: FriendRequestErrorCode) {
    super(MESSAGES[code]);
    this.code = code;
  }
}

function toFriendRequestError(error: { message: string }): FriendRequestError {
  const code = (Object.keys(MESSAGES) as FriendRequestErrorCode[]).find((c) =>
    error.message.includes(c)
  );
  return new FriendRequestError(code ?? "UNKNOWN");
}

export async function sendFriendRequest(recipientId: string): Promise<string> {
  const { data, error } = await supabase.rpc("send_friend_request", {
    p_recipient_id: recipientId,
  });
  if (error) throw toFriendRequestError(error);
  return data as string;
}

export async function respondToFriendRequest(requestId: string, accept: boolean): Promise<void> {
  const { error } = await supabase.rpc("respond_to_friend_request", {
    p_request_id: requestId,
    p_accept: accept,
  });
  if (error) throw toFriendRequestError(error);
}

export async function removeFriend(otherProfileId: string): Promise<void> {
  const { error } = await supabase.rpc("remove_friend", {
    p_other_profile_id: otherProfileId,
  });
  if (error) throw toFriendRequestError(error);
}

export async function cancelFriendRequest(recipientId: string): Promise<void> {
  const { error } = await supabase.rpc("cancel_friend_request", {
    p_recipient_id: recipientId,
  });
  if (error) throw toFriendRequestError(error);
}
