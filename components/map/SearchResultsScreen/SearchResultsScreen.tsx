import { EntityPreviewCard } from "@/components/common/EntityPreviewCard";
import type { PreviewItem } from "@/components/map/MapPreviewCard";
import { coordinatesOf, haversineDistanceKm, kmToMiles, type Coordinates } from "@/lib/map/types";
import type { SortMode } from "@/lib/map/useEntitySearch";
import { C } from "@/lib/theme";
import { entityDetailRoute } from "@/utils/entityNavigation";
import { previewItemId } from "@/utils/typeGuards";
import { useRouter } from "expo-router";
import { ActivityIndicator, FlatList, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { styles } from "./SearchResultsScreen.styles";

type Props = {
  query: string;
  results: PreviewItem[];
  isSearching: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  sortMode: SortMode;
  onSortModeChange: (mode: SortMode) => void;
  userLocation: Coordinates | null;
  userUploadedOnly: boolean;
  onToggleUserUploadedOnly: () => void;
};

export function SearchResultsScreen({
  query,
  results,
  isSearching,
  isLoadingMore,
  hasMore,
  onLoadMore,
  sortMode,
  onSortModeChange,
  userLocation,
  userUploadedOnly,
  onToggleUserUploadedOnly,
}: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const hasUserLocation = userLocation !== null;

  function handleSelect(item: PreviewItem) {
    router.push(entityDetailRoute(item) as any);
  }

  function toggleSort(mode: Exclude<SortMode, null>) {
    onSortModeChange(sortMode === mode ? null : mode);
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 116 }]}>
      <View style={styles.sortRow}>
        <TouchableOpacity
          style={[styles.chip, sortMode === "upvotes" && styles.chipActive]}
          onPress={() => toggleSort("upvotes")}
          activeOpacity={0.75}
        >
          <Text style={[styles.chipText, sortMode === "upvotes" && styles.chipTextActive]}>
            MOST UPVOTED
          </Text>
        </TouchableOpacity>
        {hasUserLocation && (
          <TouchableOpacity
            style={[styles.chip, sortMode === "distance" && styles.chipActiveNearest]}
            onPress={() => toggleSort("distance")}
            activeOpacity={0.75}
          >
            <Text style={[styles.chipText, sortMode === "distance" && styles.chipTextActiveNearest]}>
              NEAREST
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.chip, userUploadedOnly && styles.chipActiveUserUploaded]}
          onPress={onToggleUserUploadedOnly}
          activeOpacity={0.75}
        >
          <Text style={[styles.chipText, userUploadedOnly && styles.chipTextActiveUserUploaded]}>
            USER UPLOADED
          </Text>
        </TouchableOpacity>
      </View>

      {isSearching ? (
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
          data={results}
          keyExtractor={previewItemId}
          renderItem={({ item }) => {
            const distanceMiles =
              sortMode === "distance" && userLocation
                ? kmToMiles(haversineDistanceKm(userLocation, coordinatesOf(item.data)))
                : undefined;
            return (
              <View style={styles.cardWrap}>
                <EntityPreviewCard
                  item={item}
                  onPress={() => handleSelect(item)}
                  initialHasVoted={false}
                  distanceMiles={distanceMiles}
                />
              </View>
            );
          }}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
          onEndReached={() => hasMore && !isLoadingMore && onLoadMore()}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            isLoadingMore ? (
              <View style={styles.footerLoading}>
                <ActivityIndicator color={C.primary} />
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}
