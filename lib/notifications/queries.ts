import { supabase } from "@/lib/supabaseClient";
import type { Notification, NotificationVariant } from "./types";

export async function fetchNotifications(profileId: string): Promise<Notification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("notification_id, message, label, variant, read_at, created_at")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false });
  if (error) throw error;

  return data.map((row) => ({
    notificationId: row.notification_id,
    message: row.message,
    label: row.label,
    variant: row.variant as NotificationVariant,
    readAt: row.read_at,
    createdAt: row.created_at,
  }));
}

export async function fetchUnreadNotificationCount(profileId: string): Promise<number> {
  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("profile_id", profileId)
    .is("read_at", null);
  if (error) throw error;
  return count ?? 0;
}
