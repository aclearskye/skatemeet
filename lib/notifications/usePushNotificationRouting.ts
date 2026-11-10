import { useEffect } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";

// Foreground pushes still show a banner; the in-app toast/inbox covers the
// rest.
if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

// Tapping a push opens what it's about: tag requests go to the inbox
// (Accept/Decline lives there), everything else to the post itself.
export function usePushNotificationRouting() {
  const router = useRouter();

  useEffect(() => {
    if (Platform.OS === "web") return;
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as { source?: string; post_id?: string } | undefined;
      if (data?.source === "post_tag" || data?.source === "post_removed" || !data?.post_id) {
        router.push("/notifications" as never);
      } else {
        router.push(`/post/${data.post_id}` as never);
      }
    });
    return () => sub.remove();
  }, [router]);
}
