import { useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDebouncedValue } from "@/lib/shared/hooks/useDebouncedValue";
import { useStoreCheckins } from "@/lib/tickets/hooks/useStoreCheckins";
import { C, F, R } from "@/lib/theme";
import { BackButton } from "@/components/common/BackButton";
import { CheckinRow } from "@/components/tickets/CheckinRow";

type CheckinTab = "today" | "all";

const TABS: { key: CheckinTab; label: string }[] = [
  { key: "today", label: "TODAY" },
  { key: "all", label: "ALL" },
];

const SEARCH_DELAY_MS = 300;

// Every skater who has got in with a SkateMeet ticket, newest first.
// Staff can search by name to see whether someone has already signed in.
export default function StoreCheckinsScreen() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<CheckinTab>("today");
  const [search, setSearch] = useState("");
  const query = useDebouncedValue(search.trim(), SEARCH_DELAY_MS);
  const checkins = useStoreCheckins(query, tab === "today");
  const rows = checkins.data?.pages.flat() ?? [];

  const empty = checkins.isError
    ? "COULDN'T LOAD CHECK-INS"
    : query
      ? "NO ONE BY THAT NAME"
      : tab === "today"
        ? "NO ONE HAS CHECKED IN TODAY"
        : "NO CHECK-INS YET";

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <BackButton />
        <View style={styles.headerText}>
          <Text style={styles.heading}>CHECK-INS</Text>
          <Text style={styles.subheading}>{"// skaters in with a SkateMeet ticket"}</Text>
        </View>
      </View>

      <View style={styles.controls}>
        <View style={styles.tabs} accessibilityRole="tablist">
          {TABS.map(({ key, label }) => (
            <TouchableOpacity
              key={key}
              style={[styles.tab, tab === key && styles.tabSelected]}
              onPress={() => setTab(key)}
              activeOpacity={0.8}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === key }}
            >
              <Text style={[styles.tabText, tab === key && styles.tabTextSelected]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.search}>
          <Ionicons name="search-outline" size={16} color={C.muted} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search by name"
            placeholderTextColor={C.muted}
            autoCorrect={false}
            returnKeyType="search"
          />
        </View>
      </View>

      {checkins.isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={C.primary} />
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.checkinId}
          renderItem={({ item }) => <CheckinRow checkin={item} showDate={tab === "all"} />}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
          onEndReached={() => {
            if (checkins.hasNextPage && !checkins.isFetchingNextPage) checkins.fetchNextPage();
          }}
          onEndReachedThreshold={0.4}
          onRefresh={() => checkins.refetch()}
          refreshing={checkins.isRefetching && !checkins.isFetchingNextPage}
          ListEmptyComponent={<Text style={styles.empty}>{empty}</Text>}
          ListFooterComponent={
            checkins.isFetchingNextPage ? <ActivityIndicator color={C.primary} style={styles.more} /> : null
          }
          keyboardShouldPersistTaps="handled"
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
  headerText: { flex: 1, gap: 2 },
  heading: { fontFamily: F.heading, fontSize: 20, color: C.text, letterSpacing: 2 },
  subheading: { fontFamily: F.monoRegular, fontSize: 13, color: C.muted, letterSpacing: 0.5 },
  controls: { gap: 10, padding: 16, paddingBottom: 4 },
  tabs: { flexDirection: "row", gap: 8 },
  tab: {
    flex: 1,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: C.borderVariant,
    borderRadius: R,
  },
  tabSelected: { borderColor: C.primary, backgroundColor: C.primary },
  tabText: { fontFamily: F.mono, fontSize: 11, letterSpacing: 1.5, color: C.text },
  tabTextSelected: { color: C.onPrimary },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: C.borderVariant,
    borderRadius: R,
  },
  searchInput: { flex: 1, height: 40, fontFamily: F.body, fontSize: 14, color: C.text },
  list: { paddingHorizontal: 16 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  empty: { fontFamily: F.mono, fontSize: 11, color: C.muted, letterSpacing: 2, textAlign: "center", paddingTop: 32 },
  more: { paddingVertical: 16 },
});
