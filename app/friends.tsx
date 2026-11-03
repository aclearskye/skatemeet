import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useFriendsList } from "@/lib/friendRequests/hooks/useFriendsList";
import { C, F } from "@/lib/theme";
import { FriendCard } from "@/components/profile/FriendCard";

export default function FriendsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: friends = [], isLoading, isError, refetch } = useFriendsList();

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.heading}>FRIENDS</Text>
        <View style={styles.backBtn} />
      </View>

      {isLoading ? (
        <View style={styles.statusWrap}>
          <ActivityIndicator color={C.primary} />
        </View>
      ) : isError ? (
        <View style={styles.statusWrap}>
          <Text style={styles.statusText}>{"// COULDN'T LOAD YOUR FRIENDS"}</Text>
          <TouchableOpacity onPress={() => refetch()} activeOpacity={0.7}>
            <Text style={styles.retryText}>TRY AGAIN</Text>
          </TouchableOpacity>
        </View>
      ) : friends.length === 0 ? (
        <View style={styles.statusWrap}>
          <Text style={styles.statusText}>{"// NO FRIENDS YET — FIND SKATERS IN SEARCH"}</Text>
        </View>
      ) : (
        <FlatList
          data={friends}
          keyExtractor={(friend) => friend.profileId}
          renderItem={({ item }) => (
            <FriendCard
              friend={item}
              onViewProfile={() => router.push(`/user/${item.profileId}` as any)}
            />
          )}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
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
  listContent: {
    padding: 16,
    gap: 10,
  },
});
