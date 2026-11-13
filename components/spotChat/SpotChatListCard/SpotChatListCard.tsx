import { Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { formatChatTime } from "@/lib/messages/types";
import type { SpotChatListItem } from "@/lib/spotChat/types";
import { C } from "@/lib/theme";
import { AVATAR_SIZE, styles } from "./SpotChatListCard.styles";

type Props = {
  chat: SpotChatListItem;
  onPress: () => void;
};

// A joined spot chat in the Chats tab, laid out like a DM card: a square
// accent tile (spot, not person), the spot name, member count, and the
// last message prefixed with who sent it (display name only).
export function SpotChatListCard({ chat, onPress }: Props) {
  const accent = chat.isDiy ? C.tertiary : C.primary;
  const onAccent = chat.isDiy ? C.onTertiary : C.onPrimary;
  const hasUnread = chat.unreadCount > 0;
  const sender = chat.lastMessageIsMine ? "You" : chat.lastSenderName;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={`${chat.spotName} spot chat${chat.muted ? ", muted" : ""}${hasUnread ? `, ${chat.unreadCount} unread` : ""}`}
    >
      <View style={[styles.tile, { width: AVATAR_SIZE, height: AVATAR_SIZE, backgroundColor: accent }]}>
        <Ionicons name="chatbubbles" size={24} color={onAccent} />
      </View>

      <View style={styles.info}>
        <View style={styles.topRow}>
          <Ionicons name="location-sharp" size={15} color={accent} accessibilityElementsHidden />
          <Text style={styles.name} numberOfLines={1}>
            {chat.spotName.toUpperCase()}
          </Text>
          {chat.muted && (
            <Ionicons name="notifications-off" size={13} color={C.muted} accessibilityLabel="Muted" />
          )}
          {chat.lastMessageAt && <Text style={styles.time}>{formatChatTime(chat.lastMessageAt)}</Text>}
        </View>

        <View style={styles.bottomRow}>
          <Text style={[styles.preview, hasUnread && styles.previewUnread]} numberOfLines={1}>
            {chat.lastMessageBody
              ? `${sender ? `${sender}: ` : ""}${chat.lastMessageBody}`
              : "No messages yet — say what's up"}
          </Text>
          {hasUnread && <View style={styles.unreadDot} />}
        </View>

        <Text style={[styles.meta, { color: accent }]}>
          {`${chat.isDiy ? "DIY" : "SPOT"} CHAT · ${chat.memberCount} ${chat.memberCount === 1 ? "SKATER" : "SKATERS"}`}
        </Text>
      </View>
    </TouchableOpacity>
  );
}
