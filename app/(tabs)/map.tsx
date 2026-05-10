import { CreateSpotSheet } from "@/components/spots/CreateSpotSheet";
import { CreateStoreSheet } from "@/components/spots/CreateStoreSheet";
import { MapPreviewCard, MapPreviewCardSkeleton, PreviewItem, SkeletonKind } from "@/components/map/MapPreviewCard";
import { useAuthContext } from "@/lib/context/use-auth-context";
import {
  fetchOsmShopsInBounds,
  fetchOsmSpotsInBounds,
  fetchSpotsInBounds,
  getSpotVoteCount,
  getUserVoteStatus,
  OsmShop,
  OsmSpot,
  regionToBoundingBox,
  SkateSpot,
} from "@/lib/spots/skateSpots";
import { fetchUserShopsInBounds, getStoreVoteCount, getStoreVoteStatus, UserShop } from "@/lib/stores/skateStores";
import { C, F, R } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker, Region } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Status = "idle" | "loading" | "denied" | "error" | "ready";
type FilterKey = "spots" | "diys" | "stores";
type PinCategory = "spot" | "diy" | "store";

function SpotMarker({ isDiy = false, selected = false }: { isDiy?: boolean; selected?: boolean }) {
  const accent = isDiy ? C.tertiary : C.primary;
  const onAccent = isDiy ? C.onTertiary : C.onPrimary;
  return (
    <View style={[
      mStyles.square,
      selected
        ? { backgroundColor: accent }
        : { backgroundColor: C.surfaceHigh, borderWidth: 2, borderColor: accent },
    ]}>
      <Ionicons
        name={isDiy ? "construct-sharp" : "location-sharp"}
        size={18}
        color={selected ? onAccent : accent}
      />
    </View>
  );
}

function StoreMarker({ selected = false }: { selected?: boolean }) {
  return (
    <View style={[
      mStyles.square,
      selected
        ? { backgroundColor: C.secondary }
        : { backgroundColor: C.surfaceHigh, borderWidth: 2, borderColor: C.secondary },
    ]}>
      <Ionicons name="home-sharp" size={18} color={selected ? C.onSecondary : C.secondary} />
    </View>
  );
}

const mStyles = StyleSheet.create({
  square: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  pendingPin: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#ffffff",
    backgroundColor: C.surfaceHigh,
  },
  pendingPinText: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 22,
  },
});

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "spots", label: "Skate Spots" },
  { key: "diys", label: "DIYs" },
  { key: "stores", label: "Skate Stores" },
];

const SPOTS_DEBOUNCE_MS = 1000;

