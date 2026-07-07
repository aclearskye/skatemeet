import { AddCardSheet } from "@/components/common/AddCardSheet";
import { DeleteUnverifiedButton } from "@/components/common/DeleteUnverifiedButton";
import { DetailHeader } from "@/components/common/DetailHeader";
import { StarRating } from "@/components/common/StarRating";
import { SpotCommunityCards } from "@/components/spot-detail/SpotCommunityCards";
import { SpotHero } from "@/components/spot-detail/SpotHero";
import { SpotInfoBlock } from "@/components/spot-detail/SpotInfoBlock";
import { SpotVoteSection } from "@/components/spot-detail/SpotVoteSection";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { deleteSpot, OsmSpot, SkateSpot } from "@/lib/spots/skateSpots";
import { spotReviewableAdapter } from "@/lib/spots/spotReviewableAdapter";
import { useReviewableEntity } from "@/lib/shared/useReviewableEntity";
import { C, F } from "@/lib/theme";
import { TYPE_LABELS } from "@/utils/constants";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Linking, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Params = { kind: string; data: string };

function isSkateSpot(spot: SkateSpot | OsmSpot): spot is SkateSpot {
  return "spot_id" in spot;
}

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

  const [isVerified, setIsVerified] = useState(isSkateSpot(spot) ? spot.is_verified : false);
  const [showAddCard, setShowAddCard] = useState(false);

  const {
    userHasVoted,
    localVoteCount,
    isVoting,
    isLoadingVote,
    handleVote,
    isFavorited,
    isTogglingFav,
    handleFavorite,
    cards,
    isLoadingCards,
    avgRating,
    cardVotes,
    handleCardUpvote,
    handleCardSubmit,
  } = useReviewableEntity(spotId, osmPlaceId, spot.upvote_count, spotReviewableAdapter, (result) => {
    if (isUser) setIsVerified(result.upvote_count >= 3);
  });

  function handleDirections() {
    const label = encodeURIComponent(spot.name);
    const url =
      Platform.OS === "ios"
        ? `maps:0,0?q=${label}@${lat},${lng}`
        : `geo:${lat},${lng}?q=${lat},${lng}(${label})`;
    Linking.openURL(url);
  }

  const isOwner = isUser && session?.user.id === (spot as SkateSpot).created_by;

  async function handleDeleteSpot() {
    if (!spotId || !session) return;
    await deleteSpot(spotId, session.user.id);
    router.back();
  }

  const typeLabel = isSkateSpot(spot)
    ? (TYPE_LABELS[spot.type] ?? spot.type.toUpperCase())
    : (TYPE_LABELS[spot.spot_type] ?? spot.spot_type.toUpperCase());

  const photoUrl = isSkateSpot(spot) ? spot.photo_url : null;
  const description = isSkateSpot(spot) ? spot.description : null;
  const address = isOsm ? (spot as OsmSpot).address : null;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <DetailHeader
        title="SPOT DETAILS"
        accent={accent}
        isFavorited={isFavorited}
        isTogglingFavorite={isTogglingFav}
        onBack={() => router.back()}
        onToggleFavorite={handleFavorite}
      />

      <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
        <SpotHero photoUrl={photoUrl} />

        <View style={styles.body}>
          <SpotInfoBlock
            name={spot.name}
            typeLabel={typeLabel}
            isUser={isUser}
            isVerified={isVerified}
            isOsm={isOsm}
            accent={accent}
            onAccent={onAccent}
            onDirections={handleDirections}
            description={description}
            address={address}
          />

          <SpotVoteSection
            count={localVoteCount}
            hasVoted={userHasVoted}
            accent={accent}
            onAccent={onAccent}
            onPress={handleVote}
            isLoading={isVoting || isLoadingVote}
            showVerifyHint={isUser && !isVerified}
          />

          {avgRating.count > 0 && (
            <View style={styles.ratingSection}>
              <Text style={styles.sectionLabel}>DIFFICULTY</Text>
              <StarRating rating={avgRating.average} count={avgRating.count} accent={accent} />
            </View>
          )}

          <SpotCommunityCards
            cards={cards}
            isLoading={isLoadingCards}
            cardVotes={cardVotes}
            accent={accent}
            onAccent={onAccent}
            onUpvote={handleCardUpvote}
            onAddCard={() => setShowAddCard(true)}
          />

          {isOwner && !isVerified && (
            <DeleteUnverifiedButton entityLabel="spot" onDelete={handleDeleteSpot} />
          )}
        </View>
      </ScrollView>

      <AddCardSheet
        visible={showAddCard}
        onClose={() => setShowAddCard(false)}
        accent={accent}
        onAccent={onAccent}
        onSubmit={handleCardSubmit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  body: { padding: 20, gap: 14 },
  sectionLabel: { fontFamily: F.mono, fontSize: 10, color: C.muted, letterSpacing: 2 },
  ratingSection: { gap: 10, paddingTop: 14, borderTopWidth: 1, borderTopColor: C.border },
});
