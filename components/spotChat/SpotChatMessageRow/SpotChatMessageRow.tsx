import { useState } from "react";
import { Modal, Pressable, Text, TouchableOpacity, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";
import { useToast } from "@/lib/context/toast-context";
import { formatChatTime } from "@/lib/messages/types";
import type { SpotChatMessage } from "@/lib/spotChat/types";
import { C } from "@/lib/theme";
import { SpotChatAvatar } from "@/components/spotChat/SpotChatAvatar";
import { AVATAR_SIZE, styles } from "./SpotChatMessageRow.styles";

type Props = {
  message: SpotChatMessage;
  // First message of a run from one sender: shows the avatar and name.
  showSender: boolean;
  onDeleteForMe: (message: SpotChatMessage) => void;
  onReport: (message: SpotChatMessage) => void;
  onBlock: (message: SpotChatMessage) => void;
};

// Hold a message for its actions: copy and "delete for me" on any message,
// plus report and block on other people's.
export function SpotChatMessageRow({ message, showSender, onDeleteForMe, onReport, onBlock }: Props) {
  const { showToast } = useToast();
  const [showMenu, setShowMenu] = useState(false);
  const { isMine } = message;

  function act(action: (message: SpotChatMessage) => void) {
    setShowMenu(false);
    action(message);
  }

  async function handleCopy() {
    setShowMenu(false);
    await Clipboard.setStringAsync(message.body);
    showToast({ message: "COPIED", variant: "info" });
  }

  return (
    <View style={[styles.row, isMine && styles.rowOwn, showSender && styles.rowRunStart]}>
      {!isMine && (
        <View style={styles.avatarSlot}>
          {showSender && (
            <SpotChatAvatar name={message.senderName} avatarUrl={message.senderAvatarUrl} size={AVATAR_SIZE} />
          )}
        </View>
      )}

      <View style={[styles.column, isMine && styles.columnOwn]}>
        {showSender && !isMine && (
          <Text style={styles.senderName} numberOfLines={1}>
            {message.senderName}
          </Text>
        )}
        <Pressable
          style={[
            styles.bubble,
            isMine ? styles.bubbleOwn : styles.bubbleOther,
            (message.isPending || message.isHeld) && styles.bubbleDimmed,
          ]}
          onLongPress={() => !message.isPending && setShowMenu(true)}
          delayLongPress={300}
          accessibilityHint="Hold for options"
        >
          <Text style={[styles.body, isMine ? styles.bodyOwn : styles.bodyOther]}>{message.body}</Text>
          <Text style={[styles.time, isMine ? styles.timeOwn : styles.timeOther]}>
            {message.isPending ? "SENDING…" : formatChatTime(message.createdAt)}
          </Text>
        </Pressable>
        {message.isHeld && (
          <Text style={styles.heldNote}>{"HIDDEN FROM OTHERS WHILE A MODERATOR REVIEWS IT"}</Text>
        )}
      </View>

      <Modal visible={showMenu} transparent animationType="fade" onRequestClose={() => setShowMenu(false)}>
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setShowMenu(false)} />
          <View style={styles.sheet}>
            <TouchableOpacity style={styles.action} onPress={handleCopy} activeOpacity={0.7}>
              <Ionicons name="copy-outline" size={18} color={C.text} />
              <Text style={styles.actionText}>Copy</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.action} onPress={() => act(onDeleteForMe)} activeOpacity={0.7}>
              <Ionicons name="trash-outline" size={18} color={C.text} />
              <Text style={styles.actionText}>Delete for me</Text>
            </TouchableOpacity>
            {!isMine && (
              <>
                <TouchableOpacity style={styles.action} onPress={() => act(onReport)} activeOpacity={0.7}>
                  <Ionicons name="flag-outline" size={18} color={C.error} />
                  <Text style={[styles.actionText, styles.actionDanger]}>Report message</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.action} onPress={() => act(onBlock)} activeOpacity={0.7}>
                  <Ionicons name="ban" size={18} color={C.error} />
                  <Text style={[styles.actionText, styles.actionDanger]}>Block {message.senderName}</Text>
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowMenu(false)} activeOpacity={0.7}>
              <Text style={styles.cancelText}>CANCEL</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
