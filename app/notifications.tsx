import { useCallback } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { deleteNotification, markNotificationRead } from "@/lib/notifications/mutations";
import { fetchNotifications } from "@/lib/notifications/queries";
import type { Notification } from "@/lib/notifications/types";
import { C, F } from "@/lib/theme";
import { queryKeys } from "@/utils/queryKeys";
import { NotificationRow } from "@/components/notifications/NotificationRow";

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const { session } = useAuthContext();
  const userId = session?.user.id ?? null;
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: queryKeys.notifications(userId ?? ""),
    queryFn: () => fetchNotifications(userId!),
    enabled: !!userId,
  });

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      const unread = notifications.filter((n) => !n.readAt);
      if (unread.length === 0) return;
      Promise.all(unread.map((n) => markNotificationRead(n.notificationId))).then(() => {
        queryClient.invalidateQueries({ queryKey: queryKeys.notifications(userId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.notificationsUnreadCount(userId) });
      });
      // Only rerun when the set of loaded notifications actually changes —
      // not on every focus of an already-read list.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId, notifications])
  );

  const deleteMutation = useMutation({
    mutationFn: deleteNotification,
    onMutate: async (notificationId: string) => {
      if (!userId) return;
      await queryClient.cancelQueries({ queryKey: queryKeys.notifications(userId) });
      const previous = queryClient.getQueryData<Notification[]>(queryKeys.notifications(userId));
      queryClient.setQueryData<Notification[]>(queryKeys.notifications(userId), (old = []) =>
        old.filter((n) => n.notificationId !== notificationId)
      );
      return { previous };
    },
    onError: (_err, _notificationId, context) => {
      if (userId && context?.previous) {
        queryClient.setQueryData(queryKeys.notifications(userId), context.previous);
      }
    },
    onSettled: () => {
      if (!userId) return;
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.notificationsUnreadCount(userId) });
    },
  });

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.heading}>NOTIFICATIONS</Text>
        <Text style={styles.subheading} numberOfLines={1}>
          {"// everything you've earned and missed"}
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.centeredMsg}>
          <ActivityIndicator color={C.primary} />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.centeredMsg}>
          <Ionicons name="notifications-outline" size={32} color={C.muted} />
          <Text style={styles.emptyLabel}>NO NOTIFICATIONS YET</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {notifications.map((notification) => (
            <NotificationRow
              key={notification.notificationId}
              notification={notification}
              onDelete={(id) => deleteMutation.mutate(id)}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: C.border,
  },
  heading: {
    fontFamily: F.heading,
    fontSize: 20,
    color: C.text,
    letterSpacing: 2,
  },
  subheading: {
    flexShrink: 1,
    fontFamily: F.monoRegular,
    fontSize: 13,
    color: C.muted,
    letterSpacing: 0.5,
  },
  list: {
    padding: 16,
    gap: 10,
  },
  centeredMsg: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  emptyLabel: {
    fontFamily: F.mono,
    fontSize: 11,
    color: C.muted,
    letterSpacing: 2,
  },
});
