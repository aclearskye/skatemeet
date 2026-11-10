import { useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useProfileSearch } from "@/lib/profiles/hooks/useProfileSearch";
import type { ProfileSearchResult } from "@/lib/profiles/queries";
import { C, F } from "@/lib/theme";
import { SearchBar } from "@/components/search/SearchBar";
import { UserSearchResultCard } from "@/components/search/UserSearchResultCard";

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const { results, isSearching, enabled } = useProfileSearch(query);

  function handleSelect(result: ProfileSearchResult) {
    router.push(`/user/${result.profileId}` as any);
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.heading}>SEARCH</Text>
        <SearchBar value={query} onChangeText={setQuery} />
      </View>

      {!enabled ? (
        <View style={styles.statusWrap}>
          <Text style={styles.statusText}>{"// SEARCH FOR A SKATER BY USERNAME"}</Text>
        </View>
      ) : isSearching ? (
        <View style={styles.statusWrap}>
          <ActivityIndicator color={C.primary} />
          <Text style={styles.statusText}>{"// SEARCHING…"}</Text>
        </View>
      ) : results.length === 0 ? (
        <View style={styles.statusWrap}>
          <Text style={styles.statusText}>{`// NOTHING FOUND FOR "${query.toUpperCase()}"`}</Text>
        </View>
      ) : (
        <FlatList
          // Search box is at the top; dragging the results drops the keyboard
          // so the end of the list can be reached.
          keyboardDismissMode="on-drag"
          data={results}
          keyExtractor={(result) => result.profileId}
          renderItem={({ item }) => (
            <View style={styles.cardWrap}>
              <UserSearchResultCard result={item} onPress={() => handleSelect(item)} />
            </View>
          )}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    gap: 12,
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
  listContent: {
    padding: 16,
    gap: 10,
  },
  cardWrap: {},
});