const DARK_MAP_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#212121" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#212121" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#757575" }] },
  { featureType: "administrative.country", elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#bdbdbd" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#181818" }] },
  { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
  { featureType: "poi.park", elementType: "labels.text.stroke", stylers: [{ color: "#1b1b1b" }] },
  { featureType: "road", elementType: "geometry.fill", stylers: [{ color: "#2c2c2c" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#8a8a8a" }] },
  { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#373737" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#3c3c3c" }] },
  { featureType: "road.highway.controlled_access", elementType: "geometry", stylers: [{ color: "#4e4e4e" }] },
  { featureType: "road.local", elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
  { featureType: "transit", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#000000" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#3d3d3d" }] },
];

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const { session } = useAuthContext();
  const userId = session?.user.id ?? null;

  const [status, setStatus] = useState<Status>("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [initialRegion, setInitialRegion] = useState<Region | null>(null);
  const [search, setSearch] = useState("");
  const [activeFilters, setActiveFilters] = useState<Set<FilterKey>>(
    new Set<FilterKey>(["spots", "diys", "stores"])
  );

  const [osmShops, setOsmShops] = useState<OsmShop[]>([]);
  const [osmSpots, setOsmSpots] = useState<OsmSpot[]>([]);
  const [userSpots, setUserSpots] = useState<SkateSpot[]>([]);
  const [userShops, setUserShops] = useState<UserShop[]>([]);

  const [previewItem, setPreviewItem] = useState<PreviewItem | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewKind, setPreviewKind] = useState<SkeletonKind>("spot");
  const [initialHasVoted, setInitialHasVoted] = useState<boolean | null>(null);
  const lastMarkerPressAt = useRef(0);
  const previewRequestId = useRef(0);

  const [isPickingLocation, setIsPickingLocation] = useState(false);
  const [pendingPin, setPendingPin] = useState<{ latitude: number; longitude: number } | null>(null);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [pinCategory, setPinCategory] = useState<PinCategory | null>(null);
  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [showCreateStoreSheet, setShowCreateStoreSheet] = useState(false);

  const spotsDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Dismiss helper — cancels any in-flight preview fetch ──────────────────

  const dismissPreview = useCallback(() => {
    previewRequestId.current++;
    setPreviewItem(null);
    setPreviewLoading(false);
  }, []);

  // ── Marker selection: show skeleton, fetch count + vote status, then card ─

  const handleMarkerSelect = useCallback(async (item: PreviewItem) => {
    lastMarkerPressAt.current = Date.now();

    const requestId = ++previewRequestId.current;
    setPreviewItem(null);
    setPreviewLoading(true);
    setPreviewKind(
      item.kind === "osm-shop" || item.kind === "user-shop"
        ? "store"
        : (item.kind === "user-spot" && item.data.type === "diy") ||
          (item.kind === "osm-spot" && item.data.spot_type === "diy")
        ? "diy"
        : "spot"
    );

    try {
      let enriched: PreviewItem;
      let voted: boolean | null = null;

      if (item.kind === "user-spot") {
        if (userId) {
          const [count, status] = await Promise.all([
            getSpotVoteCount(item.data.spot_id, null),
            getUserVoteStatus(item.data.spot_id, null, userId),
          ]);
          enriched = { kind: "user-spot", data: { ...item.data, upvote_count: count } };
          voted = status;
        } else {
          const count = await getSpotVoteCount(item.data.spot_id, null);
          enriched = { kind: "user-spot", data: { ...item.data, upvote_count: count } };
        }
      } else if (item.kind === "osm-spot") {
        if (userId) {
          const [count, status] = await Promise.all([
            getSpotVoteCount(null, item.data.place_id),
            getUserVoteStatus(null, item.data.place_id, userId),
          ]);
          enriched = { kind: "osm-spot", data: { ...item.data, upvote_count: count } };
          voted = status;
        } else {
          const count = await getSpotVoteCount(null, item.data.place_id);
          enriched = { kind: "osm-spot", data: { ...item.data, upvote_count: count } };
        }
      } else if (item.kind === "osm-shop") {
        if (userId) {
          const [count, status] = await Promise.all([
            getStoreVoteCount(null, item.data.place_id),
            getStoreVoteStatus(null, item.data.place_id, userId),
          ]);
          enriched = { kind: "osm-shop", data: { ...item.data, upvote_count: count } };
          voted = status;
        } else {
          const count = await getStoreVoteCount(null, item.data.place_id);
          enriched = { kind: "osm-shop", data: { ...item.data, upvote_count: count } };
        }
      } else {
        // user-shop
        if (userId) {
          const [count, status] = await Promise.all([
            getStoreVoteCount(item.data.shop_id, null),
            getStoreVoteStatus(item.data.shop_id, null, userId),
          ]);
          enriched = { kind: "user-shop", data: { ...item.data, upvote_count: count } };
          voted = status;
        } else {
          const count = await getStoreVoteCount(item.data.shop_id, null);
          enriched = { kind: "user-shop", data: { ...item.data, upvote_count: count } };
        }
      }

      if (previewRequestId.current !== requestId) return;
      setPreviewItem(enriched!);
      setInitialHasVoted(voted);
      setPreviewLoading(false);
    } catch {
      if (previewRequestId.current !== requestId) return;
      setPreviewItem(item);
      setInitialHasVoted(userId ? false : null);
      setPreviewLoading(false);
    }
  }, [userId]);

  // ── Loaders ────────────────────────────────────────────────────────────────

  const loadOsmSpots = useCallback(async (region: Region) => {
    try {
      const bbox = regionToBoundingBox(
        region.latitude,
        region.longitude,
        region.latitudeDelta,
        region.longitudeDelta
      );
      const [spots, shops, uShops] = await Promise.all([
        fetchOsmSpotsInBounds(bbox),
        fetchOsmShopsInBounds(bbox),
        fetchUserShopsInBounds(bbox),
      ]);
      setOsmSpots(spots);
      setOsmShops(shops);
      setUserShops(uShops);
    } catch {
      // OSM data is best-effort; don't surface an error banner
    }
  }, []);

  const loadUserSpots = useCallback(async (region: Region) => {
    try {
      const bbox = regionToBoundingBox(
        region.latitude,
        region.longitude,
        region.latitudeDelta,
        region.longitudeDelta
      );
      const results = await fetchSpotsInBounds(bbox);
      setUserSpots(results);
    } catch {
      // silently ignore
    }
  }, []);

  // ── Initial location ───────────────────────────────────────────────────────

  useEffect(() => {
    (async () => {
      const { status: permStatus } = await Location.requestForegroundPermissionsAsync();

      if (permStatus !== "granted") {
        setStatus("denied");
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = location.coords;
      const region: Region = {
        latitude,
        longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };

      setInitialRegion(region);
      setStatus("ready");

      await Promise.all([
        loadOsmSpots(region),
        loadUserSpots(region),
      ]);
    })();
  }, [loadOsmSpots, loadUserSpots]);

  // ── Region change ──────────────────────────────────────────────────────────

  const handleRegionChangeComplete = useCallback(
    (region: Region) => {
      if (spotsDebounce.current) clearTimeout(spotsDebounce.current);
      spotsDebounce.current = setTimeout(() => {
        loadOsmSpots(region);
        loadUserSpots(region);
      }, SPOTS_DEBOUNCE_MS);
    },
    [loadOsmSpots, loadUserSpots]
  );

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

  const searchLower = search.toLowerCase();

  const visibleOsmShops = activeFilters.has("stores")
    ? osmShops.filter(
        (s) =>
          search === "" ||
          s.name.toLowerCase().includes(searchLower) ||
          s.address.toLowerCase().includes(searchLower)
      )
    : [];

  const visibleOsmSpots = osmSpots.filter((s) => {
    const typeMatch =
      (activeFilters.has("spots") && (s.spot_type === "park" || s.spot_type === "street")) ||
      (activeFilters.has("diys") && s.spot_type === "diy");
    return typeMatch && (search === "" || s.name.toLowerCase().includes(searchLower));
  });

  const visibleUserSpots = userSpots.filter((s) => {
    const typeMatch =
      (activeFilters.has("spots") &&
        (s.type === "street" || s.type === "park" || s.type === "indoor")) ||
      (activeFilters.has("diys") && s.type === "diy");
    return typeMatch && (search === "" || s.name.toLowerCase().includes(searchLower));
  });

  const visibleUserShops = activeFilters.has("stores") ? userShops : [];

  const nothingVisible =
    visibleOsmShops.length === 0 &&
    visibleOsmSpots.length === 0 &&
    visibleUserSpots.length === 0 &&
    visibleUserShops.length === 0;

  // ── Loading / error screens ────────────────────────────────────────────────

  if (status === "loading") {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={C.primary} />
        <Text style={styles.statusText}>GETTING YOUR LOCATION…</Text>
      </View>
    );
  }

  if (status === "denied") {
    return (
      <View style={styles.center}>
        <Text style={styles.errorHeading}>LOCATION NEEDED</Text>
        <Text style={styles.errorBody}>
          Enable location access in your device settings to find skate spots near you.
        </Text>
      </View>
    );
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
              : () => {
                  if (Date.now() - lastMarkerPressAt.current > 150) {
                    dismissPreview();
                  }
                }
          }
        >
          {/* OSM shops */}
          {visibleOsmShops.map((shop) => (
            <Marker
              key={shop.place_id}
              coordinate={{
                latitude: shop.coordinates.lat,
                longitude: shop.coordinates.lng,
              }}
              anchor={{ x: 0.5, y: 0.5 }}
              onPress={() => handleMarkerSelect({ kind: "osm-shop", data: shop })}
            >
              <StoreMarker
                selected={
                  previewItem?.kind === "osm-shop" &&
                  previewItem.data.place_id === shop.place_id
                }
              />
            </Marker>
          ))}

          {/* User shops */}
          {activeFilters.has("stores") && userShops.map((shop) => (
            <Marker
              key={shop.shop_id}
              coordinate={{ latitude: shop.latitude, longitude: shop.longitude }}
              anchor={{ x: 0.5, y: 0.5 }}
              onPress={() => handleMarkerSelect({ kind: "user-shop", data: shop })}
            >
              <StoreMarker
                selected={
                  previewItem?.kind === "user-shop" &&
                  previewItem.data.shop_id === shop.shop_id
                }
              />
            </Marker>
          ))}

          {/* OSM spots */}
          {visibleOsmSpots.map((spot) => (
            <Marker
              key={spot.place_id}
              coordinate={{
                latitude: spot.coordinates.lat,
                longitude: spot.coordinates.lng,
              }}
              anchor={{ x: 0.5, y: 0.5 }}
              onPress={() => handleMarkerSelect({ kind: "osm-spot", data: spot })}
            >
              <SpotMarker
                isDiy={spot.spot_type === "diy"}
                selected={
                  previewItem?.kind === "osm-spot" &&
                  previewItem.data.place_id === spot.place_id
                }
              />
            </Marker>
          ))}

          {/* User spots */}
          {visibleUserSpots.map((spot) => (
            <Marker
              key={spot.spot_id}
              coordinate={{ latitude: spot.latitude, longitude: spot.longitude }}
              anchor={{ x: 0.5, y: 0.5 }}
              onPress={() => handleMarkerSelect({ kind: "user-spot", data: spot })}
            >
              <SpotMarker
                isDiy={spot.type === "diy"}
                selected={
                  previewItem?.kind === "user-spot" &&
                  previewItem.data.spot_id === spot.spot_id
                }
              />
            </Marker>
          ))}

          {/* Pending location pin */}
          {pendingPin && (
            <Marker coordinate={pendingPin} anchor={{ x: 0.5, y: 0.5 }}>
              <View style={mStyles.pendingPin}>
                <Text style={mStyles.pendingPinText}>?</Text>
              </View>
            </Marker>
          )}
        </MapView>
      )}

      {/* Search + filter overlay */}
      <View style={[styles.overlay, { top: insets.top + 12 }]}>
        <View style={styles.searchRow}>
          <Ionicons name="search-outline" size={16} color={C.muted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search spots, DIYs, stores…"
            placeholderTextColor={C.muted}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersRow}
        >
          {FILTERS.map(({ key, label }) => {
            const active = activeFilters.has(key);
            const accentBg = key === "stores" ? C.secondary : key === "diys" ? C.tertiary : C.primary;
            const accentText = key === "stores" ? C.onSecondary : key === "diys" ? C.onTertiary : C.onPrimary;
            return (
              <TouchableOpacity
                key={key}
                style={[styles.chip, active && { backgroundColor: accentBg, borderColor: accentBg }]}
                onPress={() => toggleFilter(key)}
                activeOpacity={0.75}
              >
                <Text style={[styles.chipText, active && { color: accentText }]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
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
        <View style={[styles.pickingBar, { bottom: insets.bottom + 16 }]}>
          <Text style={styles.pickingText}>
            {pendingPin ? "LOCATION SET — CONFIRM OR REPIN" : "TAP MAP TO DROP PIN"}
          </Text>
          <View style={styles.pickingActions}>
            <TouchableOpacity
              style={styles.cancelPickBtn}
              onPress={() => {
                setIsPickingLocation(false);
                setPendingPin(null);
              }}
            >
              <Text style={styles.cancelPickText}>CANCEL</Text>
            </TouchableOpacity>
            {pendingPin && (
              <TouchableOpacity
                style={styles.confirmPickBtn}
                onPress={() => {
                  setIsPickingLocation(false);
                  setShowCategoryPicker(true);
                }}
              >
                <Text style={styles.confirmPickText}>CONFIRM</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
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

      {/* Empty state */}
      {nothingVisible && status === "ready" && !errorMsg && !isPickingLocation && (
        <View style={styles.emptyBanner}>
          <Text style={styles.emptyText}>NOTHING FOUND NEARBY.</Text>
        </View>
      )}

      {/* Category picker overlay */}
      {showCategoryPicker && (
        <View style={[styles.categoryPicker, { bottom: insets.bottom + 16 }]}>
          <Text style={styles.categoryTitle}>WHAT ARE YOU ADDING?</Text>
          <View style={styles.categoryOptions}>
            <TouchableOpacity
              style={[styles.categoryOption, { borderColor: C.primary }]}
              onPress={() => { setPinCategory("spot"); setShowCategoryPicker(false); setShowCreateSheet(true); }}
              activeOpacity={0.8}
            >
              <Ionicons name="location-sharp" size={22} color={C.primary} />
              <Text style={[styles.categoryOptionText, { color: C.primary }]}>SKATE SPOT</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.categoryOption, { borderColor: C.tertiary }]}
              onPress={() => { setPinCategory("diy"); setShowCategoryPicker(false); setShowCreateSheet(true); }}
              activeOpacity={0.8}
            >
              <Ionicons name="construct-sharp" size={22} color={C.tertiary} />
              <Text style={[styles.categoryOptionText, { color: C.tertiary }]}>DIY SPOT</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.categoryOption, { borderColor: C.secondary }]}
              onPress={() => { setPinCategory("store"); setShowCategoryPicker(false); setShowCreateStoreSheet(true); }}
              activeOpacity={0.8}
            >
              <Ionicons name="home-sharp" size={22} color={C.secondary} />
              <Text style={[styles.categoryOptionText, { color: C.secondary }]}>SKATE STORE</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.categoryCancel}
            onPress={() => { setShowCategoryPicker(false); setPendingPin(null); setPinCategory(null); }}
          >
            <Text style={styles.categoryCancelText}>CANCEL</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Create spot sheet */}
      {pendingPin && (
        <CreateSpotSheet
          visible={showCreateSheet}
          onClose={() => {
            setShowCreateSheet(false);
            setPendingPin(null);
            setPinCategory(null);
          }}
          onSpotCreated={(spot) => {
            setUserSpots((prev) => [spot, ...prev]);
            setPendingPin(null);
            setPinCategory(null);
          }}
          initialCoordinates={pendingPin}
          lockedType={pinCategory === "diy" ? "diy" : undefined}
        />
      )}

      {/* Create store sheet */}
      {pendingPin && (
        <CreateStoreSheet
          visible={showCreateStoreSheet}
          onClose={() => {
            setShowCreateStoreSheet(false);
            setPendingPin(null);
            setPinCategory(null);
          }}
          onShopCreated={(shop) => {
            setUserShops((prev) => [shop, ...prev]);
            setPendingPin(null);
            setPinCategory(null);
          }}
          initialCoordinates={pendingPin}
        />
      )}

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
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: C.bg,
  },
  statusText: {
    marginTop: 16,
    color: C.muted,
    fontFamily: F.mono,
    fontSize: 11,
    letterSpacing: 2,
  },
  errorHeading: {
    fontFamily: F.heading,
    fontSize: 24,
    color: C.text,
    letterSpacing: 1,
    marginBottom: 12,
    textAlign: "center",
  },
  errorBody: {
    color: C.muted,
    fontFamily: F.body,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
  },

  // Overlay
  overlay: {
    position: "absolute",
    left: 12,
    right: 12,
    gap: 8,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.bg,
    borderWidth: 2,
    borderColor: C.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    color: C.text,
    fontFamily: F.body,
    fontSize: 14,
    padding: 0,
  },
  filtersRow: { flexDirection: "row", gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 2,
    borderColor: C.border,
    backgroundColor: C.bg,
  },
  chipActive: { backgroundColor: C.primary, borderColor: C.primary },
  chipText: {
    fontFamily: F.mono,
    fontSize: 10,
    letterSpacing: 1,
    color: C.muted,
    textTransform: "uppercase",
  },
  chipTextActive: { color: C.onPrimary },

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

  // Location picking bar
  pickingBar: {
    position: "absolute",
    left: 16,
    right: 16,
    backgroundColor: C.bgLow,
    borderWidth: 2,
    borderColor: C.primary,
    padding: 14,
    gap: 12,
  },
  pickingText: {
    fontFamily: F.mono,
    fontSize: 11,
    color: C.primary,
    letterSpacing: 1,
    textAlign: "center",
  },
  pickingActions: {
    flexDirection: "row",
    gap: 10,
  },
  cancelPickBtn: {
    flex: 1,
    borderWidth: 2,
    borderColor: C.border,
    paddingVertical: 10,
    alignItems: "center",
  },
  cancelPickText: {
    fontFamily: F.mono,
    fontSize: 11,
    color: C.muted,
    letterSpacing: 1,
  },
  confirmPickBtn: {
    flex: 2,
    backgroundColor: C.primary,
    paddingVertical: 10,
    alignItems: "center",
  },
  confirmPickText: {
    fontFamily: F.mono,
    fontSize: 11,
    color: C.onPrimary,
    letterSpacing: 1,
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
  // Category picker
  categoryPicker: {
    position: "absolute",
    left: 16,
    right: 16,
    backgroundColor: C.bgLow,
    borderWidth: 2,
    borderColor: C.border,
    padding: 16,
    gap: 12,
  },
  categoryTitle: {
    fontFamily: F.mono,
    fontSize: 10,
    color: C.muted,
    letterSpacing: 2,
    textAlign: "center",
  },
  categoryOptions: {
    gap: 8,
  },
  categoryOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 2,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: C.surface,
  },
  categoryOptionText: {
    fontFamily: F.mono,
    fontSize: 12,
    letterSpacing: 1,
  },
  categoryCancel: {
    borderWidth: 2,
    borderColor: C.border,
    paddingVertical: 12,
    alignItems: "center",
  },
  categoryCancelText: {
    fontFamily: F.mono,
    fontSize: 11,
    color: C.muted,
    letterSpacing: 1,
  },

  emptyBanner: {
    position: "absolute",
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: C.surfaceHigh,
    borderRadius: R,
    borderWidth: 2,
    borderColor: C.border,
    padding: 12,
    alignItems: "center",
  },
  emptyText: {
    color: C.muted,
    fontFamily: F.mono,
    fontSize: 10,
    letterSpacing: 2,
  },
});
