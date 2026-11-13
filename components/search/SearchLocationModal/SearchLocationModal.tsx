import { useState } from "react";
import { ActivityIndicator, FlatList, Linking, Modal, Platform, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePlaceSearch } from "@/lib/geocoding/hooks/usePlaceSearch";
import type { PlaceResult } from "@/lib/geocoding/types";
import type { SearchLocation } from "@/lib/nearby/types";
import { C } from "@/lib/theme";
import { SearchBar } from "@/components/search/SearchBar";
import { styles } from "./SearchLocationModal.styles";

type Props = {
  visible: boolean;
  location: SearchLocation | null;
  isCurrentLocationDenied: boolean;
  onSelect: (location: SearchLocation) => void;
  onClose: () => void;
};

// Picks where nearby search looks: the device's own location, or a city the
// user searches for.
export function SearchLocationModal({ visible, location, isCurrentLocationDenied, onSelect, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const { results, isSearching, isError, isRateLimited, enabled } = usePlaceSearch(query);
  const isCurrent = location?.kind === "current";

  function close() {
    setQuery("");
    onClose();
  }

  function select(next: SearchLocation) {
    onSelect(next);
    close();
  }

  function selectPlace(place: PlaceResult) {
    select({ kind: "custom", label: place.label, coords: place.coords });
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={close}>
      <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
        <View style={styles.header}>
          <Text style={styles.heading}>SEARCH LOCATION</Text>
          <TouchableOpacity onPress={close} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close">
            <Ionicons name="close" size={24} color={C.text} />
          </TouchableOpacity>
        </View>

        <Text style={styles.hint}>
          {"// FIND SKATERS AROUND YOU, OR AROUND A CITY YOU SKATE IN OR ARE HEADING TO"}
        </Text>

        <TouchableOpacity
          style={[styles.currentRow, isCurrent && styles.rowSelected]}
          onPress={() => select({ kind: "current" })}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityState={{ selected: isCurrent }}
        >
          <Ionicons name="navigate" size={16} color={C.primary} />
          <Text style={styles.rowLabel}>USE CURRENT LOCATION</Text>
          {isCurrent && <Ionicons name="checkmark" size={18} color={C.primary} />}
        </TouchableOpacity>

        {isCurrentLocationDenied && (
          <View style={styles.deniedWrap}>
            <Text style={styles.deniedText}>{"// LOCATION ACCESS IS OFF FOR SKATEMEET"}</Text>
            {Platform.OS !== "web" && (
              <TouchableOpacity onPress={() => Linking.openSettings()} activeOpacity={0.8}>
                <Text style={styles.deniedLink}>OPEN SETTINGS</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={styles.searchWrap}>
          <SearchBar value={query} onChangeText={setQuery} placeholder="Search a city…" />
        </View>

        {!enabled ? null : isSearching ? (
          <View style={styles.statusWrap}>
            <ActivityIndicator color={C.primary} />
          </View>
        ) : isError ? (
          <View style={styles.statusWrap}>
            <Text style={styles.statusText}>
              {isRateLimited ? "// TOO MANY SEARCHES — WAIT A MINUTE" : "// COULDN'T SEARCH PLACES — TRY AGAIN"}
            </Text>
          </View>
        ) : results.length === 0 ? (
          <View style={styles.statusWrap}>
            <Text style={styles.statusText}>{`// NO PLACES FOUND FOR "${query.trim().toUpperCase()}"`}</Text>
          </View>
        ) : (
          <FlatList
            data={results}
            keyExtractor={(place) => `${place.label}:${place.coords.lat}:${place.coords.lng}`}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
            renderItem={({ item }) => {
              const isSelected = location?.kind === "custom" && location.label === item.label;
              return (
                <TouchableOpacity
                  style={[styles.placeRow, isSelected && styles.rowSelected]}
                  onPress={() => selectPlace(item)}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                >
                  <Ionicons name="location-outline" size={16} color={C.muted} />
                  <Text style={styles.rowLabel} numberOfLines={2}>
                    {item.label.toUpperCase()}
                  </Text>
                  {isSelected && <Ionicons name="checkmark" size={18} color={C.primary} />}
                </TouchableOpacity>
              );
            }}
          />
        )}
      </View>
    </Modal>
  );
}
