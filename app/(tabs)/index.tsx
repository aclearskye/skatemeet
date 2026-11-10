import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFeed } from "@/lib/feed/hooks/useFeed";
import type { FeedTab } from "@/lib/feed/types";
import { C, F } from "@/lib/theme";
import BurgerButton from "@/components/ui/BurgerButton";
import { PostViewer } from "@/components/posts/PostViewer";
import { DuctTapeLabel } from "@/components/common/DuctTapeLabel";

const TABS: { key: FeedTab; label: string }[] = [
  { key: "global", label: "GLOBAL" },
  { key: "following", label: "FOLLOWING" },
];

// Global: every public post (plus private friends'), ranked by recency,
// likes, follows and spots near you. Following: only people you follow.
export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<FeedTab>("global");
  const feed = useFeed(tab);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.heading}>FEED</Text>
        <View style={styles.tabs} accessibilityRole="tablist">
          {/* DuctTapeLabel rolls its own random tilt per mount, so the two
              strips never sit at the same angle. Its tilt is fixed once
              mounted, so switching tabs only changes the colour. */}
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
                accessibilityLabel={`${t.label.toLowerCase()} feed`}
              >
                <Text style={[styles.tab, isActive && styles.tabActive]}>{t.label}</Text>
              </DuctTapeLabel>
            );
          })}
        </View>
        <View style={styles.actions}>
          <BurgerButton />
        </View>
      </View>

      {feed.isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={C.primary} />
        </View>
      ) : (
        <PostViewer
          key={tab}
          posts={feed.posts}
          onEndReached={feed.loadMore}
          onRefresh={feed.refresh}
          isRefreshing={feed.isRefreshing}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Ionicons name={feed.isError ? "alert-circle-outline" : "images-outline"} size={32} color={C.muted} />
              <Text style={styles.empty}>
                {feed.isError
                  ? "COULDN'T LOAD THE FEED"
                  : tab === "following"
                    ? "FOLLOW SKATERS TO FILL THIS TAB"
                    : "NO POSTS YET — BE THE FIRST"}
              </Text>
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
    justifyContent: "space-between",
    gap: 12,
  },
  heading: {
    fontFamily: F.heading,
    fontSize: 20,
    color: C.text,
    letterSpacing: 2,
  },
  // Fills the gap between FEED and the actions and centres the two labels
  // in it. Only the colour marks the active tab, so neither the labels nor
  // the heading shift when switching.
  tabs: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  // Square-edged strip; colour and tilt come from DuctTapeLabel.
  tape: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  tab: {
    fontFamily: F.mono,
    fontSize: 11,
    color: C.onTape,
    letterSpacing: 1.5,
  },
  tabActive: {
    color: C.onPrimary,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  centered: {
    flex: 1,
    minHeight: 300,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  empty: {
    fontFamily: F.mono,
    fontSize: 11,
    color: C.muted,
    letterSpacing: 1.5,
  },
});
