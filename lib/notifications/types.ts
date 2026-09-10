import type { NotificationVariant } from "@/lib/shared/notificationVariant";

export type { NotificationVariant };

export type Notification = {
  notificationId: string;
  message: string;
  label: string | null;
  variant: NotificationVariant;
  readAt: string | null;
  createdAt: string;
};
