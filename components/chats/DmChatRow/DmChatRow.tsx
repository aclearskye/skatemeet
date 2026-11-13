import { useState } from "react";
import { useToast } from "@/lib/context/toast-context";
import { useDeleteConversation } from "@/lib/messages/hooks/useDeleteConversation";
import { useSetConversationMuted } from "@/lib/messages/hooks/useSetConversationMuted";
import { chatDisplayName, type ChatListItem } from "@/lib/messages/types";
import { ChatListCard } from "@/components/chats/ChatListCard";
import { SwipeableChatRow } from "@/components/chats/SwipeableChatRow";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";

type Props = {
  chat: ChatListItem & { conversationId: string };
  viewerId: string;
  onPress: () => void;
};

// A DM in the Chats tab with swipe-to-mute / delete. Delete hides and
// clears the chat for the viewer only: the other skater keeps their copy,
// and a new message from them brings it back.
export function DmChatRow({ chat, viewerId, onPress }: Props) {
  const { showToast } = useToast();
  const { setMuted } = useSetConversationMuted(chat.conversationId);
  const { deleteChat } = useDeleteConversation(chat.conversationId);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const name = chatDisplayName(chat);

  function showError() {
    showToast({ message: "SOMETHING WENT WRONG — TRY AGAIN", variant: "danger" });
  }

  return (
    <>
      <SwipeableChatRow
        muted={chat.muted}
        onToggleMute={() => setMuted(!chat.muted, { onError: showError })}
        onDelete={() => setConfirmingDelete(true)}
      >
        <ChatListCard chat={chat} viewerId={viewerId} onPress={onPress} />
      </SwipeableChatRow>

      <ConfirmDialog
        visible={confirmingDelete}
        title="DELETE CHAT?"
        message={`It's cleared and removed from your chats. ${name} keeps their copy and can still message you.`}
        confirmLabel="DELETE"
        onConfirm={() => {
          setConfirmingDelete(false);
          deleteChat(undefined, { onError: showError });
        }}
        onCancel={() => setConfirmingDelete(false)}
      />
    </>
  );
}
