import { CategoryPickerOverlay } from "@/components/map/CategoryPickerOverlay";
import { LocationPickingBar } from "@/components/map/LocationPickingBar";
import { MapFilterBar } from "@/components/map/MapFilterBar";
import { MapMarkers } from "@/components/map/MapMarkers";
import { MapPreviewCard, MapPreviewCardSkeleton } from "@/components/map/MapPreviewCard";
import { MapSearchBar } from "@/components/map/MapSearchBar";
import { MapStatusBanner } from "@/components/map/MapStatusBanner";
import { MapStatusScreen } from "@/components/map/MapStatusScreen";
import { MapToolButton } from "@/components/map/MapToolButton";
import { PinDropSheets } from "@/components/map/PinDropSheets";
import { SearchResultsScreen } from "@/components/map/SearchResultsScreen";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { useCenterOnUser } from "@/lib/map/useCenterOnUser";
import { useEntitySearch, type SortMode } from "@/lib/map/useEntitySearch";
import { useMapRegionData } from "@/lib/map/useMapRegionData";
import { useMarkerPreview } from "@/lib/map/useMarkerPreview";
import { C, DARK_MAP_STYLE, F, R } from "@/lib/theme";
import { FILTER_DEFINITIONS, FilterKey, SEARCH_DEBOUNCE_MS, SEARCH_MIN_CHARS } from "@/utils/constants";
import { filterVisibleMarkers } from "@/utils/mapFilters";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type MapViewNative from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";
// Relative, not "@/...": Expo's "@/" alias resolves straight to a file and skips
// Metro's platform-extension probing, so it would always pick MapView.ts over
// MapView.web.tsx. A relative import goes through normal platform resolution.
import { MapView } from "../../components/map/MapView";

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
  const [sortMode, setSortMode] = useState<SortMode>(null);

  const {
    status,
    initialRegion,
    searchLocation,
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
    refreshMarkers,
    retryLocation,
    reportLiveLocation,
  } = useMapRegionData();

  // The native map view is only ever mounted once (as soon as initialRegion
  // exists) and never unmounted again — onMapReady tells us when it's
  // actually painted, so the loading/search screens can be shown as an
  // overlay on top of it instead of swapping it out, which is what was
  // causing a blank-map flash on every transition.
  const [mapReady, setMapReady] = useState(false);

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
  const mapRef = useRef<MapViewNative>(null);
  const { centerOnUser, isLocating } = useCenterOnUser(mapRef, searchLocation, reportLiveLocation);

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

  // ── Search ─────────────────────────────────────────────────────────────────
  // At 3+ characters the map is replaced by a scrollable results list, backed
  // by a name search across all entities (not just what's currently loaded on
  // screen) — this is what lets it work before the user's location is ready.
  // searchLocation comes from cache on launch (a "likely" location, so
  // distance search works immediately) and upgrades to the real GPS fix once
  // that resolves in the background — see useMapRegionData.

  const isSearchActive = debouncedSearch.length >= SEARCH_MIN_CHARS;
  const {
    results: searchResults,
    isSearching,
    isLoadingMore,
    hasMore,
    loadMore,
  } = useEntitySearch(debouncedSearch, activeFilters, sortMode, searchLocation);

  // Leaving search (search box emptied, or typed back below the threshold)
  // resets the search-only controls so they don't linger into the map view.
  const wasSearchActive = useRef(isSearchActive);
  useEffect(() => {
    if (wasSearchActive.current && !isSearchActive) {
      setActiveFilters(new Set<FilterKey>(["spots", "diys", "stores"]));
      setSortMode(null);
    }
    wasSearchActive.current = isSearchActive;
  }, [isSearchActive]);

  return (
    <View style={styles.container}>
      {initialRegion && (
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={initialRegion}
          showsUserLocation
          showsMyLocationButton={false}
          // Android's compass appears top-left once the map is rotated/tilted
          // and otherwise sits unused — drop it rather than reserve space for
          // a control the app has no other way to trigger anyway.
          showsCompass={false}
          // Android shows its own Directions/Open-in-Maps toolbar bottom-right
          // when a marker is selected, which sits under the Add Spot FAB.
          // Unlike the attribution logo, this isn't required by Google's ToS.
          toolbarEnabled={false}
          onMapReady={() => setMapReady(true)}
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

      {/* Covers the map (or stands in for it, before it exists) while
          searching, or until it's actually painted its first frame — never
          unmounted/remounted, so there's nothing to flash back to. */}
      {(isSearchActive || !mapReady) && (
        <View style={StyleSheet.absoluteFillObject}>
          {isSearchActive ? (
            <SearchResultsScreen
              query={debouncedSearch}
              results={searchResults}
              isSearching={isSearching}
              isLoadingMore={isLoadingMore}
              hasMore={hasMore}
              onLoadMore={loadMore}
              sortMode={sortMode}
              onSortModeChange={setSortMode}
              userLocation={searchLocation}
              userUploadedOnly={activeFilters.has("userSpots")}
              onToggleUserUploadedOnly={() => toggleFilter("userSpots")}
            />
          ) : (
            <MapStatusScreen
              kind={status === "ready" ? "loading" : status}
              onRetry={retryLocation}
            />
          )}
        </View>
      )}

      {/* Search + filter overlay — shown even while location is still
          loading/denied (and while search results are showing), so the
          screen always reads as "this app" rather than a blank placeholder. */}
      <View style={[styles.overlay, { top: insets.top + 12 }]}>
        <MapSearchBar value={search} onChangeText={setSearch} />
        <MapFilterBar filters={FILTER_DEFINITIONS} activeFilters={activeFilters} onToggle={toggleFilter} />
      </View>

      {mapReady && !isSearchActive && (
        <>
          {/* Map tools — stacked above the Add Spot FAB */}
          {!isPickingLocation && (
            <View style={[styles.mapTools, Platform.OS === "web" && styles.mapToolsWeb]}>
              <MapToolButton icon="refresh" onPress={refreshMarkers} loading={markersLoading} />
              <MapToolButton icon="locate" onPress={centerOnUser} loading={isLocating} />
            </View>
          )}

          {/* Add spot FAB */}
          {session && !isPickingLocation && (
            <TouchableOpacity
              style={[
                styles.fab,
                // Native: the map screen already sits above the tab bar (which
                // reserves its own safe-area clearance), so a flat 16 here
                // matches the FAB's 16 right margin instead of double-counting
                // insets.bottom on top of the tab bar's own height.
                Platform.OS === "web" && styles.fabWeb,
              ]}
              onPress={() => { setIsPickingLocation(true); dismissPreview(); }}
              activeOpacity={0.85}
            >
              <Ionicons name="add" size={Platform.OS === "web" ? 26 : 22} color={C.onPrimary} />
              <Text style={styles.fabLabel}>ADD SPOT</Text>
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
          {!errorMsg && !isPickingLocation && (
            <MapStatusBanner
              gettingLocation={status === "loading"}
              tooZoomedOut={tooZoomedOut}
              markersLoading={markersLoading}
              scanningMinimum={scanningMinimum}
              nothingVisible={nothingVisible}
              dismissedEmpty={dismissedEmpty}
              onDismiss={() => setDismissedEmpty(true)}
              // Clears the search bar (40) + filter chip row below it, including
              // the "duct tape" chips' slight rotation bleed, before this starts.
              top={insets.top + 116}
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
            <MapPreviewCardSkeleton kind={previewKind} />
          )}
          {previewItem && !previewLoading && !isPickingLocation && (
            <MapPreviewCard
              item={previewItem}
              onDismiss={dismissPreview}
              initialHasVoted={initialHasVoted}
            />
          )}
        </>
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

  // Map tools (locate me / refresh) — in a row to the left of the FAB
  mapTools: {
    position: "absolute",
    // Sits just left of the FAB: fab.right (16) + fab.width (68) + 12 gap.
    right: 96,
    bottom: 16,
    flexDirection: "row",
    gap: 8,
  },
  mapToolsWeb: {
    // Same math as native, using fabWeb's offsets: 16 + 78 + 12.
    right: 106,
    bottom: 56,
  },

  // FAB
  fab: {
    position: "absolute",
    right: 16,
    bottom: 16,
    width: 68,
    height: 68,
    backgroundColor: C.primary,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  fabLabel: {
    fontFamily: F.mono,
    fontSize: 8,
    letterSpacing: 0.5,
    color: C.onPrimary,
  },
  fabWeb: {
    width: 78,
    height: 78,
    bottom: 56,
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
