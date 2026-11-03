import { useState } from "react";
import { Modal, Pressable, Text, TouchableOpacity, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";
import { useToast } from "@/lib/context/toast-context";
import { formatChatTime, type Message, type MessageStatus } from "@/lib/messages/types";
import { C } from "@/lib/theme";
import { styles } from "./MessageBubble.styles";

type Props = {
  message: Message;
  isOwn: boolean;
  status: MessageStatus;
  onReport: (message: Message) => void;
};

export function MessageBubble({ message, isOwn, status, onReport }: Props) {
  const { showToast } = useToast();
  const [showMenu, setShowMenu] = useState(false);

  async function handleCopy() {
    setShowMenu(false);
    await Clipboard.setStringAsync(message.body ?? "");
    showToast({ message: "COPIED", variant: "info" });
  }

  function handleReport() {
    setShowMenu(false);
    onReport(message);
  }

  // Switches on kind so spot-share bubbles can slot in later.
  const content =
    message.kind === "text" ? (
      <Text style={[styles.body, isOwn ? styles.bodyOwn : styles.bodyOther]}>{message.body}</Text>
    ) : null;

  return (
    <View style={[styles.row, isOwn && styles.rowOwn]}>
      <Pressable
        style={[
          styles.bubble,
          isOwn ? styles.bubbleOwn : styles.bubbleOther,
          status === "sending" && styles.bubblePending,
        ]}
        onLongPress={() => !message.isPending && setShowMenu(true)}
        delayLongPress={300}
      >
        {content}
        <View style={styles.meta}>
          <Text style={[styles.time, isOwn ? styles.timeOwn : styles.timeOther]}>
            {status === "sending" ? "SENDING…" : formatChatTime(message.createdAt)}
          </Text>
          {isOwn && status !== "sending" && (
            <Ionicons
              name={status === "read" ? "checkmark-done" : "checkmark"}
              size={13}
              color={C.onPrimary}
              accessibilityLabel={status === "read" ? "Read" : "Sent"}
            />
          )}
        </View>
      </Pressable>

      <Modal visible={showMenu} transparent animationType="fade" onRequestClose={() => setShowMenu(false)}>
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setShowMenu(false)} />
          <View style={styles.sheet}>
            <TouchableOpacity style={styles.action} onPress={handleCopy} activeOpacity={0.7}>
              <Ionicons name="copy-outline" size={18} color={C.text} />
              <Text style={styles.actionText}>Copy</Text>
            </TouchableOpacity>
            {!isOwn && (
              <TouchableOpacity style={styles.action} onPress={handleReport} activeOpacity={0.7}>
                <Ionicons name="flag-outline" size={18} color={C.error} />
                <Text style={[styles.actionText, styles.actionDanger]}>Report message</Text>
              </TouchableOpacity>
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
