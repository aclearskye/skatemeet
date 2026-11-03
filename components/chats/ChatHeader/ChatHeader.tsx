import { useState } from "react";
import { Modal, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { chatDisplayName, type ChatListItem } from "@/lib/messages/types";
import { C } from "@/lib/theme";
import { ChatAvatar } from "@/components/chats/ChatAvatar";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { AVATAR_SIZE, styles } from "./ChatHeader.styles";

type PendingAction = "clear" | "delete" | "block" | null;

type Props = {
  chat: ChatListItem | null;
  topInset: number;
  onBack: () => void;
  onOpenProfile: (profileId: string) => void;
  onClear: () => void;
  onDelete: () => void;
  onBlock: () => void;
};

export function ChatHeader({ chat, topInset, onBack, onOpenProfile, onClear, onDelete, onBlock }: Props) {
  const [showMenu, setShowMenu] = useState(false);
  const [pending, setPending] = useState<PendingAction>(null);
  const isUnavailable = !chat || chat.otherState === "unavailable";
  // Blocking needs a known other side; the blocker unblocks from the banner.
  const canBlock = chat?.otherState === "active" && chat.otherProfileId != null;
  const name = chat ? chatDisplayName(chat) : "";

  function choose(action: Exclude<PendingAction, null>) {
    setShowMenu(false);
    setPending(action);
  }

  function confirm() {
    const action = pending;
    setPending(null);
    if (action === "clear") onClear();
    if (action === "delete") onDelete();
    if (action === "block") onBlock();
  }

  const dialog =
    pending === "clear"
      ? {
          title: "CLEAR CHAT?",
          message: "Messages are removed for you only. The other skater keeps their copy.",
          confirmLabel: "CLEAR",
        }
      : pending === "delete"
        ? {
            title: "DELETE CHAT?",
            message:
              "The chat and its messages are removed for you only. It comes back if a new message arrives.",
            confirmLabel: "DELETE",
          }
        : {
            title: `BLOCK @${chat?.otherUsername ?? ""}?`,
            message:
              "You'll stop being friends, neither of you can message or send friend requests, and your profiles are hidden from each other.",
            confirmLabel: "BLOCK",
          };

  return (
    <View style={[styles.header, { paddingTop: topInset + 12 }]}>
      <TouchableOpacity onPress={onBack} hitSlop={12} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={22} color={C.text} />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.identity}
        onPress={() => chat?.otherProfileId && !isUnavailable && onOpenProfile(chat.otherProfileId)}
        disabled={isUnavailable}
        activeOpacity={0.75}
      >
        <ChatAvatar
          profileId={isUnavailable ? null : chat.otherProfileId}
          username={chat?.otherUsername ?? null}
          displayName={chat?.otherDisplayName ?? null}
          avatarUrl={chat?.otherAvatarUrl ?? null}
          size={AVATAR_SIZE}
        />
        <View style={styles.nameColumn}>
          <Text style={[styles.name, isUnavailable && styles.nameMuted]} numberOfLines={1}>
            {name.toUpperCase()}
          </Text>
          {!isUnavailable && chat.otherUsername && (
            <Text style={styles.username} numberOfLines={1}>
              @{chat.otherUsername}
            </Text>
          )}
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => setShowMenu(true)}
        hitSlop={12}
        style={styles.menuBtn}
        disabled={!chat}
        accessibilityLabel="Chat options"
      >
        <Ionicons name="ellipsis-horizontal" size={22} color={C.text} />
      </TouchableOpacity>

      <Modal visible={showMenu} transparent animationType="fade" onRequestClose={() => setShowMenu(false)}>
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setShowMenu(false)} />
          <View style={styles.sheet}>
            <TouchableOpacity style={styles.action} onPress={() => choose("clear")} activeOpacity={0.7}>
              <Ionicons name="trash-bin-outline" size={18} color={C.text} />
              <Text style={styles.actionText}>Clear chat</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.action} onPress={() => choose("delete")} activeOpacity={0.7}>
              <Ionicons name="trash-outline" size={18} color={C.text} />
              <Text style={styles.actionText}>Delete chat</Text>
            </TouchableOpacity>
            {canBlock && (
              <TouchableOpacity style={styles.action} onPress={() => choose("block")} activeOpacity={0.7}>
                <Ionicons name="ban" size={18} color={C.error} />
                <Text style={[styles.actionText, styles.actionDanger]}>Block @{chat.otherUsername}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowMenu(false)} activeOpacity={0.7}>
              <Text style={styles.cancelText}>CANCEL</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ConfirmDialog
        visible={pending != null}
        title={dialog.title}
        message={dialog.message}
        confirmLabel={dialog.confirmLabel}
        onConfirm={confirm}
        onCancel={() => setPending(null)}
      />
    </View>
  );
}
