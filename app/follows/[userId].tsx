import { useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { useFollowCounts } from "@/lib/follows/hooks/useFollowCounts";
import { useFollowList } from "@/lib/follows/hooks/useFollowList";
import { removeFollower } from "@/lib/follows/mutations";
import type { FollowDirection } from "@/lib/follows/types";
import { C, F } from "@/lib/theme";
import { queryKeys } from "@/utils/queryKeys";
import { FollowListRow } from "@/components/profile/FollowListRow";

// Instagram-style Followers / Following lists, with search and (on your own
// Followers) Remove. The Following count lives here, not on the profile.
export default function FollowsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session } = useAuthContext();
  const { userId, tab } = useLocalSearchParams<{ userId: string; tab?: FollowDirection }>();
  const [direction, setDirection] = useState<FollowDirection>(tab === "following" ? "following" : "followers");
  const [query, setQuery] = useState("");
  const viewerId = session?.user.id ?? null;
  const isOwn = viewerId === userId;

  const { data: counts } = useFollowCounts(userId ?? null);
  const list = useFollowList(userId ?? "", direction, query.trim());
  const items = list.data?.pages.flat() ?? [];

  async function handleRemove(profileId: string) {
    await removeFollower(profileId).catch(() => {});
    if (!userId) return;
    queryClient.invalidateQueries({ queryKey: queryKeys.followListBase(userId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.followCounts(userId) });
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={20} color={C.text} />
        </TouchableOpacity>
        <View style={styles.segments}>
          {(["followers", "following"] as const).map((d) => (
            <TouchableOpacity
              key={d}
              style={[styles.segment, direction === d && styles.segmentActive]}
              onPress={() => setDirection(d)}
              activeOpacity={0.8}
            >
              <Text style={[styles.segmentText, direction === d && styles.segmentTextActive]}>
                {(d === "followers" ? counts?.followers : counts?.following) ?? 0} {d.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TextInput
        style={styles.search}
        placeholder="Search"
        placeholderTextColor={C.muted}
        value={query}
        onChangeText={setQuery}
        autoCapitalize="none"
        autoCorrect={false}
      />

      {list.isLoading ? (
        <ActivityIndicator color={C.primary} style={styles.spinner} />
      ) : (
        <FlatList
          // Search box is at the top; dragging the results drops the keyboard
          // so the end of the list can be reached.
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          data={items}
          keyExtractor={(i) => i.profileId}
          contentContainerStyle={styles.list}
          onEndReached={() => list.hasNextPage && !list.isFetchingNextPage && list.fetchNextPage()}
          ListEmptyComponent={<Text style={styles.empty}>{direction === "followers" ? "NO FOLLOWERS YET" : "NOT FOLLOWING ANYONE YET"}</Text>}
          renderItem={({ item }) => (
            <FollowListRow
              item={item}
              isViewer={item.profileId === viewerId}
              onRemove={isOwn && direction === "followers" ? handleRemove : undefined}
            />
          )}
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
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: C.border,
  },
  segments: {
    flex: 1,
    flexDirection: "row",
  },
  segment: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  segmentActive: {
    borderBottomColor: C.primary,
  },
  segmentText: {
    fontFamily: F.mono,
    fontSize: 11,
    color: C.muted,
    letterSpacing: 1,
  },
  segmentTextActive: {
    color: C.primary,
  },
  search: {
    margin: 16,
    marginBottom: 4,
    backgroundColor: C.surface,
    borderWidth: 2,
    borderColor: C.border,
    color: C.text,
    fontFamily: F.body,
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  spinner: { marginTop: 24 },
  list: { paddingHorizontal: 16, paddingBottom: 40 },
  empty: {
    fontFamily: F.monoRegular,
    fontSize: 12,
    color: C.muted,
    marginTop: 24,
    textAlign: "center",
  },
});
