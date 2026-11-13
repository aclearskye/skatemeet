import { useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useDiscoverable } from "@/lib/nearby/hooks/useDiscoverable";
import { useNearbySkaters } from "@/lib/nearby/hooks/useNearbySkaters";
import { useSearchLocation } from "@/lib/nearby/hooks/useSearchLocation";
import { nearbyListStatus, shortPlaceName } from "@/lib/nearby/types";
import { useProfileSearch } from "@/lib/profiles/hooks/useProfileSearch";
import type { ProfileSearchResult } from "@/lib/profiles/queries";
import { C, F } from "@/lib/theme";
import { DiscoverabilityToggle } from "@/components/search/DiscoverabilityToggle";
import { NearbySkatersList } from "@/components/search/NearbySkatersList";
import { SearchBar } from "@/components/search/SearchBar";
import { SearchLocationButton } from "@/components/search/SearchLocationButton";
import { SearchLocationModal } from "@/components/search/SearchLocationModal";
import { UserSearchResultCard } from "@/components/search/UserSearchResultCard";

// With an empty search bar this lists skaters near the search location
// (the device's own, or a city the user picked); typing switches to
// username search.
export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const { results, isSearching, enabled } = useProfileSearch(query);
  const searchLocation = useSearchLocation();
  const nearby = useNearbySkaters(searchLocation.coords);
  const discoverable = useDiscoverable();

  const customLabel = searchLocation.location?.kind === "custom" ? searchLocation.location.label : null;
  const nearbyStatus = nearbyListStatus({
    locationStatus: searchLocation.status,
    hasCoords: searchLocation.coords != null,
    isLoading: nearby.isLoading,
    errorCode: nearby.errorCode,
    resultCount: nearby.results.length,
  });

  function handleSelect(result: ProfileSearchResult) {
    router.push(`/user/${result.profileId}` as any);
  }

  function handleLoadMore() {
    if (nearby.hasNextPage && !nearby.isFetchingNextPage) nearby.fetchNextPage();
  }

  function handleRetry() {
    if (searchLocation.coords == null) searchLocation.retryCurrent();
    else nearby.refetch();
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headingRow}>
          <Text style={styles.heading}>SEARCH</Text>
          <DiscoverabilityToggle
            isDiscoverable={discoverable.isDiscoverable}
            isPrivate={discoverable.isPrivate}
            onToggle={discoverable.setDiscoverable}
          />
        </View>
        <SearchBar value={query} onChangeText={setQuery} />
        {!enabled && (
          <SearchLocationButton
            label={customLabel ?? "Current location"}
            onPress={() => setIsLocationModalOpen(true)}
          />
        )}
      </View>

      {!enabled ? (
        <NearbySkatersList
          status={nearbyStatus}
          areaName={customLabel ? shortPlaceName(customLabel) : null}
          results={nearby.results}
          isFetchingNextPage={nearby.isFetchingNextPage}
          bottomInset={insets.bottom}
          onSelect={handleSelect}
          onEndReached={handleLoadMore}
          onChangeLocation={() => setIsLocationModalOpen(true)}
          onRetry={handleRetry}
        />
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
          renderItem={({ item }) => <UserSearchResultCard result={item} onPress={() => handleSelect(item)} />}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
        />
      )}

      <SearchLocationModal
        visible={isLocationModalOpen}
        location={searchLocation.location}
        isCurrentLocationDenied={searchLocation.location?.kind === "current" && searchLocation.status === "denied"}
        onSelect={searchLocation.setLocation}
        onClose={() => setIsLocationModalOpen(false)}
      />
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
  headingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
});
