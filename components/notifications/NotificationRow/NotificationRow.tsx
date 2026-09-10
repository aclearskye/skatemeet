import { Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { VARIANT_COLOR, VARIANT_ICON } from "@/lib/shared/notificationVariant";
import type { Notification } from "@/lib/notifications/types";
import { C } from "@/lib/theme";
import { styles } from "./NotificationRow.styles";

type Props = {
  notification: Notification;
  onDelete: (notificationId: string) => void;
};

function formatRelativeTime(isoDate: string): string {
  const seconds = Math.max(0, (Date.now() - new Date(isoDate).getTime()) / 1000);
  if (seconds < 60) return "JUST NOW";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}M AGO`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}H AGO`;
  const days = Math.floor(hours / 24);
  return `${days}D AGO`;
}

export function NotificationRow({ notification, onDelete }: Props) {
  const color = VARIANT_COLOR[notification.variant];
  const icon = VARIANT_ICON[notification.variant];

  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={20} color={color} />
      <View style={styles.textColumn}>
        {notification.label ? <Text style={styles.label}>{notification.label}</Text> : null}
        <Text style={styles.message}>{notification.message}</Text>
        <Text style={styles.timestamp}>{formatRelativeTime(notification.createdAt)}</Text>
      </View>
      <TouchableOpacity
        style={styles.deleteBtn}
        onPress={() => onDelete(notification.notificationId)}
        hitSlop={8}
      >
        <Ionicons name="trash-outline" size={18} color={C.muted} />
      </TouchableOpacity>
    </View>
  );
}
