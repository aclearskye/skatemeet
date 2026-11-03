export type FriendStatus = "none" | "pending_sent" | "pending_received" | "friends";

export type FriendStatusResult = {
  status: FriendStatus;
  requestId: string | null;
};

export type FriendRequestErrorCode =
  | "CANNOT_FRIEND_SELF"
  | "ALREADY_FRIENDS"
  | "REQUEST_ALREADY_PENDING"
  | "REQUEST_NOT_FOUND"
  | "NOT_YOUR_REQUEST"
  | "REQUEST_ALREADY_RESOLVED"
  | "NOT_FRIENDS"
  | "UNKNOWN";
