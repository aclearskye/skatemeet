import { useCallback } from "react";
import { useRouter } from "expo-router";
import { useToast } from "@/lib/context/toast-context";
import { isActiveChat, spotChatRoomKey } from "@/lib/shared/activeChat";
import type { SpotChatListItem } from "../types";

// Returns a handler comparing a room's card before and after a refresh:
// a newer last message from someone else, in a chat that isn't muted or on
// screen, shows a tappable in-app banner.
export function useIncomingSpotChatBanner() {
  const { showToast } = useToast();
  const router = useRouter();

  return useCallback(
    (before: SpotChatListItem | undefined, after: SpotChatListItem | undefined) => {
      if (!after || after.muted || after.lastMessageIsMine) return;
      if (!after.lastMessageAt || !after.lastMessageBody) return;
      if (before?.lastMessageAt && before.lastMessageAt >= after.lastMessageAt) return;
      if (isActiveChat(spotChatRoomKey(after.roomId))) return;

      showToast({
        label: after.spotName.toUpperCase(),
        message: `${after.lastSenderName ?? "Skater"}: ${after.lastMessageBody}`,
        variant: "info",
        onPress: () =>
          router.push({
            pathname: "/spot-chat" as never,
            params: {
              spotId: after.spotRef.spotId ?? "",
              osmPlaceId: after.spotRef.osmSpotPlaceId ?? "",
              name: after.spotName,
              diy: after.isDiy ? "1" : "0",
            },
          }),
      });
    },
    [showToast, router]
  );
}
