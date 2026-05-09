import { CreateSpotSheet } from "@/components/spots/CreateSpotSheet";
import { SpotDetailSheet } from "@/components/spots/SpotDetailSheet";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { fetchNearbySkateStores, SkateStore } from "@/lib/stores/skateStores";
import {
  fetchOsmShopsInBounds,
  fetchOsmSpotsInBounds,
  fetchSpotsInBounds,
  OsmShop,
  OsmSpot,
  regionToBoundingBox,
  SkateSpot,
} from "@/lib/spots/skateSpots";
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
import MapView, { Callout, Marker, Region } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Status = "idle" | "loading" | "denied" | "error" | "ready";
type FilterKey = "spots" | "diys" | "stores";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "spots", label: "Skate Spots" },
  { key: "diys", label: "DIYs" },
  { key: "stores", label: "Skate Stores" },
];

const STORE_DEBOUNCE_MS = 800;
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

  const [status, setStatus] = useState<Status>("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [initialRegion, setInitialRegion] = useState<Region | null>(null);
  const [search, setSearch] = useState("");
  const [activeFilters, setActiveFilters] = useState<Set<FilterKey>>(
    new Set<FilterKey>(["spots", "diys", "stores"])
  );

  const [stores, setStores] = useState<SkateStore[]>([]);
  const [osmShops, setOsmShops] = useState<OsmShop[]>([]);
  const [osmSpots, setOsmSpots] = useState<OsmSpot[]>([]);
  const [userSpots, setUserSpots] = useState<SkateSpot[]>([]);

  const [selectedUserSpot, setSelectedUserSpot] = useState<SkateSpot | null>(null);
  const [selectedOsmSpot, setSelectedOsmSpot] = useState<OsmSpot | null>(null);

  const [isPickingLocation, setIsPickingLocation] = useState(false);
  const [pendingPin, setPendingPin] = useState<{ latitude: number; longitude: number } | null>(null);
  const [showCreateSheet, setShowCreateSheet] = useState(false);

  const storeDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const spotsDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Loaders ────────────────────────────────────────────────────────────────

  const loadStores = useCallback(async (lat: number, lng: number) => {
    try {
      const results = await fetchNearbySkateStores({ lat, lng });
      setStores(results);
    } catch {
      setErrorMsg("Could not load nearby stores.");
    }
  }, []);

  const loadOsmSpots = useCallback(async (region: Region) => {
    try {
      const bbox = regionToBoundingBox(
        region.latitude,
        region.longitude,
        region.latitudeDelta,
        region.longitudeDelta
      );
      const [spots, shops] = await Promise.all([
        fetchOsmSpotsInBounds(bbox),
        fetchOsmShopsInBounds(bbox),
      ]);
      setOsmSpots(spots);
      setOsmShops(shops);
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
        loadStores(latitude, longitude),
        loadOsmSpots(region),
        loadUserSpots(region),
      ]);
    })();
  }, [loadStores, loadOsmSpots, loadUserSpots]);

  // ── Region change ──────────────────────────────────────────────────────────

  const handleRegionChangeComplete = useCallback(
    (region: Region) => {
      if (storeDebounce.current) clearTimeout(storeDebounce.current);
      storeDebounce.current = setTimeout(() => {
        loadStores(region.latitude, region.longitude);
      }, STORE_DEBOUNCE_MS);

      if (spotsDebounce.current) clearTimeout(spotsDebounce.current);
      spotsDebounce.current = setTimeout(() => {
        loadOsmSpots(region);
        loadUserSpots(region);
      }, SPOTS_DEBOUNCE_MS);
    },
    [loadStores, loadOsmSpots, loadUserSpots]
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

  const visibleStores = activeFilters.has("stores")
    ? stores.filter(
        (s) =>
          search === "" ||
          s.name.toLowerCase().includes(searchLower) ||
          s.address.toLowerCase().includes(searchLower)
      )
    : [];

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

  const nothingVisible =
    visibleStores.length === 0 &&
    visibleOsmShops.length === 0 &&
    visibleOsmSpots.length === 0 &&
    visibleUserSpots.length === 0;

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
              : undefined
          }
        >
          {/* Stores */}
          {visibleStores.map((store) => (
            <Marker
              key={store.place_id}
              coordinate={{
                latitude: store.coordinates.lat,
                longitude: store.coordinates.lng,
              }}
              title={store.name}
              pinColor={C.primary}
            >
              <Callout>
                <View style={styles.callout}>
                  <Text style={styles.calloutName}>{store.name}</Text>
                  <Text style={styles.calloutAddress}>{store.address}</Text>
                  {store.rating != null && (
                    <Text style={styles.calloutRating}>★ {store.rating.toFixed(1)}</Text>
                  )}
                </View>
              </Callout>
            </Marker>
          ))}

          {/* OSM shops */}
          {visibleOsmShops.map((shop) => (
            <Marker
              key={shop.place_id}
              coordinate={{
                latitude: shop.coordinates.lat,
                longitude: shop.coordinates.lng,
              }}
              title={shop.name}
              pinColor={C.primary}
            >
              <Callout>
                <View style={styles.callout}>
                  <Text style={styles.calloutName}>{shop.name}</Text>
                  <Text style={styles.calloutAddress}>{shop.address}</Text>
                </View>
              </Callout>
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
              pinColor={C.secondary}
              onPress={() => setSelectedOsmSpot(spot)}
            />
          ))}

          {/* User spots */}
          {visibleUserSpots.map((spot) => (
            <Marker
              key={spot.spot_id}
              coordinate={{ latitude: spot.latitude, longitude: spot.longitude }}
              pinColor={spot.is_verified ? C.primary : C.muted}
              onPress={() => setSelectedUserSpot(spot)}
            />
          ))}

          {/* Pending location pin */}
          {pendingPin && (
            <Marker coordinate={pendingPin} pinColor={C.primaryBright} />
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
            return (
              <TouchableOpacity
                key={key}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => toggleFilter(key)}
                activeOpacity={0.75}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
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
          onPress={() => setIsPickingLocation(true)}
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
                  setShowCreateSheet(true);
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

      {/* Create spot sheet */}
      {pendingPin && (
        <CreateSpotSheet
          visible={showCreateSheet}
          onClose={() => {
            setShowCreateSheet(false);
            setPendingPin(null);
          }}
          onSpotCreated={(spot) => {
            setUserSpots((prev) => [spot, ...prev]);
            setPendingPin(null);
          }}
          initialCoordinates={pendingPin}
        />
      )}

      {/* Spot detail sheet */}
      <SpotDetailSheet
        spot={selectedUserSpot ?? selectedOsmSpot}
        spotKind={selectedUserSpot ? "user" : selectedOsmSpot ? "osm" : null}
        onClose={() => {
          setSelectedUserSpot(null);
          setSelectedOsmSpot(null);
        }}
        onSpotUpdated={(updated) => {
          setUserSpots((prev) =>
            prev.map((s) => (s.spot_id === updated.spot_id ? updated : s))
          );
          setSelectedUserSpot(updated);
        }}
      />
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

  // Callout (stores)
  callout: { width: 200, padding: 4 },
  calloutName: { fontFamily: F.bodyBold, fontSize: 14 },
  calloutAddress: {
    color: "#6b7280",
    fontFamily: F.body,
    fontSize: 12,
    marginTop: 2,
  },
  calloutRating: {
    color: C.secondary,
    fontFamily: F.mono,
    fontSize: 12,
    marginTop: 4,
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
