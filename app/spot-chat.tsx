import { useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useToast } from "@/lib/context/toast-context";
import { KeyboardAvoidingView } from "@/lib/shared/keyboard";
import { useBlockSpotChatSender } from "@/lib/spotChat/hooks/useBlockSpotChatSender";
import { useClearSpotChat } from "@/lib/spotChat/hooks/useClearSpotChat";
import { useHideSpotChatMessage } from "@/lib/spotChat/hooks/useHideSpotChatMessage";
import { useJoinSpotChat } from "@/lib/spotChat/hooks/useJoinSpotChat";
import { useLeaveSpotChat } from "@/lib/spotChat/hooks/useLeaveSpotChat";
import { useReportSpotChatMessage } from "@/lib/spotChat/hooks/useReportSpotChatMessage";
import { useSendSpotChatMessage } from "@/lib/spotChat/hooks/useSendSpotChatMessage";
import { useSpotChatMessages } from "@/lib/spotChat/hooks/useSpotChatMessages";
import { useSpotChatRealtime } from "@/lib/spotChat/hooks/useSpotChatRealtime";
import { useSpotChatRoom } from "@/lib/spotChat/hooks/useSpotChatRoom";
import {
  SPOT_CHAT_REPORT_REASONS,
  startsSenderRun,
  type SpotChatMessage,
  type SpotChatReportReason,
  type SpotChatSpotRef,
} from "@/lib/spotChat/types";
import { C, F } from "@/lib/theme";
import { MessageComposer } from "@/components/chats/MessageComposer";
import { ReportMessageSheet, type ReportMessageSubmit } from "@/components/chats/ReportMessageSheet";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { SpotChatHeader } from "@/components/spotChat/SpotChatHeader";
import { SpotChatJoinPanel } from "@/components/spotChat/SpotChatJoinPanel";
import { SpotChatMessageRow } from "@/components/spotChat/SpotChatMessageRow";

type Params = { spotId?: string; osmPlaceId?: string; name?: string; diy?: string };

