import { useAuthContext } from "@/lib/context/use-auth-context";
import {
  getUserVoteStatus,
  OsmSpot,
  SkateSpot,
  toggleSpotVote,
} from "@/lib/spots/skateSpots";
import { C, F } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  spot: SkateSpot | OsmSpot | null;
  spotKind: "user" | "osm" | null;
  onClose: () => void;
  onSpotUpdated?: (updated: SkateSpot) => void;
};

function isSkateSpot(spot: SkateSpot | OsmSpot): spot is SkateSpot {
  return "spot_id" in spot;
}

const SPOT_TYPE_LABELS: Record<string, string> = {
  street: "STREET",
  diy: "DIY",
  park: "PARK",
  indoor: "INDOOR",
};

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export function SpotDetailSheet({ spot, spotKind, onClose, onSpotUpdated }: Props) {
  const insets = useSafeAreaInsets();
  const { session } = useAuthContext();

  const [userHasVoted, setUserHasVoted] = useState(false);
  const [localUpvoteCount, setLocalUpvoteCount] = useState(0);
  const [isVerified, setIsVerified] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const [isLoadingVoteStatus, setIsLoadingVoteStatus] = useState(false);

  useEffect(() => {
    if (!spot || !isSkateSpot(spot) || !session) return;

    setLocalUpvoteCount(spot.upvote_count);
    setIsVerified(spot.is_verified);
    setUserHasVoted(false);
    setIsLoadingVoteStatus(true);

    getUserVoteStatus(spot.spot_id, session.user.id)
      .then(setUserHasVoted)
      .catch(() => {})
      .finally(() => setIsLoadingVoteStatus(false));
  }, [spot, session]);

  async function handleVote() {
    if (!spot || !isSkateSpot(spot) || !session || isVoting) return;
    setIsVoting(true);
    try {
      const result = await toggleSpotVote(spot.spot_id, session.user.id);
      setUserHasVoted(result.user_has_voted);
      setLocalUpvoteCount(result.upvote_count);
      const newIsVerified = result.upvote_count >= 3;
      setIsVerified(newIsVerified);
      onSpotUpdated?.({
        ...spot,
        upvote_count: result.upvote_count,
        is_verified: newIsVerified,
      });
    } catch {
      // silently ignore vote errors
    } finally {
      setIsVoting(false);
    }
  }

  const visible = spot !== null;
  const spotTypeLabel = spot
    ? isSkateSpot(spot)
      ? SPOT_TYPE_LABELS[spot.type] ?? spot.type.toUpperCase()
      : SPOT_TYPE_LABELS[spot.spot_type] ?? spot.spot_type.toUpperCase()
    : "";

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { maxHeight: SCREEN_HEIGHT * 0.65, paddingBottom: insets.bottom + 16 }]}>
        {/* Handle bar */}
        <View style={styles.handleBar} />

        {/* Close */}
        <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={12}>
          <Ionicons name="close" size={20} color={C.muted} />
        </TouchableOpacity>

        <ScrollView bounces={false}>
          {/* Photo */}
          {spot && isSkateSpot(spot) && spot.photo_url && (
            <Image
              source={{ uri: spot.photo_url }}
              style={styles.photo}
              contentFit="cover"
            />
          )}

          <View style={styles.body}>
            {/* Name + badges */}
            <View style={styles.nameRow}>
              <Text style={styles.name} numberOfLines={2}>
                {spot?.name}
              </Text>
            </View>

            <View style={styles.badgeRow}>
              <View style={styles.typeBadge}>
                <Text style={styles.typeBadgeText}>{spotTypeLabel}</Text>
              </View>
              {spot && isSkateSpot(spot) && isVerified && (
                <View style={styles.verifiedBadge}>
                  <Text style={styles.verifiedBadgeText}>VERIFIED</Text>
                </View>
              )}
              {spotKind === "osm" && (
                <View style={styles.osmBadge}>
                  <Text style={styles.osmBadgeText}>FROM OSM</Text>
                </View>
              )}
            </View>

            {/* Description */}
            {spot && isSkateSpot(spot) && spot.description && (
              <Text style={styles.description}>{spot.description}</Text>
            )}

            {/* Address (OSM spots) */}
            {spot && !isSkateSpot(spot) && spot.address !== "" && (
              <Text style={styles.address}>{spot.address}</Text>
            )}

            {/* Difficulty */}
            {spot && isSkateSpot(spot) && spot.difficulty != null && (
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Ionicons
                    key={star}
                    name={star <= (spot as SkateSpot).difficulty! ? "star" : "star-outline"}
                    size={16}
                    color={star <= (spot as SkateSpot).difficulty! ? C.primary : C.border}
                  />
                ))}
              </View>
            )}

            {/* Vote row */}
            {spotKind === "user" && spot && isSkateSpot(spot) && (
              <TouchableOpacity
                style={styles.voteRow}
                onPress={handleVote}
                disabled={isVoting || isLoadingVoteStatus}
                activeOpacity={0.75}
              >
                {isLoadingVoteStatus ? (
                  <ActivityIndicator size="small" color={C.muted} />
                ) : (
                  <>
                    <Ionicons
                      name={userHasVoted ? "arrow-up-circle" : "arrow-up-circle-outline"}
                      size={28}
                      color={userHasVoted ? C.primary : C.muted}
                    />
                    <Text style={[styles.voteCount, userHasVoted && styles.voteCountActive]}>
                      {localUpvoteCount}
                    </Text>
                    {!isVerified && (
                      <Text style={styles.voteHint}>
                        {Math.max(0, 3 - localUpvoteCount)} more to verify
                      </Text>
                    )}
                    {isVoting && (
                      <ActivityIndicator size="small" color={C.primary} style={{ marginLeft: 8 }} />
                    )}
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
    marginTop: "auto",
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: C.border,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 4,
  },
  closeBtn: {
    position: "absolute",
    top: 16,
    right: 16,
    zIndex: 10,
    padding: 4,
  },
  photo: {
    width: "100%",
    aspectRatio: 16 / 9,
  },
  body: {
    padding: 20,
    gap: 12,
  },
  nameRow: {
    paddingRight: 32,
  },
  name: {
    fontFamily: F.heading,
    fontSize: 24,
    color: C.text,
    letterSpacing: 0.5,
  },
  badgeRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: C.surfaceHigh,
    borderWidth: 1,
    borderColor: C.border,
  },
  typeBadgeText: {
    fontFamily: F.mono,
    fontSize: 10,
    color: C.textVariant,
    letterSpacing: 1,
  },
  verifiedBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: C.primary,
  },
  verifiedBadgeText: {
    fontFamily: F.mono,
    fontSize: 10,
    color: C.onPrimary,
    letterSpacing: 1,
  },
  osmBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  osmBadgeText: {
    fontFamily: F.mono,
    fontSize: 10,
    color: C.muted,
    letterSpacing: 1,
  },
  description: {
    fontFamily: F.body,
    fontSize: 14,
    color: C.text,
    lineHeight: 22,
  },
  address: {
    fontFamily: F.monoRegular,
    fontSize: 12,
    color: C.muted,
  },
  starsRow: {
    flexDirection: "row",
    gap: 2,
  },
  voteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: C.border,
    marginTop: 4,
  },
  voteCount: {
    fontFamily: F.mono,
    fontSize: 16,
    color: C.muted,
  },
  voteCountActive: {
    color: C.primary,
  },
  voteHint: {
    fontFamily: F.monoRegular,
    fontSize: 11,
    color: C.muted,
    letterSpacing: 0.5,
  },
});
