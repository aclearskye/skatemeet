import { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { useRespondToFriendRequest } from "@/lib/friendRequests/hooks/useRespondToFriendRequest";
import { useRespondToPostTag } from "@/lib/posts/hooks/useRespondToPostTag";
import { deleteNotification, deleteNotifications, markNotificationRead } from "@/lib/notifications/mutations";
import { fetchNotifications } from "@/lib/notifications/queries";
import {
  isRequestNotification,
  isPendingRequest,
  type Notification,
} from "@/lib/notifications/types";
import { C, F } from "@/lib/theme";
import { queryKeys } from "@/utils/queryKeys";
import { DuctTapeLabel } from "@/components/common/DuctTapeLabel";
import { NotificationRow } from "@/components/notifications/NotificationRow";
import { NotificationTabs, type NotificationTab } from "@/components/notifications/NotificationTabs";

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const { session } = useAuthContext();
  const userId = session?.user.id ?? null;
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<NotificationTab>("all");

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: queryKeys.notifications(userId ?? ""),
    queryFn: () => fetchNotifications(userId!),
    enabled: !!userId,
  });

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      // Reads straight from the cache rather than closing over `notifications`
      // -- depending on that array would make this effect's identity change
      // (and therefore re-run, since the screen stays focused) on every
      // delete/respond mutation, racing its own invalidate/refetch against
      // theirs and sometimes winning with stale, pre-mutation data. This
      // should only run on an actual focus transition.
      const current = queryClient.getQueryData<Notification[]>(queryKeys.notifications(userId)) ?? [];
      // Pending friend requests are excluded here -- their readAt doubles as
      // "resolved" (see isPendingRequest), so they should only flip to
      // read once the user actually accepts/declines, not just from viewing
      // the inbox.
      const unread = current.filter((n) => !n.readAt && !isPendingRequest(n));
      if (unread.length === 0) return;
      Promise.all(unread.map((n) => markNotificationRead(n.notificationId))).then(() => {
        queryClient.invalidateQueries({ queryKey: queryKeys.notifications(userId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.notificationsUnreadCount(userId) });
      });
    }, [userId, queryClient])
  );

  const { respond } = useRespondToFriendRequest();
  const { respond: respondToTag } = useRespondToPostTag();

  function handleRespond(source: string, requestId: string, accept: boolean, otherProfileId: string | null) {
    if (source === "post_tag") respondToTag({ postId: requestId, accept });
    else respond({ requestId, accept, otherProfileId });
  }

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

  const requestNotifications = notifications.filter(isRequestNotification);
  const generalNotifications = notifications.filter((n) => !isRequestNotification(n));
  const pendingRequestCount = requestNotifications.filter(isPendingRequest).length;

  const visibleNotifications = activeTab === "requests" ? requestNotifications : generalNotifications;
  // Scoped to whichever tab is active -- pending friend requests must be
  // resolved via Accept/Decline, not dismissed outright (same rule
  // NotificationRow uses to hide their delete button), so "Clear All"
  // leaves them in place even while viewing the Requests tab.
  const clearableNotifications = visibleNotifications.filter((n) => !isPendingRequest(n));

  const clearAllMutation = useMutation({
    mutationFn: () => deleteNotifications(clearableNotifications.map((n) => n.notificationId)),
    onMutate: async () => {
      if (!userId) return;
      await queryClient.cancelQueries({ queryKey: queryKeys.notifications(userId) });
      const previous = queryClient.getQueryData<Notification[]>(queryKeys.notifications(userId));
      const clearIds = new Set(clearableNotifications.map((n) => n.notificationId));
      queryClient.setQueryData<Notification[]>(queryKeys.notifications(userId), (old = []) =>
        old.filter((n) => !clearIds.has(n.notificationId))
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (userId && context?.previous) {
        queryClient.setQueryData(queryKeys.notifications(userId), context.previous);
      }
    },
    onSettled: () => {
      if (!userId) return;
      // The unread-count badge (DrawerMenu's bell icon) reads this same key,
      // so invalidating it here is what actually clears the indicator once
      // every notification -- read or not -- is gone.
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.notificationsUnreadCount(userId) });
    },
  });

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerTextCol}>
          <Text style={styles.heading}>NOTIFICATIONS</Text>
          <Text style={styles.subheading} numberOfLines={1}>
            {"// everything you've earned and missed"}
          </Text>
        </View>
        {clearableNotifications.length > 0 && (
          // Orange "gaffer tape" strip: the theme's warning tape, for an
          // action that deletes everything clearable.
          <DuctTapeLabel
            color={C.tapeOrange}
            onPress={() => clearAllMutation.mutate()}
            disabled={clearAllMutation.isPending}
            style={[styles.clearAllTape, clearAllMutation.isPending && styles.clearAllTapeBusy]}
            accessibilityLabel="Clear all notifications"
          >
            <Text style={styles.clearAllText}>CLEAR ALL</Text>
          </DuctTapeLabel>
        )}
      </View>

      <NotificationTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        pendingRequestCount={pendingRequestCount}
      />

      {isLoading ? (
        <View style={styles.centeredMsg}>
          <ActivityIndicator color={C.primary} />
        </View>
      ) : visibleNotifications.length === 0 ? (
        <View style={styles.centeredMsg}>
          <Ionicons name="notifications-outline" size={32} color={C.muted} />
          <Text style={styles.emptyLabel}>
            {activeTab === "requests" ? "NO REQUESTS" : "NO NOTIFICATIONS YET"}
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {visibleNotifications.map((notification) => (
            <NotificationRow
              key={notification.notificationId}
              notification={notification}
              onDelete={(id) => deleteMutation.mutate(id)}
              onRespond={handleRespond}
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
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: C.border,
  },
  headerTextCol: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "baseline",
    gap: 10,
  },
  // Square-edged strip; colour and tilt come from DuctTapeLabel.
  clearAllTape: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  clearAllTapeBusy: {
    opacity: 0.5,
  },
  clearAllText: {
    fontFamily: F.mono,
    fontSize: 11,
    color: C.onTapeOrange,
    letterSpacing: 1.5,
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
