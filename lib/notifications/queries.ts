import { supabase } from "@/lib/supabaseClient";
import type { Notification, NotificationProfile, NotificationVariant } from "./types";

type RelatedProfileRow = {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
};

// The embed comes back as an object for a to-one FK, but the untyped client
// can't know that, so accept either shape.
function toNotificationProfile(
  row: RelatedProfileRow | RelatedProfileRow[] | null
): NotificationProfile | null {
  const profile = Array.isArray(row) ? row[0] : row;
  if (!profile) return null;
  return {
    username: profile.username,
    displayName: profile.display_name,
    avatarUrl: profile.avatar_url,
  };
}

export async function fetchNotifications(profileId: string): Promise<Notification[]> {
  const { data, error } = await supabase
    .from("notifications")
    // !related_profile_id disambiguates the embed from the profile_id FK,
    // which also points at profiles.
    .select(
      "notification_id, message, label, variant, source, dedup_key, related_profile_id, read_at, created_at, related_profile:profile_cards!related_profile_id(username, display_name, avatar_url)"
    )
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false });
  if (error) throw error;

  return data.map((row) => ({
    notificationId: row.notification_id,
    message: row.message,
    label: row.label,
    variant: row.variant as NotificationVariant,
    source: row.source,
    dedupKey: row.dedup_key,
    relatedProfileId: row.related_profile_id,
    relatedProfile: toNotificationProfile(row.related_profile),
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
