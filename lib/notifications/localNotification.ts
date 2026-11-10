import { AppState, Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { hasRegisteredPushToken } from "./pushRegistration";

// Notification sources the server already pushes (_push_notification in
// supabase/migrations/20261104170100_push_notifications.sql, with
// post_video_failed added by 20261106130000_video_posts.sql).
const SERVER_PUSHED = new Set(["post_published", "post_held", "post_caption_rejected", "post_removed", "post_video_failed"]);

type LocalNotice = {
  title: string;
  body: string;
  // Same shape as a server push, so usePushNotificationRouting opens it.
  data: { source: string; post_id?: string };
};

// Tells the user how a background upload ended when the app isn't on
// screen. Skipped in the foreground (the toast covers it) and when the
// server's push for this outcome will already reach this device. Works
// without push credentials (FCM/APNs): it's a local notification.
// Best effort: no permission or any failure just means no banner.
export async function notifyIfBackgrounded(notice: LocalNotice): Promise<void> {
  if (Platform.OS === "web" || AppState.currentState === "active") return;
  try {
    if (SERVER_PUSHED.has(notice.data.source) && (await hasRegisteredPushToken())) return;
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") return;
    await Notifications.scheduleNotificationAsync({
      content: { title: notice.title, body: notice.body, data: notice.data, sound: "default" },
      trigger: Platform.OS === "android" ? { channelId: "default" } : null,
    });
  } catch {
    // No banner this time; the in-app inbox still has the outcome.
  }
}
