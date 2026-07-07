import { CategoryPickerOverlay } from "@/components/map/CategoryPickerOverlay";
import { LocationPickingBar } from "@/components/map/LocationPickingBar";
import { MapFilterBar } from "@/components/map/MapFilterBar";
import { MapMarkers } from "@/components/map/MapMarkers";
import { MapPreviewCard, MapPreviewCardSkeleton } from "@/components/map/MapPreviewCard";
import { MapSearchBar } from "@/components/map/MapSearchBar";
import { MapStatusBanner } from "@/components/map/MapStatusBanner";
import { MapStatusScreen } from "@/components/map/MapStatusScreen";
import { PinDropSheets } from "@/components/map/PinDropSheets";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { useMapRegionData } from "@/lib/map/useMapRegionData";
import { useMarkerPreview } from "@/lib/map/useMarkerPreview";
import { C, DARK_MAP_STYLE, F, R } from "@/lib/theme";
import { FILTER_DEFINITIONS, FilterKey, SEARCH_DEBOUNCE_MS } from "@/utils/constants";
import { filterVisibleMarkers } from "@/utils/mapFilters";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import MapView from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type PinCategory = "spot" | "diy" | "store";

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const { session } = useAuthContext();
  const userId = session?.user.id ?? null;

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeFilters, setActiveFilters] = useState<Set<FilterKey>>(
    new Set<FilterKey>(["spots", "diys", "stores"])
  );

  const {
    status,
    initialRegion,
    osmStores,
    osmSpots,
    userSpots,
    userStores,
    prependUserSpot,
    prependUserStore,
    dismissedEmpty,
    setDismissedEmpty,
    markersLoading,
    scanningMinimum,
    tooZoomedOut,
    handleRegionChangeComplete,
  } = useMapRegionData();

  const {
    previewItem,
    previewLoading,
    previewKind,
    initialHasVoted,
    handleMarkerSelect,
    dismissPreview,
    dismissIfStaleMapPress,
  } = useMarkerPreview(userId);

  const [isPickingLocation, setIsPickingLocation] = useState(false);
  const [pendingPin, setPendingPin] = useState<{ latitude: number; longitude: number } | null>(null);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [pinCategory, setPinCategory] = useState<PinCategory | null>(null);
  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [showCreateStoreSheet, setShowCreateStoreSheet] = useState(false);

  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => setDebouncedSearch(search), SEARCH_DEBOUNCE_MS);
    return () => { if (searchDebounce.current) clearTimeout(searchDebounce.current); };
  }, [search]);

  // ── Filter toggle ──────────────────────────────────────────────────────────

  const toggleFilter = (key: FilterKey) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // ── Visible markers ────────────────────────────────────────────────────────

  const { visibleOsmSpots, visibleOsmStores, visibleUserSpots, visibleUserStores } =
    filterVisibleMarkers({ osmSpots, osmStores, userSpots, userStores }, activeFilters, debouncedSearch);

  const nothingVisible =
    visibleOsmStores.length === 0 &&
    visibleOsmSpots.length === 0 &&
    visibleUserSpots.length === 0 &&
    visibleUserStores.length === 0;

  // ── Loading / error screens ────────────────────────────────────────────────

  if (status === "loading" || status === "denied") {
    return <MapStatusScreen kind={status} />;
  }

  return (
    <View style={styles.container}>
      {initialRegion && (
        <MapView
          style={styles.map}
          initialRegion={initialRegion}
          showsUserLocation
          onRegionChangeComplete={handleRegionChangeComplete}
          customMapStyle={DARK_MAP_STYLE}
          userInterfaceStyle="dark"
          onPress={
            isPickingLocation
              ? (e) => setPendingPin(e.nativeEvent.coordinate)
              : dismissIfStaleMapPress
          }
        >
          <MapMarkers
            visibleOsmStores={visibleOsmStores}
            visibleUserStores={visibleUserStores}
            visibleOsmSpots={visibleOsmSpots}
            visibleUserSpots={visibleUserSpots}
            pendingPin={pendingPin}
            previewItem={previewItem}
            onMarkerPress={handleMarkerSelect}
          />
        </MapView>
      )}

      {/* Search + filter overlay */}
      <View style={[styles.overlay, { top: insets.top + 12 }]}>
        <MapSearchBar value={search} onChangeText={setSearch} />
        <MapFilterBar filters={FILTER_DEFINITIONS} activeFilters={activeFilters} onToggle={toggleFilter} />
      </View>

      {/* Add spot FAB */}
      {session && !isPickingLocation && (
        <TouchableOpacity
          style={[styles.fab, { bottom: insets.bottom + 16 }]}
          onPress={() => { setIsPickingLocation(true); dismissPreview(); }}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={28} color={C.onPrimary} />
        </TouchableOpacity>
      )}

      {/* Location-picking bottom bar */}
      {isPickingLocation && (
        <LocationPickingBar
          hasPendingPin={!!pendingPin}
          bottom={insets.bottom + 16}
          onCancel={() => {
            setIsPickingLocation(false);
            setPendingPin(null);
          }}
          onConfirm={() => {
            setIsPickingLocation(false);
            setShowCategoryPicker(true);
          }}
        />
      )}

      {/* Error banner */}
      {errorMsg && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{errorMsg}</Text>
          <TouchableOpacity onPress={() => setErrorMsg(null)}>
            <Text style={styles.errorBannerDismiss}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Notification bar — zoomed out / loading / empty */}
      {status === "ready" && !errorMsg && !isPickingLocation && (
        <MapStatusBanner
          tooZoomedOut={tooZoomedOut}
          markersLoading={markersLoading}
          scanningMinimum={scanningMinimum}
          nothingVisible={nothingVisible}
          dismissedEmpty={dismissedEmpty}
          onDismiss={() => setDismissedEmpty(true)}
          top={insets.top + 100}
        />
      )}

      {/* Category picker overlay */}
      {showCategoryPicker && (
        <CategoryPickerOverlay
          bottom={insets.bottom + 16}
          onSelectSpot={() => { setPinCategory("spot"); setShowCategoryPicker(false); setShowCreateSheet(true); }}
          onSelectDiy={() => { setPinCategory("diy"); setShowCategoryPicker(false); setShowCreateSheet(true); }}
          onSelectStore={() => { setPinCategory("store"); setShowCategoryPicker(false); setShowCreateStoreSheet(true); }}
          onCancel={() => { setShowCategoryPicker(false); setPendingPin(null); setPinCategory(null); }}
        />
      )}

      {/* Create spot/store sheets */}
      <PinDropSheets
        pendingPin={pendingPin}
        pinCategory={pinCategory}
        showCreateSpotSheet={showCreateSheet}
        showCreateStoreSheet={showCreateStoreSheet}
        onCancel={() => {
          setShowCreateSheet(false);
          setShowCreateStoreSheet(false);
          setPendingPin(null);
          setPinCategory(null);
        }}
        onSpotCreated={(spot) => {
          prependUserSpot(spot);
          setPendingPin(null);
          setPinCategory(null);
        }}
        onStoreCreated={(store) => {
          prependUserStore(store);
          setPendingPin(null);
          setPinCategory(null);
        }}
      />

      {/* Map preview card */}
      {previewLoading && !isPickingLocation && (
        <MapPreviewCardSkeleton onDismiss={dismissPreview} kind={previewKind} />
      )}
      {previewItem && !previewLoading && !isPickingLocation && (
        <MapPreviewCard
          item={previewItem}
          onDismiss={dismissPreview}
          initialHasVoted={initialHasVoted}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  map: { flex: 1 },

  // Overlay
  overlay: {
    position: "absolute",
    left: 16,
    right: 16,
    gap: 8,
  },

  // FAB
  fab: {
    position: "absolute",
    right: 16,
    width: 52,
    height: 52,
    backgroundColor: C.primary,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },

  // Banners
  errorBanner: {
    position: "absolute",
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: C.errorContainer,
    borderRadius: R,
    borderWidth: 2,
    borderColor: C.errorBorder,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  errorBannerText: {
    color: C.error,
    fontFamily: F.body,
    fontSize: 13,
    flex: 1,
    marginRight: 8,
  },
  errorBannerDismiss: { color: C.error, fontFamily: F.mono, fontSize: 12 },
});
