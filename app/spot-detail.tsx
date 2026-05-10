import { useAuthContext } from "@/lib/context/use-auth-context";
import {
  fetchSpotAverageRating,
  fetchSpotCards,
  getSpotCardVoteStatuses,
  getSpotFavouriteStatus,
  getUserVoteStatus,
  OsmSpot,
  SkateSpot,
  SpotCard,
  SpotCardWithProfile,
  toggleSpotCardVote,
  toggleSpotFavourite,
  toggleSpotVote,
} from "@/lib/spots/skateSpots";
import { AddSpotCardSheet } from "@/components/spots/AddSpotCardSheet";
import { C, F } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Params = {
  kind: string;
  data: string;
};

const TYPE_LABELS: Record<string, string> = {
  street: "STREET",
  diy: "D.I.Y.",
  park: "PARK",
  indoor: "INDOOR",
};

function isSkateSpot(spot: SkateSpot | OsmSpot): spot is SkateSpot {
  return "spot_id" in spot;
}

type SpotCardItemProps = {
  card: SpotCardWithProfile;
  isVoted: boolean;
  accent: string;
  onUpvote: (cardId: string) => void;
};

function SpotCardItem({ card, isVoted, accent, onUpvote }: SpotCardItemProps) {
  return (
    <View style={cardStyles.container}>
      <View style={cardStyles.topRow}>
        <Text style={cardStyles.heading}>{card.heading}</Text>
        {!card.is_verified && (
          <View style={cardStyles.needsVotesBadge}>
            <Text style={cardStyles.needsVotesText}>NEEDS VOTES {card.upvote_count}/3</Text>
          </View>
        )}
      </View>

      {card.rating != null && (
        <View style={cardStyles.starsRow}>
          {[1, 2, 3, 4, 5].map((i) => (
            <Ionicons
              key={i}
              name={i <= Math.round(card.rating!) ? "star" : "star-outline"}
              size={14}
              color={i <= Math.round(card.rating!) ? accent : C.border}
            />
          ))}
        </View>
      )}

      <Text style={cardStyles.comment}>{card.comment}</Text>

      <View style={cardStyles.metaRow}>
        <Text style={cardStyles.author}>
          {card.profiles.display_name ?? card.profiles.username}
        </Text>
        <View style={cardStyles.metaRight}>
          <Text style={cardStyles.date}>
            {new Date(card.created_at).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </Text>
          <TouchableOpacity
            onPress={() => onUpvote(card.card_id)}
            style={cardStyles.upvoteBtn}
            hitSlop={8}
            activeOpacity={0.75}
          >
            <Ionicons
              name={isVoted ? "arrow-up-circle" : "arrow-up-circle-outline"}
              size={18}
              color={isVoted ? accent : C.muted}
            />
            <Text style={[cardStyles.upvoteCount, isVoted && { color: accent }]}>
              {card.upvote_count}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const cardStyles = StyleSheet.create({
  container: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    gap: 8,
    marginBottom: 10,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  heading: {
    fontFamily: F.heading,
    fontSize: 16,
    color: C.text,
    letterSpacing: 0.3,
    flex: 1,
  },
  needsVotesBadge: {
    backgroundColor: C.surfaceHigh,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  needsVotesText: {
    fontFamily: F.mono,
    fontSize: 9,
    color: C.muted,
    letterSpacing: 1,
  },
  starsRow: { flexDirection: "row", gap: 3 },
  comment: {
    fontFamily: F.body,
    fontSize: 14,
    color: C.textVariant,
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  metaRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  author: {
    fontFamily: F.monoRegular,
    fontSize: 10,
    color: C.muted,
    letterSpacing: 0.5,
  },
  date: {
    fontFamily: F.monoRegular,
    fontSize: 10,
    color: C.muted,
  },
  upvoteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  upvoteCount: {
    fontFamily: F.mono,
    fontSize: 11,
    color: C.muted,
  },
});

export default function SpotDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session } = useAuthContext();
  const { kind, data } = useLocalSearchParams<Params>();

  const spot: SkateSpot | OsmSpot = JSON.parse(data);
  const isUser = kind === "user-spot";
  const isOsm = kind === "osm-spot";

  const isDiy = isSkateSpot(spot) ? spot.type === "diy" : spot.spot_type === "diy";
  const accent = isDiy ? C.tertiary : C.primary;
  const onAccent = isDiy ? C.onTertiary : C.onPrimary;

  const spotId: string | null = isUser ? (spot as SkateSpot).spot_id : null;
  const osmPlaceId: string | null = isOsm ? (spot as OsmSpot).place_id : null;
  const lat = isUser ? (spot as SkateSpot).latitude : (spot as OsmSpot).coordinates.lat;
  const lng = isUser ? (spot as SkateSpot).longitude : (spot as OsmSpot).coordinates.lng;

  const [userHasVoted, setUserHasVoted] = useState(false);
  const [localVoteCount, setLocalVoteCount] = useState(spot.upvote_count);
  const [isVerified, setIsVerified] = useState(
    isSkateSpot(spot) ? spot.is_verified : false
  );
  const [isVoting, setIsVoting] = useState(false);
  const [isLoadingVote, setIsLoadingVote] = useState(true);

  const [isFavourited, setIsFavourited] = useState(false);
  const [isTogglingFav, setIsTogglingFav] = useState(false);
  const [cards, setCards] = useState<SpotCardWithProfile[]>([]);
  const [isLoadingCards, setIsLoadingCards] = useState(true);
  const [avgRating, setAvgRating] = useState<{ average: number | null; count: number }>({ average: null, count: 0 });
  const [cardVotes, setCardVotes] = useState<Record<string, boolean>>({});
  const [showAddCard, setShowAddCard] = useState(false);

  useEffect(() => {
    if (!session) return;

    getUserVoteStatus(spotId, osmPlaceId, session.user.id)
      .then(setUserHasVoted)
      .catch(() => {})
      .finally(() => setIsLoadingVote(false));

    Promise.all([
      fetchSpotCards(spotId, osmPlaceId),
      fetchSpotAverageRating(spotId, osmPlaceId),
      getSpotFavouriteStatus(spotId, osmPlaceId, session.user.id),
    ])
      .then(([fetchedCards, rating, fav]) => {
        setCards(fetchedCards);
        setAvgRating(rating);
        setIsFavourited(fav);
        if (fetchedCards.length > 0) {
          getSpotCardVoteStatuses(
            fetchedCards.map((c) => c.card_id),
            session.user.id
          )
            .then(setCardVotes)
            .catch(() => {});
        }
      })
      .catch(() => {})
      .finally(() => setIsLoadingCards(false));
  }, []);

  async function handleVote() {
    if (!session || isVoting) return;
    setIsVoting(true);
    try {
      const result = await toggleSpotVote(spotId, osmPlaceId, session.user.id);
      setUserHasVoted(result.user_has_voted);
      setLocalVoteCount(result.upvote_count);
      if (isUser) setIsVerified(result.upvote_count >= 3);
    } catch {
      // silently ignore
    } finally {
      setIsVoting(false);
    }
  }

  async function handleFavourite() {
    if (isTogglingFav || !session) return;
    setIsTogglingFav(true);
    setIsFavourited((prev) => !prev);
    try {
      const newState = await toggleSpotFavourite(spotId, osmPlaceId, session.user.id);
      setIsFavourited(newState);
    } catch {
      setIsFavourited((prev) => !prev);
    } finally {
      setIsTogglingFav(false);
    }
  }

  function handleDirections() {
    const label = encodeURIComponent(spot.name);
    const url =
      Platform.OS === "ios"
        ? `maps:0,0?q=${label}@${lat},${lng}`
        : `geo:${lat},${lng}?q=${lat},${lng}(${label})`;
    Linking.openURL(url);
  }

  async function handleCardUpvote(cardId: string) {
    if (!session) return;
    const optimistic = !cardVotes[cardId];
    setCardVotes((prev) => ({ ...prev, [cardId]: optimistic }));
    setCards((prev) =>
      prev.map((c) => {
        if (c.card_id !== cardId) return c;
        const newCount = c.upvote_count + (optimistic ? 1 : -1);
        return { ...c, upvote_count: newCount, is_verified: newCount >= 3 };
      })
    );
    try {
      await toggleSpotCardVote(cardId, session.user.id);
    } catch {
      setCardVotes((prev) => ({ ...prev, [cardId]: !optimistic }));
    }
  }

  function handleCardCreated(card: SpotCard) {
    const cardWithProfile: SpotCardWithProfile = {
      ...card,
      profiles: {
        username: session!.user.email ?? "you",
        display_name: null,
      },
    };
    setCards((prev) => [cardWithProfile, ...prev]);
    fetchSpotAverageRating(spotId, osmPlaceId)
      .then(setAvgRating)
      .catch(() => {});
  }

  const typeLabel = isSkateSpot(spot)
    ? (TYPE_LABELS[spot.type] ?? spot.type.toUpperCase())
    : (TYPE_LABELS[spot.spot_type] ?? spot.spot_type.toUpperCase());

  const photoUrl = isSkateSpot(spot) ? spot.photo_url : null;
  const description = isSkateSpot(spot) ? spot.description : null;
  const address = isOsm ? (spot as OsmSpot).address : null;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>SPOT DETAILS</Text>
        <TouchableOpacity onPress={handleFavourite} hitSlop={12} style={styles.favBtn} disabled={isTogglingFav}>
          <Ionicons
            name={isFavourited ? "heart" : "heart-outline"}
            size={22}
            color={isFavourited ? accent : C.muted}
          />
        </TouchableOpacity>
      </View>

      <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
        {/* Photo / placeholder */}
        {photoUrl ? (
          <Image source={{ uri: photoUrl }} style={styles.photo} contentFit="cover" />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Ionicons name="location-sharp" size={48} color={C.muted} />
          </View>
        )}

        <View style={styles.body}>
          {/* Name */}
          <Text style={styles.name}>{spot.name}</Text>

          {/* Badges */}
          <View style={styles.badgeRow}>
            <View style={styles.typeBadge}>
              <Text style={styles.typeBadgeText}>{typeLabel}</Text>
            </View>
            {isUser && isVerified && (
              <View style={[styles.verifiedBadge, { backgroundColor: accent }]}>
                <Text style={[styles.verifiedBadgeText, { color: onAccent }]}>VERIFIED</Text>
              </View>
            )}
            {isOsm && (
              <View style={styles.osmBadge}>
                <Text style={styles.osmBadgeText}>FROM OSM</Text>
              </View>
            )}
          </View>

          {/* Get Directions */}
          <TouchableOpacity
            style={[styles.directionsBtn, { backgroundColor: accent }]}
            onPress={handleDirections}
            activeOpacity={0.85}
          >
            <Ionicons name="navigate-outline" size={16} color={onAccent} />
            <Text style={[styles.directionsBtnText, { color: onAccent }]}>GET DIRECTIONS</Text>
          </TouchableOpacity>

          {/* Description */}
          {description != null && description !== "" && (
            <Text style={styles.description}>{description}</Text>
          )}

          {/* Address (OSM) */}
          {address != null && address !== "" && (
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={15} color={C.muted} />
              <Text style={styles.infoText}>{address}</Text>
            </View>
          )}

          {/* Community votes — all spot types */}
          <View style={styles.voteSection}>
            <View style={styles.voteMeta}>
              <Text style={styles.voteLabel}>COMMUNITY VOTES</Text>
              {isUser && !isVerified && (
                <Text style={styles.voteHint}>
                  {Math.max(0, 3 - localVoteCount)} more to verify
                </Text>
              )}
            </View>
            <TouchableOpacity
              style={[styles.voteBtn, userHasVoted && { backgroundColor: accent, borderColor: accent }]}
              onPress={handleVote}
              disabled={isVoting || isLoadingVote}
              activeOpacity={0.75}
            >
              {isLoadingVote || isVoting ? (
                <ActivityIndicator size="small" color={userHasVoted ? onAccent : C.muted} />
              ) : (
                <>
                  <Ionicons
                    name={userHasVoted ? "arrow-up-circle" : "arrow-up-circle-outline"}
                    size={20}
                    color={userHasVoted ? onAccent : C.muted}
                  />
                  <Text style={[styles.voteBtnText, userHasVoted && { color: onAccent }]}>
                    {localVoteCount} {userHasVoted ? "VOTED" : "UPVOTE"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Difficulty — community average from cards */}
          {avgRating.count > 0 && (
            <View style={styles.ratingSection}>
              <Text style={styles.sectionLabel}>DIFFICULTY</Text>
              <View style={styles.ratingBlock}>
                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Ionicons
                      key={i}
                      name={
                        avgRating.average != null && i <= Math.round(avgRating.average)
                          ? "star"
                          : "star-outline"
                      }
                      size={20}
                      color={
                        avgRating.average != null && i <= Math.round(avgRating.average)
                          ? accent
                          : C.border
                      }
                    />
                  ))}
                </View>
                <Text style={[styles.ratingText, { color: accent }]}>
                  {avgRating.average != null ? avgRating.average.toFixed(1) : "—"}
                </Text>
                <Text style={styles.ratingCount}>
                  ({avgRating.count} {avgRating.count === 1 ? "RATING" : "RATINGS"})
                </Text>
              </View>
            </View>
          )}

          {/* Community Cards */}
          <View style={styles.cardsSection}>
            <View style={styles.cardsSectionHeader}>
              <Text style={styles.sectionLabel}>COMMUNITY CARDS</Text>
              <Text style={styles.cardsCount}>{cards.length}</Text>
            </View>

            {isLoadingCards ? (
              <ActivityIndicator color={accent} style={{ marginVertical: 20 }} />
            ) : cards.length === 0 ? (
              <Text style={styles.emptyText}>No cards yet. Add one to share what you know.</Text>
            ) : (
              cards.map((card) => (
                <SpotCardItem
                  key={card.card_id}
                  card={card}
                  isVoted={!!cardVotes[card.card_id]}
                  accent={accent}
                  onUpvote={handleCardUpvote}
                />
              ))
            )}

            <TouchableOpacity
              style={[styles.addCardBtn, { backgroundColor: accent }]}
              onPress={() => setShowAddCard(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="add" size={16} color={onAccent} />
              <Text style={[styles.addCardBtnText, { color: onAccent }]}>ADD CARD</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <AddSpotCardSheet
        visible={showAddCard}
        onClose={() => setShowAddCard(false)}
        onCardCreated={handleCardCreated}
        spotId={spotId}
        osmPlaceId={osmPlaceId}
        isDiy={isDiy}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: C.border,
  },
  backBtn: { width: 30 },
  favBtn: { width: 30, alignItems: "flex-end" },
  headerTitle: {
    fontFamily: F.mono,
    fontSize: 11,
    color: C.muted,
    letterSpacing: 2,
  },
  photo: { width: "100%", aspectRatio: 16 / 9 },
  photoPlaceholder: {
    width: "100%",
    aspectRatio: 16 / 9,
    backgroundColor: C.surfaceHigh,
    alignItems: "center",
    justifyContent: "center",
  },
  body: { padding: 20, gap: 14 },
  name: {
    fontFamily: F.heading,
    fontSize: 28,
    color: C.text,
    letterSpacing: 0.5,
  },
  badgeRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
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
  verifiedBadge: { paddingHorizontal: 10, paddingVertical: 4 },
  verifiedBadgeText: { fontFamily: F.mono, fontSize: 10, letterSpacing: 1 },
  osmBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  osmBadgeText: { fontFamily: F.mono, fontSize: 10, color: C.muted, letterSpacing: 1 },
  directionsBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
  },
  directionsBtnText: { fontFamily: F.mono, fontSize: 12, letterSpacing: 1 },
  description: { fontFamily: F.body, fontSize: 15, color: C.text, lineHeight: 24 },
  infoRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  infoText: { fontFamily: F.monoRegular, fontSize: 12, color: C.muted, flex: 1 },
  voteSection: {
    gap: 10,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  voteMeta: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  voteLabel: { fontFamily: F.mono, fontSize: 10, color: C.muted, letterSpacing: 2 },
  voteHint: { fontFamily: F.monoRegular, fontSize: 11, color: C.muted, letterSpacing: 0.5 },
  voteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderWidth: 2,
    borderColor: C.border,
    paddingVertical: 13,
  },
  voteBtnText: { fontFamily: F.mono, fontSize: 12, color: C.muted, letterSpacing: 1 },
  sectionLabel: { fontFamily: F.mono, fontSize: 10, color: C.muted, letterSpacing: 2 },
  ratingSection: {
    gap: 10,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  ratingBlock: { flexDirection: "row", alignItems: "center", gap: 10 },
  starsRow: { flexDirection: "row", gap: 4 },
  ratingText: { fontFamily: F.mono, fontSize: 18 },
  ratingCount: { fontFamily: F.monoRegular, fontSize: 11, color: C.muted },
  cardsSection: {
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: C.border,
    gap: 10,
  },
  cardsSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardsCount: { fontFamily: F.mono, fontSize: 14, color: C.muted },
  emptyText: {
    fontFamily: F.body,
    fontSize: 14,
    color: C.muted,
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: 16,
  },
  addCardBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    marginTop: 4,
  },
  addCardBtnText: { fontFamily: F.mono, fontSize: 12, letterSpacing: 1 },
});
