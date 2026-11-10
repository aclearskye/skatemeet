import { useState } from "react";
import { Modal, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C } from "@/lib/theme";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { styles } from "./SpotChatHeader.styles";

type PendingAction = "clear" | "leave" | null;

type Props = {
  spotName: string;
  memberCount: number;
  isMember: boolean;
  accent: string;
  topInset: number;
  onBack: () => void;
  onClear: () => void;
  onLeave: () => void;
};

export function SpotChatHeader({ spotName, memberCount, isMember, accent, topInset, onBack, onClear, onLeave }: Props) {
  const [showMenu, setShowMenu] = useState(false);
  const [pending, setPending] = useState<PendingAction>(null);

  function choose(action: Exclude<PendingAction, null>) {
    setShowMenu(false);
    setPending(action);
  }

  function confirm() {
    const action = pending;
    setPending(null);
    if (action === "clear") onClear();
    if (action === "leave") onLeave();
  }

  const dialog =
    pending === "clear"
      ? {
          title: "CLEAR CHAT?",
          message: "The messages are removed for you only. Everyone else in the chat keeps them.",
          confirmLabel: "CLEAR",
        }
      : {
          title: "LEAVE CHAT?",
          message: "You'll stop getting this spot's messages. The chat and its history stay, and you can join again any time.",
          confirmLabel: "LEAVE",
        };

  return (
    <View style={[styles.header, { paddingTop: topInset + 12 }]}>
      <TouchableOpacity onPress={onBack} hitSlop={12} style={styles.backBtn} accessibilityLabel="Back">
        <Ionicons name="arrow-back" size={22} color={C.text} />
      </TouchableOpacity>

      <View style={styles.titleColumn}>
        <Text style={styles.title} numberOfLines={1}>
          {spotName.toUpperCase()}
        </Text>
        <View style={styles.metaRow}>
          <Ionicons name="chatbubbles" size={12} color={accent} />
          <Text style={styles.meta} numberOfLines={1}>
            SPOT CHAT · {memberCount} {memberCount === 1 ? "SKATER" : "SKATERS"}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        onPress={() => setShowMenu(true)}
        hitSlop={12}
        style={styles.menuBtn}
        disabled={!isMember}
        accessibilityLabel="Chat options"
      >
        {isMember && <Ionicons name="ellipsis-horizontal" size={22} color={C.text} />}
      </TouchableOpacity>

      <Modal visible={showMenu} transparent animationType="fade" onRequestClose={() => setShowMenu(false)}>
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setShowMenu(false)} />
          <View style={styles.sheet}>
            <TouchableOpacity style={styles.action} onPress={() => choose("clear")} activeOpacity={0.7}>
              <Ionicons name="trash-bin-outline" size={18} color={C.text} />
              <Text style={styles.actionText}>Clear chat for me</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.action} onPress={() => choose("leave")} activeOpacity={0.7}>
              <Ionicons name="exit-outline" size={18} color={C.error} />
              <Text style={[styles.actionText, styles.actionDanger]}>Leave chat</Text>
            </TouchableOpacity>
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
