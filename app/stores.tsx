import { useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useSearchLocation } from "@/lib/nearby/hooks/useSearchLocation";
import { useFollowedStores } from "@/lib/storeAccounts/hooks/useFollowedStores";
import { useNearbyStores } from "@/lib/storeAccounts/hooks/useNearbyStores";
import { useOpenStorePage } from "@/lib/storeAccounts/hooks/useOpenStorePage";
import { useVisitedStores } from "@/lib/storeAccounts/hooks/useVisitedStores";
import { storeListKey, type NearbyStore, type StoreListItem, type VisitedStore } from "@/lib/storeAccounts/types";
import { C, F } from "@/lib/theme";
import BurgerButton from "@/components/ui/BurgerButton";
import { DuctTapeLabel } from "@/components/common/DuctTapeLabel";
import { CartButton } from "@/components/stores/CartButton";
import { StoreListRow } from "@/components/stores/StoreListRow";
import { BackButton } from "@/components/common/BackButton";

type StoresTab = "nearest" | "following" | "visited";

const TABS: { key: StoresTab; label: string }[] = [
  { key: "nearest", label: "NEAREST" },
  { key: "following", label: "FOLLOWING" },
  { key: "visited", label: "VISITED" },
];

const EMPTY_MESSAGES: Record<StoresTab, string> = {
  nearest: "NO STORES ON SKATEMEET NEAR YOU YET",
  following: "FOLLOW A STORE TO SEE IT HERE",
  visited: "CHECK IN AT A STORE TO SEE IT HERE",
};

function visitedDetail(store: VisitedStore): string {
  const date = new Date(store.lastVisitedAt).toLocaleDateString(undefined, { day: "numeric", month: "short" });
  return store.visitCount === 1 ? `Visited ${date}` : `${store.visitCount} visits · last ${date}`;
}

// Claimed stores (drawer, Stores). Nearest: within 50 km of the search
// location (the same one the Search tab uses). Following: stores you follow.
// Visited: stores you've checked in at, claimed or not.
// The cart is a button here rather than its own drawer entry.
export default function StoresScreen() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<StoresTab>("nearest");
  const searchLocation = useSearchLocation();
  const nearby = useNearbyStores(tab === "nearest" ? searchLocation.coords : null);
  const followed = useFollowedStores(tab === "following");
  const visited = useVisitedStores(tab === "visited");
  const { openStorePage } = useOpenStorePage();

  const isNearest = tab === "nearest";
  const active = tab === "nearest" ? nearby : tab === "following" ? followed : visited;
  const stores: (StoreListItem | NearbyStore | VisitedStore)[] = active.data ?? [];
  const isLocating = isNearest && searchLocation.coords == null && searchLocation.status === "locating";
  const noLocation = isNearest && searchLocation.coords == null && !isLocating;

  const emptyMessage = active.isError
    ? "COULDN'T LOAD STORES"
    : noLocation
      ? "TURN ON LOCATION OR PICK A CITY IN SEARCH TO FIND STORES NEARBY"
      : EMPTY_MESSAGES[tab];

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <BackButton />
        <Text style={styles.heading}>STORES</Text>
        <View style={styles.actions}>
          <CartButton />
          <BurgerButton />
        </View>
      </View>

      {/* Its own row under the header: with the back arrow, cart and menu
          in the header there isn't room for the tapes on a phone. */}
      <View style={styles.tabBar}>
        <View style={styles.tabs} accessibilityRole="tablist">
          {TABS.map((t) => {
            const isActive = tab === t.key;
            return (
              <DuctTapeLabel
                key={t.key}
                color={isActive ? C.primary : C.tape}
                onPress={() => setTab(t.key)}
                style={styles.tape}
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}
                accessibilityLabel={`${t.label.toLowerCase()} stores`}
              >
                <Text style={[styles.tab, isActive && styles.tabActive]}>{t.label}</Text>
              </DuctTapeLabel>
            );
          })}
        </View>
      </View>

      {active.isLoading || isLocating ? (
        <View style={styles.centered}>
          <ActivityIndicator color={C.primary} />
        </View>
      ) : (
        <FlatList
          key={tab}
          data={stores}
          keyExtractor={storeListKey}
          renderItem={({ item }) => (
            <StoreListRow
              store={item}
              meters={"meters" in item ? item.meters : undefined}
              detail={"lastVisitedAt" in item ? visitedDetail(item) : undefined}
              onPress={() => openStorePage({ storeId: item.storeId, osmPlaceId: item.osmPlaceId }).catch(() => {})}
            />
          )}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
          onRefresh={() => active.refetch()}
          refreshing={active.isRefetching}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Ionicons
                name={active.isError ? "alert-circle-outline" : "storefront-outline"}
                size={32}
                color={C.muted}
              />
              <Text style={styles.empty}>{emptyMessage}</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: C.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  heading: { flex: 1, fontFamily: F.heading, fontSize: 20, color: C.text, letterSpacing: 2 },
  tabBar: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.borderVariant,
  },
  // Same tapes as the feed's Global / Following, centred in their row.
  tabs: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  tape: { paddingHorizontal: 10, paddingVertical: 5 },
  tab: { fontFamily: F.mono, fontSize: 11, color: C.onTape, letterSpacing: 1.5 },
  tabActive: { color: C.onPrimary },
  actions: { flexDirection: "row", alignItems: "center", gap: 18 },
  list: { flexGrow: 1, padding: 16, gap: 10 },
  centered: { flex: 1, minHeight: 300, alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 24 },
  empty: { fontFamily: F.mono, fontSize: 11, color: C.muted, letterSpacing: 1.5, textAlign: "center" },
});
