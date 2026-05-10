import { OsmShop, OsmSpot, SkateSpot, toggleSpotVote } from "@/lib/spots/skateSpots";
import { toggleStoreVote, UserShop } from "@/lib/stores/skateStores";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { C, F } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type PreviewItem =
  | { kind: "user-spot"; data: SkateSpot }
  | { kind: "osm-spot"; data: OsmSpot }
  | { kind: "osm-shop"; data: OsmShop }
  | { kind: "user-shop"; data: UserShop };

type Props = {
  item: PreviewItem;
  onDismiss: () => void;
  initialHasVoted: boolean | null;
};

const TYPE_LABELS: Record<string, string> = {
  street: "STREET",
  diy: "D.I.Y.",
  park: "PARK",
  indoor: "INDOOR",
};

export type SkeletonKind = "spot" | "diy" | "store";

export function MapPreviewCardSkeleton({ onDismiss, kind }: { onDismiss: () => void; kind: SkeletonKind }) {
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
    <View style={[styles.wrapper, { bottom: insets.bottom + 64 + 12 }]}>
      <View style={styles.card}>
        <TouchableOpacity style={styles.dismissBtn} onPress={onDismiss} hitSlop={12}>
          <Ionicons name="close" size={16} color={C.muted} />
        </TouchableOpacity>
        <Animated.View style={[styles.topRow, { opacity: pulse }]}>
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
          <Text style={[styles.ctaText, isDiy && styles.ctaTextDiy, isStore && styles.ctaTextStore]}>
            {isStore ? "VIEW STORE" : "SKATE HERE"}
          </Text>
        </View>
      </View>
    </View>
  );
}

