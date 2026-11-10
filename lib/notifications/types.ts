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

// Notifications that need an Accept/Decline answer: friend requests and
// post skater tags (dedupKey = request id / post id respectively).
const RESPONDABLE_SOURCES = new Set(["friend_request", "post_tag"]);

// A pending request must be resolved via Accept/Decline, not dismissed
// outright -- readAt doubles as "resolved" for these sources (see the
// respond_to_friend_request / respond_to_post_tag side effects). Shared by
// NotificationRow (hides its delete button) and the notifications screen
// (excludes it from "Clear All" and auto mark-read), so the two stay in sync.
export function isPendingRequest(notification: Pick<Notification, "source" | "readAt">): boolean {
  return RESPONDABLE_SOURCES.has(notification.source) && !notification.readAt;
}

// Requests (friend + tag) and the friend "accepted" confirmation belong to
// the Requests tab; everything else (XP, account events, etc.) is a plain
// dismissible notification.
export function isRequestNotification(notification: Pick<Notification, "source">): boolean {
  return RESPONDABLE_SOURCES.has(notification.source) || notification.source === "friend_request_accepted";
}
