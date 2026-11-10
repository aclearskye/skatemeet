import { Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { DuctTapeLabel } from "@/components/common/DuctTapeLabel";
import { VARIANT_COLOR, VARIANT_ICON } from "@/lib/shared/notificationVariant";
import { isPendingRequest, type Notification } from "@/lib/notifications/types";
import { C } from "@/lib/theme";
import ProfileAvatar from "@/components/profile/ProfileAvatar";
import { styles } from "./NotificationRow.styles";

type Props = {
  notification: Notification;
  onDelete: (notificationId: string) => void;
  // requestId is the dedupKey: a friend request id, or a post id for post_tag.
  onRespond: (source: string, requestId: string, accept: boolean, otherProfileId: string | null) => void;
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

export function NotificationRow({ notification, onDelete, onRespond }: Props) {
  const router = useRouter();
  const color = VARIANT_COLOR[notification.variant];
  const icon = VARIANT_ICON[notification.variant];
  const isPending = isPendingRequest(notification);

  const { relatedProfileId, relatedProfile } = notification;

  const content = (
    <>
      {relatedProfileId && relatedProfile ? (
        <ProfileAvatar
          profileId={relatedProfileId}
          username={relatedProfile.username}
          displayName={relatedProfile.displayName}
          avatarUrl={relatedProfile.avatarUrl}
          isOwnProfile={false}
          size={44}
        />
      ) : (
        <Ionicons name={icon} size={20} color={color} />
      )}
      <View style={styles.textColumn}>
        {notification.label ? <Text style={styles.label}>{notification.label}</Text> : null}
        <Text style={styles.message}>{notification.message}</Text>
        <Text style={styles.timestamp}>{formatRelativeTime(notification.createdAt)}</Text>

        {isPending && (
          <View style={styles.actionRow}>
            <DuctTapeLabel
              color={C.primary}
              style={styles.acceptBtn}
              onPress={() => onRespond(notification.source, notification.dedupKey, true, notification.relatedProfileId)}
            >
              <Text style={styles.acceptText}>ACCEPT</Text>
            </DuctTapeLabel>
            <DuctTapeLabel
              color={C.secondary}
              style={styles.declineBtn}
              onPress={() => onRespond(notification.source, notification.dedupKey, false, notification.relatedProfileId)}
            >
              <Text style={styles.declineText}>DECLINE</Text>
            </DuctTapeLabel>
          </View>
        )}
      </View>
    </>
  );

  return (
    <View style={styles.row}>
      {notification.relatedProfileId ? (
        <TouchableOpacity
          style={styles.contentRow}
          onPress={() => router.push(`/user/${notification.relatedProfileId}` as any)}
          activeOpacity={0.8}
        >
          {content}
        </TouchableOpacity>
      ) : (
        <View style={styles.contentRow}>{content}</View>
      )}
      {!isPending && (
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => onDelete(notification.notificationId)}
          hitSlop={8}
        >
          <Ionicons name="trash-outline" size={18} color={C.muted} />
        </TouchableOpacity>
      )}
    </View>
  );
}