export default function SpotChatScreen() {
  const params = useLocalSearchParams<Params>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { showToast } = useToast();

  const spotRef: SpotChatSpotRef = {
    spotId: params.spotId || null,
    osmSpotPlaceId: params.spotId ? null : params.osmPlaceId || null,
  };
  const spotName = params.name || "Spot";
  const isDiy = params.diy === "1";
  const accent = isDiy ? C.tertiary : C.primary;
  const onAccent = isDiy ? C.onTertiary : C.onPrimary;

  const [reportTarget, setReportTarget] = useState<SpotChatMessage | null>(null);
  const [blockTarget, setBlockTarget] = useState<SpotChatMessage | null>(null);

  const { data: room, isLoading: roomLoading, isError: roomError, refetch: refetchRoom } = useSpotChatRoom(spotRef);
  const roomId = room?.roomId ?? null;
  const isMember = room?.isMember ?? false;

  const { messages, isLoading, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useSpotChatMessages(roomId, isMember);
  useSpotChatRealtime(roomId, isMember);

  const { join, isJoining } = useJoinSpotChat(spotRef);
  const { leave } = useLeaveSpotChat(spotRef, roomId);
  const { clear } = useClearSpotChat(roomId);
  const { send } = useSendSpotChatMessage(roomId);
  const { hide } = useHideSpotChatMessage(roomId);
  const { blockSender } = useBlockSpotChatSender(roomId);
  const { report } = useReportSpotChatMessage(roomId);

  function showError(err: Error) {
    showToast({ message: err.message.toUpperCase(), variant: "danger" });
  }

  async function handleReportSubmit(input: ReportMessageSubmit<SpotChatReportReason>) {
    if (!reportTarget) return;
    await new Promise<void>((resolve, reject) =>
      report({ messageId: reportTarget.messageId, ...input }, { onSuccess: () => resolve(), onError: reject })
    );
    showToast({
      message: input.block ? "REPORTED AND BLOCKED" : "THANKS — A MODERATOR WILL TAKE A LOOK",
      variant: "success",
    });
  }

  function handleConfirmBlock() {
    const target = blockTarget;
    setBlockTarget(null);
    if (!target) return;
    blockSender(target.messageId, {
      onSuccess: () => showToast({ message: "BLOCKED", variant: "success" }),
      onError: showError,
    });
  }

  function renderBody() {
    if (roomLoading || (isMember && isLoading)) {
      return (
        <View style={styles.statusWrap}>
          <ActivityIndicator color={accent} />
        </View>
      );
    }
    if (roomError || (isMember && isError)) {
      return (
        <View style={styles.statusWrap}>
          <Text style={styles.statusText} onPress={() => (roomError ? refetchRoom() : refetch())}>
            {"// COULDN'T LOAD THE CHAT — TAP TO RETRY"}
          </Text>
        </View>
      );
    }
    if (!isMember) {
      return (
        <View style={styles.statusWrap}>
          <Text style={styles.statusText}>
            {room && room.memberCount > 0
              ? `// ${room.memberCount} ${room.memberCount === 1 ? "SKATER IS" : "SKATERS ARE"} TALKING ABOUT THIS SPOT`
              : "// NOBODY'S HERE YET — START THE CONVO"}
          </Text>
        </View>
      );
    }
    return (
      <FlatList
        inverted
        data={messages}
        keyExtractor={(message) => message.messageId}
        renderItem={({ item, index }) => (
          <SpotChatMessageRow
            message={item}
            showSender={startsSenderRun(messages, index)}
            onDeleteForMe={(message) => hide(message.messageId, { onError: showError })}
            onReport={setReportTarget}
            onBlock={setBlockTarget}
          />
        )}
        onEndReached={() => hasNextPage && !isFetchingNextPage && fetchNextPage()}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          isFetchingNextPage ? <ActivityIndicator color={accent} style={styles.pageSpinner} /> : null
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.statusText}>{"// NO MESSAGES YET — SAY WHAT'S UP 🛹"}</Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container}>
      <SpotChatHeader
        spotName={spotName}
        memberCount={room?.memberCount ?? 0}
        isMember={isMember}
        accent={accent}
        topInset={insets.top}
        onBack={() => router.back()}
        onClear={() => clear(undefined, { onError: showError })}
        onLeave={() => leave(undefined, { onError: showError })}
      />

      {renderBody()}

      {room && !isMember ? (
        <SpotChatJoinPanel
          canJoin={room.canJoin}
          isJoining={isJoining}
          accent={accent}
          onAccent={onAccent}
          bottomInset={insets.bottom}
          onJoin={() => join(undefined, { onError: showError })}
        />
      ) : isMember ? (
        <MessageComposer bottomInset={insets.bottom} onSend={(body) => send(body, { onError: showError })} />
      ) : null}

      <ReportMessageSheet<SpotChatReportReason>
        visible={reportTarget != null}
        reasons={SPOT_CHAT_REPORT_REASONS}
        blockOption={
          reportTarget
            ? {
                title: `Also block ${reportTarget.senderName}`,
                description: "Hides their messages in every spot chat and stops DMs and friend requests both ways.",
              }
            : null
        }
        onClose={() => setReportTarget(null)}
        onSubmit={handleReportSubmit}
      />

      <ConfirmDialog
        visible={blockTarget != null}
        title={`BLOCK ${blockTarget?.senderName.toUpperCase() ?? ""}?`}
        message="You won't see each other's messages in any spot chat, and neither of you can message or send friend requests. They won't be told."
        confirmLabel="BLOCK"
        onConfirm={handleConfirmBlock}
        onCancel={() => setBlockTarget(null)}
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
  // The inverted FlatList already flips ListEmptyComponent (see app/chat/[conversationId].tsx).
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
  },
  listContent: {
    flexGrow: 1,
    paddingVertical: 12,
  },
  pageSpinner: {
    marginVertical: 12,
  },
});
