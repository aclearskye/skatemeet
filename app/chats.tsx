import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { useChatList } from "@/lib/messages/hooks/useChatList";
import { useOpenConversation } from "@/lib/messages/hooks/useOpenConversation";
import type { ChatListItem } from "@/lib/messages/types";
import { C, F } from "@/lib/theme";
import { ChatListCard } from "@/components/chats/ChatListCard";
import { ChatsEmptyState } from "@/components/chats/ChatsEmptyState";

export default function ChatsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session } = useAuthContext();
  const viewerId = session?.user.id ?? "";
  const { data: chats = [], isLoading, isError, refetch, isRefetching } = useChatList();
  const { openChat, isOpening } = useOpenConversation();

  function handlePress(chat: ChatListItem) {
    if (chat.conversationId) {
      router.push(`/chat/${chat.conversationId}` as any);
    } else if (chat.otherProfileId && !isOpening) {
      // "Say hi" card: the conversation is created on first open.
      openChat(chat.otherProfileId);
    }
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.heading}>CHATS</Text>
        <View style={styles.backBtn} />
      </View>

      {isLoading ? (
        <View style={styles.statusWrap}>
          <ActivityIndicator color={C.primary} />
        </View>
      ) : isError ? (
        <View style={styles.statusWrap}>
          <Text style={styles.statusText}>{"// COULDN'T LOAD YOUR CHATS"}</Text>
          <TouchableOpacity onPress={() => refetch()} activeOpacity={0.7}>
            <Text style={styles.retryText}>TRY AGAIN</Text>
          </TouchableOpacity>
        </View>
      ) : chats.length === 0 ? (
        <ChatsEmptyState onFindSkaters={() => router.push("/search" as any)} />
      ) : (
        <FlatList
          data={chats}
          keyExtractor={(chat) => chat.conversationId ?? `friend-${chat.otherProfileId}`}
          renderItem={({ item }) => (
            <ChatListCard chat={item} viewerId={viewerId} onPress={() => handlePress(item)} />
          )}
          onRefresh={refetch}
          refreshing={isRefetching}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        />
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
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: C.border,
  },
  backBtn: {
    width: 30,
  },
  heading: {
    fontFamily: F.heading,
    fontSize: 20,
    color: C.text,
    letterSpacing: 2,
  },
  statusWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 24,
  },
  statusText: {
    fontFamily: F.monoRegular,
    fontSize: 12,
    color: C.muted,
    textAlign: "center",
  },
  retryText: {
    fontFamily: F.mono,
    fontSize: 11,
    color: C.primary,
    letterSpacing: 2,
  },
});
