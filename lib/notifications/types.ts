import type { NotificationVariant } from "@/lib/shared/notificationVariant";

export type { NotificationVariant };

export type NotificationProfile = {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
};

export type Notification = {
  notificationId: string;
  message: string;
  label: string | null;
  variant: NotificationVariant;
  source: string;
  dedupKey: string;
  relatedProfileId: string | null;
  relatedProfile: NotificationProfile | null;
  readAt: string | null;
  createdAt: string;
};

// A pending friend request must be resolved via Accept/Decline, not
// dismissed outright -- readAt doubles as "resolved" for this source (see
// respond_to_friend_request's side effect). Shared by NotificationRow
// (hides its delete button) and the notifications screen (excludes it from
// "Clear All"), so the two stay in sync.
export function isPendingFriendRequest(notification: Pick<Notification, "source" | "readAt">): boolean {
  return notification.source === "friend_request" && !notification.readAt;
}

// Both the incoming request and its "accepted" confirmation belong to the
// Requests tab on the notifications screen; everything else (XP, account
// events, etc.) is a plain dismissible notification.
export function isFriendRequestNotification(notification: Pick<Notification, "source">): boolean {
  return notification.source === "friend_request" || notification.source === "friend_request_accepted";
}
