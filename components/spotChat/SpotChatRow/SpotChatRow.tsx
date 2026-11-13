import { useState } from "react";
import { useToast } from "@/lib/context/toast-context";
import { useLeaveSpotChat } from "@/lib/spotChat/hooks/useLeaveSpotChat";
import { useSetSpotChatMuted } from "@/lib/spotChat/hooks/useSetSpotChatMuted";
import type { SpotChatListItem } from "@/lib/spotChat/types";
import { SwipeableChatRow } from "@/components/chats/SwipeableChatRow";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { SpotChatListCard } from "@/components/spotChat/SpotChatListCard";

type Props = {
  chat: SpotChatListItem;
  onPress: () => void;
};

// A spot chat in the Chats tab with swipe-to-mute / delete. Delete leaves
// the chat; the viewer's messages stay in it for everyone else.
export function SpotChatRow({ chat, onPress }: Props) {
  const { showToast } = useToast();
  const { setMuted } = useSetSpotChatMuted(chat.roomId);
  const { leave } = useLeaveSpotChat(chat.spotRef, chat.roomId);
  const [confirmingLeave, setConfirmingLeave] = useState(false);

  function showError() {
    showToast({ message: "SOMETHING WENT WRONG — TRY AGAIN", variant: "danger" });
  }

  return (
    <>
      <SwipeableChatRow
        muted={chat.muted}
        onToggleMute={() => setMuted(!chat.muted, { onError: showError })}
        onDelete={() => setConfirmingLeave(true)}
      >
        <SpotChatListCard chat={chat} onPress={onPress} />
      </SwipeableChatRow>

      <ConfirmDialog
        visible={confirmingLeave}
        title={`LEAVE ${chat.spotName.toUpperCase()} CHAT?`}
        message="It's removed from your chats and you'll stop getting its messages. Your messages stay in the chat. You can rejoin from the spot any time."
        confirmLabel="LEAVE"
        onConfirm={() => {
          setConfirmingLeave(false);
          leave(undefined, { onError: showError });
        }}
        onCancel={() => setConfirmingLeave(false)}
      />
    </>
  );
}
