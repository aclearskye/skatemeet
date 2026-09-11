import { VoteButton } from "@/components/common/VoteButton";
import type { PreviewItem } from "@/components/map/MapPreviewCard";
import { toggleSpotVote } from "@/lib/spots/mutations";
import { toggleStoreVote } from "@/lib/stores/mutations";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { C } from "@/lib/theme";
import { TYPE_LABELS } from "@/utils/constants";
import { exhaustiveCheck } from "@/utils/typeGuards";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useEffect, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { styles } from "./EntityPreviewCard.styles";

type Props = {
  item: PreviewItem;
  onPress: () => void;
  initialHasVoted: boolean | null;
  distanceMiles?: number;
};

export function EntityPreviewCard({ item, onPress, initialHasVoted, distanceMiles }: Props) {
  const { session } = useAuthContext();
  const userId = session?.user.id ?? null;

  const isSpot = item.kind === "user-spot" || item.kind === "osm-spot";

  let name = "";
  let photoUrl: string | null = null;
  let typeLabel = "";
  let isVerified = false;
  let upvoteCount: number | null = null;
  let subtitle = "";
  let isDiy = false;
  let isStore = false;

  switch (item.kind) {
    case "user-spot": {
      const s = item.data;
      name = s.name;
      photoUrl = s.photo_url;
      typeLabel = TYPE_LABELS[s.type] ?? s.type.toUpperCase();
      isVerified = s.is_verified;
      upvoteCount = s.upvote_count;
      isDiy = s.type === "diy";
      break;
    }
    case "osm-spot": {
      const s = item.data;
      name = s.name;
      photoUrl = s.cover_photo_url ?? s.osm_image_url;
      typeLabel = TYPE_LABELS[s.spot_type] ?? s.spot_type.toUpperCase();
      subtitle = s.address;
      isDiy = s.spot_type === "diy";
      upvoteCount = s.upvote_count;
      break;
    }
    case "osm-store": {
      const s = item.data;
      name = s.name;
      photoUrl = s.cover_photo_url ?? s.osm_image_url;
      subtitle = s.address;
      typeLabel = "SKATE STORE";
      upvoteCount = s.upvote_count;
      isStore = true;
      break;
    }
    case "user-store": {
      const s = item.data;
      name = s.name;
      photoUrl = s.photo_url;
      subtitle = s.address;
      typeLabel = "SKATE STORE";
      upvoteCount = s.upvote_count;
      isStore = true;
      break;
    }
    default:
      exhaustiveCheck(item);
  }

  const metaLine = [subtitle, distanceMiles != null ? `${distanceMiles.toFixed(1)} MI AWAY` : ""]
    .filter(Boolean)
    .join(" · ");

  const spotId = item.kind === "user-spot" ? item.data.spot_id : null;
  const osmSpotId = item.kind === "osm-spot" ? item.data.place_id : null;
  const storeId = item.kind === "user-store" ? item.data.store_id : null;
  const osmStoreId = item.kind === "osm-store" ? item.data.place_id : null;

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
        : await toggleStoreVote(storeId, osmStoreId, userId);
      setHasVoted(result.user_has_voted);
      setLocalCount(result.upvote_count);
    } catch {
      setHasVoted(wasVoted);
      setLocalCount((prev) => (prev ?? 0) + (wasVoted ? 1 : -1));
    }
  }

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        {/* Photo + info (tap to open) */}
        <TouchableOpacity style={styles.previewRow} onPress={onPress} activeOpacity={0.85}>
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
              {localCount != null && hasVoted !== null && (
                <VoteButton
                  count={localCount}
                  hasVoted={hasVoted}
                  accent={isDiy ? C.tertiary : isStore ? C.secondary : C.primary}
                  onAccent={isDiy ? C.onTertiary : isStore ? C.onSecondary : C.onPrimary}
                  onPress={handleUpvote}
                  isLoading={false}
                  variant="pill"
                />
              )}
            </View>

            {/* Subtitle (address, and/or distance when sorted by nearest) */}
            {metaLine !== "" && (
              <Text style={styles.subtitle} numberOfLines={1}>{metaLine}</Text>
            )}
          </View>
        </TouchableOpacity>

        {/* CTA */}
        <TouchableOpacity
          style={[styles.cta, isDiy && styles.ctaDiy, !isSpot && styles.ctaStore]}
          onPress={onPress}
          activeOpacity={0.8}
        >
          <View style={styles.ctaIconRow}>
            <MaterialCommunityIcons
              name={isSpot ? "skateboarding" : "storefront-outline"}
              size={22}
              color={isDiy ? C.onTertiary : !isSpot ? C.onSecondary : C.onPrimary}
            />
            <Ionicons
              name="arrow-forward"
              size={13}
              color={isDiy ? C.onTertiary : !isSpot ? C.onSecondary : C.onPrimary}
            />
          </View>
          <Text style={[styles.ctaText, isDiy && styles.ctaTextDiy, !isSpot && styles.ctaTextStore]}>
            {isSpot ? "SKATE HERE" : "VIEW STORE"}
          </Text>
          {distanceMiles != null && (
            <Text style={[styles.ctaDistanceText, isDiy && styles.ctaTextDiy, !isSpot && styles.ctaTextStore]}>
              {`~${distanceMiles.toFixed(1)}MI`}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
