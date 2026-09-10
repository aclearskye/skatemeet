import { EntityPreviewCard } from "@/components/common/EntityPreviewCard";
import { OsmStore, OsmSpot, SkateSpot } from "@/lib/spots/types";
import { UserStore } from "@/lib/stores/types";
import { C, F } from "@/lib/theme";
import { entityDetailRoute } from "@/utils/entityNavigation";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import {
  Animated,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type PreviewItem =
  | { kind: "user-spot"; data: SkateSpot }
  | { kind: "osm-spot"; data: OsmSpot }
  | { kind: "osm-store"; data: OsmStore }
  | { kind: "user-store"; data: UserStore };

type Props = {
  item: PreviewItem;
  onDismiss: () => void;
  initialHasVoted: boolean | null;
};


export type SkeletonKind = "spot" | "diy" | "store";

export function MapPreviewCardSkeleton({ kind }: { kind: SkeletonKind }) {
  const insets = useSafeAreaInsets();
  const pulse = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 750, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.5, duration: 750, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  const isStore = kind === "store";
  const isDiy = kind === "diy";

  return (
    <View
      style={[
        styles.wrapper,
        Platform.OS === "web" && styles.wrapperWeb,
        { bottom: insets.bottom + 64 + 12 },
      ]}
    >
      <View style={styles.card}>
        <View style={styles.topRow}>
          <Animated.View style={[styles.previewRow, { opacity: pulse }]}>
            <View style={[styles.thumbImg, styles.skeletonBlock]} />
            <View style={styles.info}>
              <View style={[styles.skeletonBlock, { width: "65%", height: 18 }]} />
              <View style={styles.badgeRow}>
                <View style={[styles.skeletonBlock, { width: 56, height: 20 }]} />
                <View style={[styles.skeletonBlock, { width: 44, height: 20 }]} />
              </View>
              <View style={[styles.skeletonBlock, { width: "45%", height: 10 }]} />
            </View>
          </Animated.View>

          <View style={[styles.cta, isDiy && styles.ctaDiy, isStore && styles.ctaStore]}>
            <View style={styles.ctaIconRow}>
              <MaterialCommunityIcons
                name={isStore ? "storefront-outline" : "skateboarding"}
                size={22}
                color={isDiy ? C.onTertiary : isStore ? C.onSecondary : C.onPrimary}
              />
              <Ionicons
                name="arrow-forward"
                size={13}
                color={isDiy ? C.onTertiary : isStore ? C.onSecondary : C.onPrimary}
              />
            </View>
            <Text style={[styles.ctaText, isDiy && styles.ctaTextDiy, isStore && styles.ctaTextStore]}>
              {isStore ? "VIEW STORE" : "SKATE HERE"}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

export function MapPreviewCard({ item, onDismiss, initialHasVoted }: Props) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  function handleNavigate() {
    router.push(entityDetailRoute(item) as any);
    onDismiss();
  }

  return (
    <View
      style={[
        styles.wrapper,
        Platform.OS === "web" && styles.wrapperWeb,
        { bottom: insets.bottom + 64 + 12 },
      ]}
    >
      <EntityPreviewCard item={item} onPress={handleNavigate} initialHasVoted={initialHasVoted} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 12,
    right: 12,
  },
  wrapperWeb: {
    left: 0,
    right: 0,
    width: 560,
    maxWidth: "90%",
    marginHorizontal: "auto",
  },
  card: {
    backgroundColor: C.bgLow,
    borderWidth: 2,
    borderColor: C.border,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "stretch",
    padding: 12,
    gap: 10,
    position: "relative",
  },
  previewRow: {
    flex: 1,
    flexDirection: "row",
    gap: 12,
    minWidth: 0,
  },
  thumbImg: {
    width: 88,
    height: 88,
  },
  info: {
    flex: 1,
    gap: 5,
    justifyContent: "center",
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    justifyContent: "space-between",
  },
  cta: {
    width: 80,
    backgroundColor: C.primary,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 6,
  },
  ctaDiy: {
    backgroundColor: C.tertiary,
  },
  ctaStore: {
    backgroundColor: C.secondary,
  },
  ctaIconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  ctaText: {
    fontFamily: F.mono,
    fontSize: 9,
    color: C.onPrimary,
    letterSpacing: 0.5,
    textAlign: "center",
    lineHeight: 12,
  },
  ctaTextDiy: {
    color: C.onTertiary,
  },
  ctaTextStore: {
    color: C.onSecondary,
  },
  skeletonBlock: {
    backgroundColor: C.surfaceHigh,
  },
  skeletonCta: {
    backgroundColor: C.surfaceHigh,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  skeletonCtaInner: {
    width: 88,
    height: 12,
    backgroundColor: C.surfaceBright,
  },
  skeletonPillInner: {
    width: 29,
    height: 11,
    backgroundColor: C.surfaceHighest,
  },
});
