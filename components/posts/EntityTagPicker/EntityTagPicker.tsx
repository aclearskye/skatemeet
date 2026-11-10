import { useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Modal, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useEntitySearch } from "@/lib/map/useEntitySearch";
import { formatDistance, previewItemToTagOption, type EntityTagOption } from "@/lib/posts/entityTagOptions";
import { useNearbyEntityTags } from "@/lib/posts/hooks/useNearbyEntityTags";
import { C } from "@/lib/theme";
import type { FilterKey } from "@/utils/constants";
import { styles } from "./EntityTagPicker.styles";

type Props = {
  visible: boolean;
  onSelect: (option: EntityTagOption) => void;
  onClose: () => void;
};

const ALL_ENTITY_FILTERS = new Set<FilterKey>(["spots", "diys", "stores", "userSpots"]);

// Defaults to the 5 nearest spots/DIYs/stores; typing searches everything.
// No check-in needed to tag (md/media_posts.md §1, Tagging).
export function EntityTagPicker({ visible, onSelect, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const { location, options: nearby, isLoading: nearbyLoading } = useNearbyEntityTags();
  const search = useEntitySearch(query.trim(), ALL_ENTITY_FILTERS, "distance", location);

  const options = useMemo<EntityTagOption[]>(
    () => (search.enabled ? search.results.map((item) => previewItemToTagOption(item, location)) : nearby),
    [search.enabled, search.results, nearby, location]
  );
  const isLoading = search.enabled ? search.isSearching : nearbyLoading;

  function handleSelect(option: EntityTagOption) {
    setQuery("");
    onSelect(option);
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.root, { paddingTop: insets.top + 12, paddingBottom: insets.bottom }]}>
        {/* Tapping a result saves it; back leaves the tag unchanged. */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} hitSlop={12} accessibilityLabel="Back without changing the tag">
            <Ionicons name="arrow-back" size={22} color={C.text} />
          </TouchableOpacity>
          <Text style={styles.title}>TAG A SPOT</Text>
        </View>
        <TextInput
          style={styles.input}
          placeholder="Search spots, DIYs and stores"
          placeholderTextColor={C.muted}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
        />
        <Text style={styles.sectionLabel}>{search.enabled ? "RESULTS" : "NEAREST TO YOU"}</Text>
        {isLoading ? (
          <ActivityIndicator color={C.primary} style={styles.spinner} />
        ) : (
          <FlatList
          // Search box is at the top; dragging the results drops the keyboard
          // so the end of the list can be reached.
          keyboardDismissMode="on-drag"
            data={options}
            keyExtractor={(o) => o.key}
            keyboardShouldPersistTaps="handled"
            onEndReached={() => search.hasMore && search.loadMore()}
            ListEmptyComponent={
              <Text style={styles.empty}>
                {search.enabled ? "NOTHING MATCHES THAT" : location ? "NOTHING NEARBY — SEARCH INSTEAD" : "OPEN THE MAP ONCE TO SEE NEARBY SPOTS"}
              </Text>
            }
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.row} onPress={() => handleSelect(item)} activeOpacity={0.75}>
                <Text style={styles.kind}>{item.kindLabel}</Text>
                <Text style={styles.name} numberOfLines={1}>
                  {item.name}
                </Text>
                {formatDistance(item.distanceKm) ? <Text style={styles.distance}>{formatDistance(item.distanceKm)}</Text> : null}
              </TouchableOpacity>
            )}
          />
        )}
      </View>
    </Modal>
  );
}