export function MapPreviewCard({ item, onDismiss, initialHasVoted }: Props) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session } = useAuthContext();
  const userId = session?.user.id ?? null;

  const isSpot = item.kind === "user-spot" || item.kind === "osm-spot";

  let name = "";
  let photoUrl: string | null = null;
  let typeLabel = "";
  let isVerified = false;
  let upvoteCount: number | null = null;
  let subtitle = "";
  let isOsm = false;
  let isDiy = false;
  let isStore = false;

  if (item.kind === "user-spot") {
    const s = item.data;
    name = s.name;
    photoUrl = s.photo_url;
    typeLabel = TYPE_LABELS[s.type] ?? s.type.toUpperCase();
    isVerified = s.is_verified;
    upvoteCount = s.upvote_count;
    isDiy = s.type === "diy";
  } else if (item.kind === "osm-spot") {
    const s = item.data;
    name = s.name;
    typeLabel = TYPE_LABELS[s.spot_type] ?? s.spot_type.toUpperCase();
    subtitle = s.address;
    isOsm = true;
    isDiy = s.spot_type === "diy";
    upvoteCount = s.upvote_count;
  } else if (item.kind === "osm-shop") {
    const s = item.data;
    name = s.name;
    subtitle = s.address;
    typeLabel = "SKATE SHOP";
    isOsm = true;
    upvoteCount = s.upvote_count;
    isStore = true;
  } else {
    const s = item.data;
    name = s.name;
    subtitle = s.address;
    typeLabel = "SKATE SHOP";
    upvoteCount = s.upvote_count;
    isStore = true;
  }

  const spotId = item.kind === "user-spot" ? item.data.spot_id : null;
  const osmSpotId = item.kind === "osm-spot" ? item.data.place_id : null;
  const shopId = item.kind === "user-shop" ? item.data.shop_id : null;
  const osmShopId = item.kind === "osm-shop" ? item.data.place_id : null;

  const [hasVoted, setHasVoted] = useState<boolean | null>(initialHasVoted);
  const [localCount, setLocalCount] = useState(upvoteCount);

  useEffect(() => { setLocalCount(upvoteCount); }, [upvoteCount]);

  async function handleUpvote() {
    if (!userId || hasVoted === null) return;
    const wasVoted = hasVoted;
    setHasVoted(!wasVoted);
    setLocalCount((prev) => (prev ?? 0) + (wasVoted ? -1 : 1));
    try {
      const result = (spotId || osmSpotId)
        ? await toggleSpotVote(spotId, osmSpotId, userId)
        : await toggleStoreVote(shopId, osmShopId, userId);
      setHasVoted(result.user_has_voted);
      setLocalCount(result.upvote_count);
    } catch {
      setHasVoted(wasVoted);
      setLocalCount((prev) => (prev ?? 0) + (wasVoted ? 1 : -1));
    }
  }

  function handleNavigate() {
    router.push({
      pathname: isSpot ? "/spot-detail" : "/store-detail",
      params: { kind: item.kind, data: JSON.stringify(item.data) },
    } as any);
    onDismiss();
  }

  return (
    <View
      style={[
        styles.wrapper,
        { bottom: insets.bottom + 64 + 12 },
      ]}
    >
      <View style={styles.card}>
        {/* Dismiss */}
        <TouchableOpacity style={styles.dismissBtn} onPress={onDismiss} hitSlop={12}>
          <Ionicons name="close" size={16} color={C.muted} />
        </TouchableOpacity>

        {/* Top row: photo + info */}
        <TouchableOpacity style={styles.topRow} onPress={handleNavigate} activeOpacity={0.85}>
          {/* Thumbnail */}
          <View style={styles.thumb}>
            {photoUrl ? (
              <Image source={{ uri: photoUrl }} style={styles.thumbImg} contentFit="cover" />
            ) : (
              <View style={[styles.thumbImg, styles.thumbPlaceholder]}>
                <Ionicons
                  name={isSpot ? "location-sharp" : "storefront-outline"}
                  size={26}
                  color={C.muted}
                />
              </View>
            )}
          </View>

          {/* Info block */}
          <View style={styles.info}>
            {/* Name + VERIFIED stamp */}
            <View style={styles.nameRow}>
              <Text style={styles.name} numberOfLines={1}>{name}</Text>
              {isVerified && (
                <View style={styles.verifiedStamp}>
                  <Text style={styles.verifiedText}>VERIFIED</Text>
                </View>
              )}
            </View>

            {/* Badges + upvote pill */}
            <View style={styles.badgeRow}>
              <View style={styles.typeBadge}>
                <Text style={styles.typeBadgeText}>{typeLabel}</Text>
              </View>
              {isOsm && (
                <View style={styles.osmBadge}>
                  <Text style={styles.osmBadgeText}>OSM</Text>
                </View>
              )}
              {localCount != null && hasVoted !== null && (
                <TouchableOpacity
                  style={[
                    styles.upvotePill,
                    hasVoted && (isDiy ? styles.upvotePillDiy : isStore ? styles.upvotePillStore : styles.upvotePillFilled),
                    !hasVoted && (isDiy ? styles.upvotePillOutlineDiy : isStore ? styles.upvotePillOutlineStore : styles.upvotePillOutline),
                  ]}
                  onPress={handleUpvote}
                  activeOpacity={0.7}
                  hitSlop={8}
                >
                  <Ionicons
                    name="arrow-up"
                    size={11}
                    color={hasVoted
                      ? (isDiy ? C.onTertiary : isStore ? C.onSecondary : C.onPrimary)
                      : (isDiy ? C.tertiary : isStore ? C.secondary : C.primary)
                    }
                  />
                  <Text style={[
                    styles.upvotePillText,
                    hasVoted && (isDiy ? styles.upvotePillTextDiy : isStore ? styles.upvotePillTextStore : null),
                    !hasVoted && (isDiy ? styles.upvotePillTextOutlineDiy : isStore ? styles.upvotePillTextOutlineStore : styles.upvotePillTextOutline),
                  ]}>
                    {localCount}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Subtitle (address) */}
            {subtitle !== "" && (
              <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
            )}

          </View>

        </TouchableOpacity>

        {/* CTA */}
        <TouchableOpacity
          style={[styles.cta, isDiy && styles.ctaDiy, !isSpot && styles.ctaStore]}
          onPress={handleNavigate}
          activeOpacity={0.8}
        >
          <Text style={[styles.ctaText, isDiy && styles.ctaTextDiy, !isSpot && styles.ctaTextStore]}>
            {isSpot ? "SKATE HERE" : "VIEW STORE"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 12,
    right: 12,
  },
  card: {
    backgroundColor: C.bgLow,
    borderWidth: 2,
    borderColor: C.border,
  },
  dismissBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 10,
    padding: 4,
  },
  topRow: {
    flexDirection: "row",
    padding: 12,
    gap: 12,
    position: "relative",
  },
  thumb: {
    width: 88,
    height: 88,
    flexShrink: 0,
  },
  thumbImg: {
    width: 88,
    height: 88,
  },
  thumbPlaceholder: {
    backgroundColor: C.surfaceHigh,
    alignItems: "center",
    justifyContent: "center",
  },
  info: {
    flex: 1,
    gap: 5,
    justifyContent: "center",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  name: {
    fontFamily: F.heading,
    fontSize: 18,
    color: C.text,
    letterSpacing: 0.3,
    flexShrink: 1,
  },
  verifiedStamp: {
    backgroundColor: C.primary,
    paddingHorizontal: 7,
    paddingVertical: 2,
    transform: [{ rotate: "-2deg" }],
  },
  verifiedText: {
    fontFamily: F.mono,
    fontSize: 9,
    color: C.onPrimary,
    letterSpacing: 1,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    justifyContent: "space-between",
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: C.surfaceHigh,
    borderWidth: 1,
    borderColor: C.border,
  },
  typeBadgeText: {
    fontFamily: F.mono,
    fontSize: 9,
    color: C.textVariant,
    letterSpacing: 1,
  },
  osmBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  osmBadgeText: {
    fontFamily: F.mono,
    fontSize: 9,
    color: C.muted,
    letterSpacing: 1,
  },
  subtitle: {
    fontFamily: F.monoRegular,
    fontSize: 10,
    color: C.muted,
    letterSpacing: 0.3,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  ratingTextStore: {
    fontFamily: F.mono,
    fontSize: 10,
    color: C.secondary,
    marginLeft: 2,
  },
  upvotePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginLeft: "auto",
  },
  upvotePillFilled: {
    backgroundColor: C.primary,
  },
  upvotePillDiy: {
    backgroundColor: C.tertiary,
  },
  upvotePillStore: {
    backgroundColor: C.secondary,
  },
  upvotePillOutline: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: C.primary,
  },
  upvotePillOutlineDiy: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: C.tertiary,
  },
  upvotePillOutlineStore: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: C.secondary,
  },
  upvotePillText: {
    fontFamily: F.mono,
    fontSize: 10,
    letterSpacing: 0.5,
    color: C.onPrimary,
  },
  upvotePillTextDiy: {
    color: C.onTertiary,
  },
  upvotePillTextStore: {
    color: C.onSecondary,
  },
  upvotePillTextOutline: {
    color: C.primary,
  },
  upvotePillTextOutlineDiy: {
    color: C.tertiary,
  },
  upvotePillTextOutlineStore: {
    color: C.secondary,
  },
  cta: {
    backgroundColor: C.primary,
    paddingVertical: 13,
    alignItems: "center",
  },
  ctaDiy: {
    backgroundColor: C.tertiary,
  },
  ctaStore: {
    backgroundColor: C.secondary,
  },
  ctaText: {
    fontFamily: F.mono,
    fontSize: 12,
    color: C.onPrimary,
    letterSpacing: 2,
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
