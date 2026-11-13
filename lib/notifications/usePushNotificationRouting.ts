import { useEffect } from "react";
import { AppState, Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";

// Message pushes (supabase/migrations/20261113160000_chat_mute_and_message_push.sql).
const MESSAGE_SOURCES = new Set(["message", "spot_chat_message"]);

type PushData = {
  source?: string;
  post_id?: string;
  conversation_id?: string;
  spot_id?: string | null;
  osm_spot_place_id?: string | null;
  spot_name?: string;
  is_diy?: boolean;
};

// Foreground pushes still show a banner, except messages: the app shows
// its own in-app banner for those (useIncomingDmBanner /
// useIncomingSpotChatBanner), which also knows to skip the open chat.
if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      const data = notification.request.content.data as PushData | undefined;
      const inApp = MESSAGE_SOURCES.has(data?.source ?? "") && AppState.currentState === "active";
      return {
        shouldShowBanner: !inApp,
        shouldShowList: !inApp,
        shouldPlaySound: false,
        shouldSetBadge: false,
      };
    },
  });
}

// Tapping a push opens what it's about: a message opens its chat, tag
// requests go to the inbox (Accept/Decline lives there), everything else
// to the post itself.
export function usePushNotificationRouting() {
  const router = useRouter();

  useEffect(() => {
    if (Platform.OS === "web") return;
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as PushData | undefined;
      if (data?.source === "message" && data.conversation_id) {
        router.push(`/chat/${data.conversation_id}` as never);
      } else if (data?.source === "spot_chat_message") {
        router.push({
          pathname: "/spot-chat" as never,
          params: {
            spotId: data.spot_id ?? "",
            osmPlaceId: data.osm_spot_place_id ?? "",
            name: data.spot_name ?? "",
            diy: data.is_diy ? "1" : "0",
          },
        });
      } else if (data?.source === "post_tag" || data?.source === "post_removed" || !data?.post_id) {
        router.push("/notifications" as never);
      } else {
        router.push(`/post/${data.post_id}` as never);
      }
    });
    return () => sub.remove();
  }, [router]);
}
