import { ActivityIndicator, FlatList, Text, TouchableOpacity, View } from "react-native";
import type { NearbyListStatus } from "@/lib/nearby/types";
import type { ProfileSearchResult } from "@/lib/profiles/queries";
import { C } from "@/lib/theme";
import { UserSearchResultCard } from "@/components/search/UserSearchResultCard";
import { styles } from "./NearbySkatersList.styles";

type Props = {
  status: NearbyListStatus;
  areaName: string | null;
  results: ProfileSearchResult[];
  isFetchingNextPage: boolean;
  bottomInset: number;
  onSelect: (result: ProfileSearchResult) => void;
  onEndReached: () => void;
  onChangeLocation: () => void;
  onRetry: () => void;
};

const STATUS_MESSAGES: Record<Exclude<NearbyListStatus, "ready" | "loading" | "locating">, string> = {
  noLocation: "// TURN ON LOCATION OR PICK A CITY TO FIND SKATERS NEARBY",
  error: "// COULDN'T LOAD NEARBY SKATERS",
  rateLimited: "// TOO MANY LOCATION CHANGES — TRY AGAIN IN A BIT",
  notEligible: "// NEARBY SEARCH ISN'T AVAILABLE FOR THIS ACCOUNT",
  empty: "// NO SKATERS AROUND HERE YET",
};

// Skaters near the search location, loading more as the list is scrolled.
// Never shows how far away anyone is.
export function NearbySkatersList({
  status,
  areaName,
  results,
  isFetchingNextPage,
  bottomInset,
  onSelect,
  onEndReached,
  onChangeLocation,
  onRetry,
}: Props) {
  if (status === "locating" || status === "loading") {
    return (
      <View style={styles.statusWrap}>
        <ActivityIndicator color={C.primary} />
        <Text style={styles.statusText}>
          {status === "locating" ? "// FINDING YOUR LOCATION…" : "// LOOKING FOR SKATERS…"}
        </Text>
      </View>
    );
  }

  if (status !== "ready") {
    const action =
      status === "noLocation" || status === "empty"
        ? { label: "CHANGE LOCATION", onPress: onChangeLocation }
        : status === "error"
          ? { label: "TRY AGAIN", onPress: onRetry }
          : null;
    return (
      <View style={styles.statusWrap}>
        <Text style={styles.statusText}>{STATUS_MESSAGES[status]}</Text>
        {action && (
          <TouchableOpacity style={styles.action} onPress={action.onPress} activeOpacity={0.8}>
            <Text style={styles.actionText}>{action.label}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <FlatList
      data={results}
      keyExtractor={(result) => result.profileId}
      ListHeaderComponent={
        <Text style={styles.heading}>
          {areaName ? `SKATERS NEAR ${areaName.toUpperCase()}` : "SKATERS NEAR YOU"}
        </Text>
      }
      renderItem={({ item }) => <UserSearchResultCard result={item} onPress={() => onSelect(item)} />}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      ListFooterComponent={
        isFetchingNextPage ? <ActivityIndicator style={styles.footer} color={C.primary} /> : null
      }
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[styles.listContent, { paddingBottom: bottomInset + 24 }]}
    />
  );
}
