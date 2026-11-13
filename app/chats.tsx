import { useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { useChatList } from "@/lib/messages/hooks/useChatList";
import { useOpenConversation } from "@/lib/messages/hooks/useOpenConversation";
import { chatDisplayName, type ChatListItem } from "@/lib/messages/types";
import { useMySpotChats } from "@/lib/spotChat/hooks/useMySpotChats";
import type { SpotChatListItem } from "@/lib/spotChat/types";
import { C, F } from "@/lib/theme";
import { ChatListCard } from "@/components/chats/ChatListCard";
import { DmChatRow } from "@/components/chats/DmChatRow";
import { ChatsEmptyState } from "@/components/chats/ChatsEmptyState";
import { SearchBar } from "@/components/search/SearchBar";
import { SpotChatRow } from "@/components/spotChat/SpotChatRow";

type Row = { kind: "dm"; chat: ChatListItem } | { kind: "spot"; chat: SpotChatListItem };

// When a row last had activity, for ordering. Spot chats with no messages
// fall back to when you joined; "Say hi" cards (no conversation) sort last.
function rowTime(row: Row): string | null {
  if (row.kind === "spot") return row.chat.lastMessageAt ?? row.chat.joinedAt;
  return row.chat.lastMessageAt;
}

// DMs and joined spot chats in one list, most recent first. The sort is
// stable, so untimed "Say hi" cards keep get_my_chats' order at the end.
function mergeRows(dms: ChatListItem[], spots: SpotChatListItem[]): Row[] {
  const rows: Row[] = [
    ...spots.map((chat): Row => ({ kind: "spot", chat })),
    ...dms.map((chat): Row => ({ kind: "dm", chat })),
  ];
  return rows.sort((a, b) => {
    const ta = rowTime(a);
    const tb = rowTime(b);
    if (ta && tb) return tb.localeCompare(ta);
    if (ta) return -1;
    if (tb) return 1;
    return 0;
  });
}

// Matches the name on the card: a spot's name, or the other skater's
// display name / @username.
function matchesSearch(row: Row, query: string): boolean {
  if (!query) return true;
  const needle = query.toLowerCase();
  if (row.kind === "spot") return row.chat.spotName.toLowerCase().includes(needle);
  const names = [chatDisplayName(row.chat), row.chat.otherUsername ?? ""];
  return names.some((name) => name.toLowerCase().includes(needle));
}

function rowKey(row: Row): string {
  if (row.kind === "spot") return `spot-${row.chat.roomId}`;
  return row.chat.conversationId ?? `friend-${row.chat.otherProfileId}`;
}

export default function ChatsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session } = useAuthContext();
  const viewerId = session?.user.id ?? "";
  const { data: chats = [], isLoading, isError, refetch } = useChatList();
  const spotChats = useMySpotChats();
  const { openChat, isOpening } = useOpenConversation();
  const [search, setSearch] = useState("");
  const allRows = mergeRows(chats, spotChats.data ?? []);
  const query = search.trim();
  const rows = allRows.filter((row) => matchesSearch(row, query));

  function handleSpotPress(chat: SpotChatListItem) {
    router.push({
      // Same cast as SpotChatButton until expo-router regenerates typed routes.
      pathname: "/spot-chat" as never,
      params: {
        spotId: chat.spotRef.spotId ?? "",
        osmPlaceId: chat.spotRef.osmSpotPlaceId ?? "",
        name: chat.spotName,
        diy: chat.isDiy ? "1" : "0",
      },
    });
  }

  // Only a pull shows the spinner. Background refetches (e.g. coming back
  // from a chat) must not drive `refreshing`: on iOS that pushes the list
  // down for the spinner and can leave it stuck there.
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);

  async function handleRefresh() {
    setIsPullRefreshing(true);
    try {
      await Promise.all([refetch(), spotChats.refetch()]);
    } finally {
      setIsPullRefreshing(false);
    }
  }

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

      {isLoading || spotChats.isLoading ? (
        <View style={styles.statusWrap}>
          <ActivityIndicator color={C.primary} />
        </View>
      ) : isError && allRows.length === 0 ? (
        <View style={styles.statusWrap}>
          <Text style={styles.statusText}>{"// COULDN'T LOAD YOUR CHATS"}</Text>
          <TouchableOpacity onPress={handleRefresh} activeOpacity={0.7}>
            <Text style={styles.retryText}>TRY AGAIN</Text>
          </TouchableOpacity>
        </View>
      ) : allRows.length === 0 ? (
        <ChatsEmptyState onFindSkaters={() => router.push("/search" as any)} />
      ) : (
        <FlatList
          ListHeaderComponent={
            <View style={styles.searchWrap}>
              <SearchBar value={search} onChangeText={setSearch} placeholder="Search chats…" />
            </View>
          }
          ListEmptyComponent={
            <Text style={[styles.statusText, styles.noMatches]}>{`// NO CHATS MATCH "${query.toUpperCase()}"`}</Text>
          }
          keyboardShouldPersistTaps="handled"
          data={rows}
          keyExtractor={rowKey}
          renderItem={({ item }) => {
            if (item.kind === "spot") {
              return <SpotChatRow chat={item.chat} onPress={() => handleSpotPress(item.chat)} />;
            }
            const { conversationId } = item.chat;
            // "Say hi" cards have no conversation yet: nothing to mute or delete.
            return conversationId ? (
              <DmChatRow
                chat={{ ...item.chat, conversationId }}
                viewerId={viewerId}
                onPress={() => handlePress(item.chat)}
              />
            ) : (
              <ChatListCard chat={item.chat} viewerId={viewerId} onPress={() => handlePress(item.chat)} />
            );
          }}
          onRefresh={handleRefresh}
          refreshing={isPullRefreshing}
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
  searchWrap: { paddingHorizontal: 16, paddingVertical: 12 },
  noMatches: { marginTop: 32, paddingHorizontal: 24 },
  retryText: {
    fontFamily: F.mono,
    fontSize: 11,
    color: C.primary,
    letterSpacing: 2,
  },
});
