import { OsmShop, OsmSpot, SkateSpot } from "@/lib/spots/skateSpots";
import { SkateStore, UserShop } from "@/lib/stores/skateStores";
import { C, F } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type PreviewItem =
  | { kind: "user-spot"; data: SkateSpot }
  | { kind: "osm-spot"; data: OsmSpot }
  | { kind: "skate-store"; data: SkateStore }
  | { kind: "osm-shop"; data: OsmShop }
  | { kind: "user-shop"; data: UserShop };

type Props = {
  item: PreviewItem;
  onDismiss: () => void;
};

const TYPE_LABELS: Record<string, string> = {
  street: "STREET",
  diy: "D.I.Y.",
  park: "PARK",
  indoor: "INDOOR",
};

export function MapPreviewCard({ item, onDismiss }: Props) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const isSpot = item.kind === "user-spot" || item.kind === "osm-spot";

  let name = "";
  let photoUrl: string | null = null;
  let typeLabel = "";
  let isVerified = false;
  let rating: number | null = null;
  let upvoteCount: number | null = null;
  let subtitle = "";
  let isOsm = false;
  let isDiy = false;

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
  } else if (item.kind === "skate-store") {
    const s = item.data;
    name = s.name;
    subtitle = s.address;
    rating = s.rating;
    typeLabel = "SKATE SHOP";
  } else if (item.kind === "osm-shop") {
    const s = item.data;
    name = s.name;
    subtitle = s.address;
    typeLabel = "SKATE SHOP";
    isOsm = true;
    upvoteCount = s.upvote_count;
  } else {
    const s = item.data;
    name = s.name;
    subtitle = s.address;
    typeLabel = "SKATE SHOP";
    upvoteCount = s.upvote_count;
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

            {/* Badges */}
            <View style={styles.badgeRow}>
              <View style={styles.typeBadge}>
                <Text style={styles.typeBadgeText}>{typeLabel}</Text>
              </View>
              {isOsm && (
                <View style={styles.osmBadge}>
                  <Text style={styles.osmBadgeText}>OSM</Text>
                </View>
              )}
            </View>

            {/* Subtitle (address) */}
            {subtitle !== "" && (
              <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
            )}

            {/* Rating (stores) */}
            {rating != null && (
              <View style={styles.ratingRow}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <Ionicons
                    key={i}
                    name={i <= Math.round(rating!) ? "star" : "star-outline"}
                    size={11}
                    color={i <= Math.round(rating!) ? C.secondary : C.border}
                  />
                ))}
                <Text style={styles.ratingTextStore}>{rating.toFixed(1)}</Text>
              </View>
            )}

            {/* Upvotes (user spots) */}
            {upvoteCount != null && (
              <View style={styles.ratingRow}>
                <Ionicons name="arrow-up-circle" size={12} color={isDiy ? C.tertiary : C.primary} />
                <Text style={[styles.ratingText, isDiy && styles.ratingTextDiy]}>
                  {upvoteCount} {upvoteCount === 1 ? "SKATER" : "SKATERS"}
                </Text>
              </View>
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
    paddingRight: 24,
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
    gap: 6,
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
  ratingText: {
    fontFamily: F.mono,
    fontSize: 10,
    color: C.primary,
    marginLeft: 2,
  },
  ratingTextDiy: {
    color: C.tertiary,
  },
  ratingTextStore: {
    fontFamily: F.mono,
    fontSize: 10,
    color: C.secondary,
    marginLeft: 2,
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
});
