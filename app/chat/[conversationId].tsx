import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useBlockProfile } from "@/lib/blocks/hooks/useBlockProfile";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { useToast } from "@/lib/context/toast-context";
import { useChatSummary } from "@/lib/messages/hooks/useChatSummary";
import { useClearConversation } from "@/lib/messages/hooks/useClearConversation";
import { useConversationMessages } from "@/lib/messages/hooks/useConversationMessages";
import { useDeleteConversation } from "@/lib/messages/hooks/useDeleteConversation";
import { useMarkConversationRead } from "@/lib/messages/hooks/useMarkConversationRead";
import { useOtherLastReadAt } from "@/lib/messages/hooks/useOtherLastReadAt";
import { useReportMessage } from "@/lib/messages/hooks/useReportMessage";
import { useSendMessage } from "@/lib/messages/hooks/useSendMessage";
import { messageStatus, type Message } from "@/lib/messages/types";
import { C, F } from "@/lib/theme";
import { ChatHeader } from "@/components/chats/ChatHeader";
import { ChatLockedBanner, type ChatLockReason } from "@/components/chats/ChatLockedBanner";
import { MessageBubble } from "@/components/chats/MessageBubble";
import { MessageComposer } from "@/components/chats/MessageComposer";
import { ReportMessageSheet, type ReportMessageSubmit } from "@/components/chats/ReportMessageSheet";

export default function ChatThreadScreen() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { showToast } = useToast();
  const { session } = useAuthContext();
  const viewerId = session?.user.id ?? "";
  const [reportTarget, setReportTarget] = useState<Message | null>(null);

  const { data: chat, isLoading: chatLoading } = useChatSummary(conversationId);
  const { messages, isLoading, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useConversationMessages(conversationId);
  const { data: otherLastReadAt = null } = useOtherLastReadAt(conversationId);
  const { send } = useSendMessage(conversationId ?? "");
  const { markRead } = useMarkConversationRead(conversationId);
  const { clear } = useClearConversation(conversationId ?? "");
  const { deleteChat } = useDeleteConversation(conversationId ?? "");
  const { report } = useReportMessage(conversationId ?? "");
  const { block, unblock } = useBlockProfile(chat?.otherProfileId ?? "");

  function showError(err: Error) {
    showToast({ message: err.message.toUpperCase(), variant: "danger" });
  }

  useFocusEffect(
    useCallback(() => {
      markRead();
      // markRead is recreated each render; only re-run on refocus.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [conversationId])
  );

  // A message arriving while the thread is open counts as read straight away.
  const newestIncomingId = messages.find((m) => m.senderId !== viewerId)?.messageId;
  useEffect(() => {
    if (newestIncomingId) markRead();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newestIncomingId]);

  const lockReason: ChatLockReason | null = !chat
    ? null
    : chat.otherState === "unavailable"
      ? "unavailable"
      : chat.otherState === "blocked_by_me"
        ? "blocked_by_me"
        : chat.canMessage
          ? null
          : "not_friends";

  function handleDelete() {
    deleteChat(undefined, {
      onSuccess: () => router.back(),
      onError: showError,
    });
  }

  async function handleReportSubmit(input: ReportMessageSubmit) {
    if (!reportTarget) return;
    await new Promise<void>((resolve, reject) =>
      report({ messageId: reportTarget.messageId, ...input }, { onSuccess: () => resolve(), onError: reject })
    );
    showToast({
      message: input.block ? "REPORTED AND BLOCKED" : "THANKS — WE'LL TAKE A LOOK",
      variant: "success",
    });
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ChatHeader
        chat={chat ?? null}
        topInset={insets.top}
        onBack={() => router.back()}
        onOpenProfile={(profileId) => router.push(`/user/${profileId}` as any)}
        onClear={() => clear(undefined, { onError: showError })}
        onDelete={handleDelete}
        onBlock={() => block({ onError: showError })}
      />

      {isLoading || chatLoading ? (
        <View style={styles.statusWrap}>
          <ActivityIndicator color={C.primary} />
        </View>
      ) : isError ? (
        <View style={styles.statusWrap}>
          <Text style={styles.statusText} onPress={() => refetch()}>
            {"// COULDN'T LOAD MESSAGES — TAP TO RETRY"}
          </Text>
        </View>
      ) : (
        <FlatList
          inverted
          data={messages}
          keyExtractor={(message) => message.messageId}
          renderItem={({ item }) => (
            <MessageBubble
              message={item}
              isOwn={item.senderId === viewerId}
              status={messageStatus(item, otherLastReadAt)}
              onReport={setReportTarget}
            />
          )}
          onEndReached={() => hasNextPage && !isFetchingNextPage && fetchNextPage()}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            isFetchingNextPage ? <ActivityIndicator color={C.primary} style={styles.pageSpinner} /> : null
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.statusText}>{lockReason ? "// NO MESSAGES" : "// SAY HI 👋"}</Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
        />
      )}

      {lockReason ? (
        <ChatLockedBanner
          reason={lockReason}
          bottomInset={insets.bottom}
          onUnblock={() => unblock({ onError: showError })}
        />
      ) : chat ? (
        <MessageComposer bottomInset={insets.bottom} onSend={(body) => send(body, { onError: showError })} />
      ) : null}

      <ReportMessageSheet
        visible={reportTarget != null}
        username={chat?.otherState === "active" ? chat.otherUsername : null}
        onClose={() => setReportTarget(null)}
        onSubmit={handleReportSubmit}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  statusWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  statusText: {
    fontFamily: F.monoRegular,
    fontSize: 12,
    color: C.muted,
    textAlign: "center",
  },
  // Inverted list: the empty state renders upside down unless flipped back.
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    transform: [{ scaleY: -1 }],
  },
  listContent: {
    flexGrow: 1,
    paddingVertical: 12,
  },
  pageSpinner: {
    marginVertical: 12,
  },
});
