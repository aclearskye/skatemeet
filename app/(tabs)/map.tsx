import { fetchNearbySkateStores, SkateStore } from "@/lib/stores/skateStores";
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

const DEBOUNCE_MS = 800;

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const [status, setStatus] = useState<Status>("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [stores, setStores] = useState<SkateStore[]>([]);
  const [initialRegion, setInitialRegion] = useState<Region | null>(null);
  const [search, setSearch] = useState("");
  const [activeFilters, setActiveFilters] = useState<Set<FilterKey>>(
    new Set<FilterKey>(["spots", "diys", "stores"])
  );
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadStores = useCallback(async (lat: number, lng: number) => {
    try {
      const results = await fetchNearbySkateStores({ lat, lng });
      setStores(results);
    } catch {
      setErrorMsg("Could not load nearby stores. Please try again.");
    }
  }, []);

  useEffect(() => {
    (async () => {
      const { status: permStatus } =
        await Location.requestForegroundPermissionsAsync();

      if (permStatus !== "granted") {
        setStatus("denied");
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = location.coords;
      setInitialRegion({
        latitude,
        longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });

      setStatus("ready");
      await loadStores(latitude, longitude);
    })();
  }, [loadStores]);

  const handleRegionChangeComplete = useCallback(
    (region: Region) => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        loadStores(region.latitude, region.longitude);
      }, DEBOUNCE_MS);
    },
    [loadStores]
  );

  const toggleFilter = (key: FilterKey) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const visibleStores = activeFilters.has("stores")
    ? stores.filter(
        (s) =>
          search === "" ||
          s.name.toLowerCase().includes(search.toLowerCase()) ||
          s.address.toLowerCase().includes(search.toLowerCase())
      )
    : [];

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
          Enable location access in your device settings to find skate spots
          near you.
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
        >
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
                    <Text style={styles.calloutRating}>
                      ★ {store.rating.toFixed(1)}
                    </Text>
                  )}
                </View>
              </Callout>
            </Marker>
          ))}
        </MapView>
      )}

      {/* Search + filter overlay */}
      <View style={[styles.overlay, { top: insets.top + 12 }]}>
        <View style={styles.searchRow}>
          <Ionicons
            name="search-outline"
            size={16}
            color={C.muted}
            style={styles.searchIcon}
          />
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

      {errorMsg && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{errorMsg}</Text>
          <TouchableOpacity onPress={() => setErrorMsg(null)}>
            <Text style={styles.errorBannerDismiss}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {visibleStores.length === 0 && status === "ready" && !errorMsg && (
        <View style={styles.emptyBanner}>
          <Text style={styles.emptyText}>NOTHING FOUND NEARBY.</Text>
        </View>
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
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: C.text,
    fontFamily: F.body,
    fontSize: 14,
    padding: 0,
  },
  filtersRow: {
    flexDirection: "row",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 2,
    borderColor: C.border,
    backgroundColor: C.bg,
  },
  chipActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  chipText: {
    fontFamily: F.mono,
    fontSize: 10,
    letterSpacing: 1,
    color: C.muted,
    textTransform: "uppercase",
  },
  chipTextActive: {
    color: C.onPrimary,
  },

  // Callout
  callout: { width: 200, padding: 4 },
  calloutName: {
    fontFamily: F.bodyBold,
    fontSize: 14,
  },
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
  errorBannerDismiss: {
    color: C.error,
    fontFamily: F.mono,
    fontSize: 12,
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
