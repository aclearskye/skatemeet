import { OsmShop } from "@/lib/spots/skateSpots";
import { useAuthContext } from "@/lib/context/use-auth-context";
import {
  fetchStoreCards,
  fetchStoreAverageRating,
  getStoreFavouriteStatus,
  getStoreVoteStatus,
  toggleStoreFavourite,
  toggleStoreVote,
  toggleCardVote,
  getCardVoteStatuses,
  SkateStore,
  UserShop,
  StoreCard,
  StoreCardWithProfile,
} from "@/lib/stores/skateStores";
import { AddStoreCardSheet } from "@/components/spots/AddStoreCardSheet";
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

type StoreCardItemProps = {
  card: StoreCardWithProfile;
  isVoted: boolean;
  onUpvote: (cardId: string) => void;
};

function StoreCardItem({ card, isVoted, onUpvote }: StoreCardItemProps) {
  return (
    <View style={cardStyles.container}>
      <View style={cardStyles.topRow}>
        <Text style={cardStyles.heading}>{card.heading}</Text>
        {!card.is_verified && (
          <View style={cardStyles.needsVotesBadge}>
            <Text style={cardStyles.needsVotesText}>{card.upvote_count}/3</Text>
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
              color={i <= Math.round(card.rating!) ? C.secondary : C.border}
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
              color={isVoted ? C.secondary : C.muted}
            />
            <Text style={[cardStyles.upvoteCount, isVoted && { color: C.secondary }]}>
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

export default function StoreDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session } = useAuthContext();
  const { kind, data } = useLocalSearchParams<Params>();

  const isUserShop = kind === "user-shop";
  const store: SkateStore | OsmShop | UserShop = JSON.parse(data);

  const shopId: string | null = isUserShop ? (store as UserShop).shop_id : null;
  const osmPlaceId: string | null = !isUserShop
    ? (store as SkateStore | OsmShop).place_id
    : null;

  const initialVoteCount = "upvote_count" in store ? (store as OsmShop | UserShop).upvote_count : 0;

  const lat = isUserShop
    ? (store as UserShop).latitude
    : (store as SkateStore | OsmShop).coordinates.lat;
  const lng = isUserShop
    ? (store as UserShop).longitude
    : (store as SkateStore | OsmShop).coordinates.lng;

  const name = store.name;
  const address = store.address;
  const osmRating = "rating" in store ? (store as SkateStore).rating : null;
  const phone = "phone" in store ? (store as OsmShop | UserShop).phone : null;
  const website = "website" in store ? (store as OsmShop | UserShop).website : null;
  const hours = "opening_hours" in store ? (store as OsmShop | UserShop).opening_hours : null;
  const photoUrl = isUserShop ? (store as UserShop).photo_url : null;
  const isOsm = kind === "osm-shop" || kind === "skate-store";

  const [userHasVoted, setUserHasVoted] = useState(false);
  const [localVoteCount, setLocalVoteCount] = useState(initialVoteCount);
  const [isVoting, setIsVoting] = useState(false);
  const [isLoadingVote, setIsLoadingVote] = useState(true);

  const [isFavourited, setIsFavourited] = useState(false);
  const [isTogglingFav, setIsTogglingFav] = useState(false);
  const [cards, setCards] = useState<StoreCardWithProfile[]>([]);
  const [isLoadingCards, setIsLoadingCards] = useState(true);
  const [avgRating, setAvgRating] = useState<{ average: number | null; count: number }>({
    average: null,
    count: 0,
  });
  const [cardVotes, setCardVotes] = useState<Record<string, boolean>>({});
  const [showAddCard, setShowAddCard] = useState(false);

  useEffect(() => {
    getStoreVoteStatus(shopId, osmPlaceId, session!.user.id)
      .then(setUserHasVoted)
      .catch(() => {})
      .finally(() => setIsLoadingVote(false));

    Promise.all([
      fetchStoreCards(shopId, osmPlaceId),
      fetchStoreAverageRating(shopId, osmPlaceId),
      getStoreFavouriteStatus(shopId, osmPlaceId, session!.user.id),
    ])
      .then(([fetchedCards, rating, fav]) => {
        setCards(fetchedCards);
        setAvgRating(rating);
        setIsFavourited(fav);
        if (fetchedCards.length > 0) {
          getCardVoteStatuses(
            fetchedCards.map((c) => c.card_id),
            session!.user.id
          )
            .then(setCardVotes)
            .catch(() => {});
        }
      })
      .catch(() => {})
      .finally(() => setIsLoadingCards(false));
  }, []);

  async function handleFavourite() {
    if (isTogglingFav) return;
    setIsTogglingFav(true);
    setIsFavourited((prev) => !prev);
    try {
      const newState = await toggleStoreFavourite(shopId, osmPlaceId, session!.user.id);
      setIsFavourited(newState);
    } catch {
      setIsFavourited((prev) => !prev);
    } finally {
      setIsTogglingFav(false);
    }
  }

  async function handleVote() {
    if (isVoting) return;
    setIsVoting(true);
    try {
      const result = await toggleStoreVote(shopId, osmPlaceId, session!.user.id);
      setUserHasVoted(result.user_has_voted);
      setLocalVoteCount(result.upvote_count);
    } catch {
      // silently ignore
    } finally {
      setIsVoting(false);
    }
  }

  function handleDirections() {
    const label = encodeURIComponent(name);
    const url =
      Platform.OS === "ios"
        ? `maps:0,0?q=${label}@${lat},${lng}`
        : `geo:${lat},${lng}?q=${lat},${lng}(${label})`;
    Linking.openURL(url);
  }

  async function handleCardUpvote(cardId: string) {
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
      await toggleCardVote(cardId, session!.user.id);
    } catch {
      setCardVotes((prev) => ({ ...prev, [cardId]: !optimistic }));
    }
  }

  function handleCardCreated(card: StoreCard) {
    const cardWithProfile: StoreCardWithProfile = {
      ...card,
      profiles: {
        username: session!.user.email ?? "you",
        display_name: null,
      },
    };
    setCards((prev) => [cardWithProfile, ...prev]);
    fetchStoreAverageRating(shopId, osmPlaceId)
      .then(setAvgRating)
      .catch(() => {});
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>STORE DETAILS</Text>
        <TouchableOpacity
          onPress={handleFavourite}
          hitSlop={12}
          style={styles.favBtn}
          disabled={isTogglingFav}
        >
          <Ionicons
            name={isFavourited ? "heart" : "heart-outline"}
            size={22}
            color={isFavourited ? C.secondary : C.muted}
          />
        </TouchableOpacity>
      </View>

      <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        {photoUrl ? (
          <Image source={{ uri: photoUrl }} style={styles.hero} contentFit="cover" />
        ) : (
          <View style={[styles.hero, styles.heroPlaceholder]}>
            <Ionicons name="storefront-outline" size={52} color={C.muted} style={{ opacity: 0.4 }} />
          </View>
        )}

        <View style={styles.body}>
          {/* Name */}
          <Text style={styles.name}>{name}</Text>

          {/* Badges */}
          <View style={styles.badgeRow}>
            <View style={styles.typeBadge}>
              <Text style={styles.typeBadgeText}>SKATE SHOP</Text>
            </View>
            {isOsm && (
              <View style={styles.osmBadge}>
                <Text style={styles.osmBadgeText}>FROM OSM</Text>
              </View>
            )}
          </View>

          {/* OSM rating (from Overpass API, not community) */}
          {osmRating != null && (
            <View style={styles.ratingBlock}>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <Ionicons
                    key={i}
                    name={i <= Math.round(osmRating) ? "star" : "star-outline"}
                    size={20}
                    color={i <= Math.round(osmRating) ? C.secondary : C.border}
                  />
                ))}
              </View>
              <Text style={styles.ratingText}>{osmRating.toFixed(1)}</Text>
            </View>
          )}

          {/* Directions */}
          <TouchableOpacity
            style={styles.directionsBtn}
            onPress={handleDirections}
            activeOpacity={0.85}
          >
            <Ionicons name="navigate-outline" size={16} color={C.onSecondary} />
            <Text style={styles.directionsBtnText}>GET DIRECTIONS</Text>
          </TouchableOpacity>

          {/* Community votes */}
          <View style={styles.voteSection}>
            <View style={styles.voteMeta}>
              <Text style={styles.voteLabel}>COMMUNITY VOTES</Text>
            </View>
            <TouchableOpacity
              style={[styles.voteBtn, userHasVoted && styles.voteBtnActive]}
              onPress={handleVote}
              disabled={isVoting || isLoadingVote}
              activeOpacity={0.75}
            >
              {isLoadingVote || isVoting ? (
                <ActivityIndicator size="small" color={userHasVoted ? C.onSecondary : C.muted} />
              ) : (
                <>
                  <Ionicons
                    name={userHasVoted ? "arrow-up-circle" : "arrow-up-circle-outline"}
                    size={20}
                    color={userHasVoted ? C.onSecondary : C.muted}
                  />
                  <Text style={[styles.voteBtnText, userHasVoted && styles.voteBtnTextActive]}>
                    {localVoteCount} {userHasVoted ? "VOTED" : "UPVOTE"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Info rows */}
          <View style={styles.infoSection}>
            {address !== "" && (
              <View style={styles.infoRow}>
                <Ionicons name="location-outline" size={16} color={C.secondary} />
                <Text style={styles.infoText}>{address}</Text>
              </View>
            )}

            {hours != null && hours !== "" && (
              <View style={styles.infoRow}>
                <Ionicons name="time-outline" size={16} color={C.secondary} />
                <Text style={styles.infoText}>{hours}</Text>
              </View>
            )}

            {phone != null && phone !== "" && (
              <TouchableOpacity
                style={styles.infoRow}
                onPress={() => Linking.openURL(`tel:${phone}`)}
                activeOpacity={0.75}
              >
                <Ionicons name="call-outline" size={16} color={C.secondary} />
                <Text style={[styles.infoText, styles.infoLink]}>{phone}</Text>
              </TouchableOpacity>
            )}

            {website != null && website !== "" && (
              <TouchableOpacity
                style={styles.infoRow}
                onPress={() =>
                  Linking.openURL(website.startsWith("http") ? website : `https://${website}`)
                }
                activeOpacity={0.75}
              >
                <Ionicons name="globe-outline" size={16} color={C.secondary} />
                <Text style={[styles.infoText, styles.infoLink]} numberOfLines={1}>
                  {website}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Community Rating */}
          {avgRating.count > 0 && (
            <View style={styles.communityRatingSection}>
              <Text style={styles.sectionLabel}>COMMUNITY RATING</Text>
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
                          ? C.secondary
                          : C.border
                      }
                    />
                  ))}
                </View>
                <Text style={styles.ratingText}>
                  {avgRating.average != null ? avgRating.average.toFixed(1) : "—"}
                </Text>
                <Text style={styles.ratingCount}>
                  ({avgRating.count} {avgRating.count === 1 ? "RATING" : "RATINGS"})
                </Text>
              </View>
            </View>
          )}

          {/* Details Cards / Comments section */}
          <View style={styles.cardsSection}>
            <View style={styles.cardsSectionHeader}>
              <Text style={styles.sectionLabel}>COMMUNITY CARDS</Text>
              <Text style={styles.cardsCount}>{cards.length}</Text>
            </View>

            {isLoadingCards ? (
              <ActivityIndicator color={C.secondary} style={{ marginVertical: 20 }} />
            ) : cards.length === 0 ? (
              <Text style={styles.emptyText}>No cards yet. Add one to share what you know.</Text>
            ) : (
              cards.map((card) => (
                <StoreCardItem
                  key={card.card_id}
                  card={card}
                  isVoted={!!cardVotes[card.card_id]}
                  onUpvote={handleCardUpvote}
                />
              ))
            )}

            <TouchableOpacity
              style={styles.addCardBtn}
              onPress={() => setShowAddCard(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="add" size={16} color={C.onSecondary} />
              <Text style={styles.addCardBtnText}>ADD CARD</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <AddStoreCardSheet
        visible={showAddCard}
        onClose={() => setShowAddCard(false)}
        onCardCreated={handleCardCreated}
        shopId={shopId}
        osmPlaceId={osmPlaceId}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
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
  hero: {
    width: "100%",
    aspectRatio: 16 / 9,
  },
  heroPlaceholder: {
    backgroundColor: C.surfaceHigh,
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    padding: 20,
    gap: 14,
  },
  name: {
    fontFamily: F.heading,
    fontSize: 28,
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
  ratingBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  starsRow: {
    flexDirection: "row",
    gap: 3,
  },
  ratingText: {
    fontFamily: F.mono,
    fontSize: 18,
    color: C.secondary,
  },
  ratingCount: {
    fontFamily: F.monoRegular,
    fontSize: 11,
    color: C.muted,
  },
  directionsBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: C.secondary,
    paddingVertical: 13,
  },
  directionsBtnText: {
    fontFamily: F.mono,
    fontSize: 12,
    color: C.onSecondary,
    letterSpacing: 1,
  },
  voteSection: {
    gap: 10,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  voteMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  voteLabel: { fontFamily: F.mono, fontSize: 10, color: C.muted, letterSpacing: 2 },
  voteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderWidth: 2,
    borderColor: C.border,
    paddingVertical: 13,
  },
  voteBtnActive: {
    backgroundColor: C.secondary,
    borderColor: C.secondary,
  },
  voteBtnText: { fontFamily: F.mono, fontSize: 12, color: C.muted, letterSpacing: 1 },
  voteBtnTextActive: { color: C.onSecondary },
  infoSection: {
    gap: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  infoText: {
    fontFamily: F.body,
    fontSize: 14,
    color: C.text,
    flex: 1,
    lineHeight: 22,
  },
  infoLink: {
    color: C.secondary,
    textDecorationLine: "underline",
  },
  communityRatingSection: {
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: C.border,
    gap: 10,
  },
  sectionLabel: {
    fontFamily: F.mono,
    fontSize: 10,
    color: C.muted,
    letterSpacing: 2,
  },
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
  cardsCount: {
    fontFamily: F.mono,
    fontSize: 14,
    color: C.muted,
  },
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
    backgroundColor: C.secondary,
    paddingVertical: 13,
    marginTop: 4,
  },
  addCardBtnText: {
    fontFamily: F.mono,
    fontSize: 12,
    color: C.onSecondary,
    letterSpacing: 1,
  },
});
