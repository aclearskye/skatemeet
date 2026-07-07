import { AddCardSheet } from "@/components/common/AddCardSheet";
import { DeleteUnverifiedButton } from "@/components/common/DeleteUnverifiedButton";
import { DetailHeader } from "@/components/common/DetailHeader";
import { StarRating } from "@/components/common/StarRating";
import { StoreCommunityCards } from "@/components/store-detail/StoreCommunityCards";
import { StoreHero } from "@/components/store-detail/StoreHero";
import { StoreInfoBlock } from "@/components/store-detail/StoreInfoBlock";
import { StoreVoteSection } from "@/components/store-detail/StoreVoteSection";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { useReviewableEntity } from "@/lib/shared/useReviewableEntity";
import { OsmStore } from "@/lib/spots/skateSpots";
import { deleteStore, SkateStore, UserStore } from "@/lib/stores/skateStores";
import { storeReviewableAdapter } from "@/lib/stores/storeReviewableAdapter";
import { C, F } from "@/lib/theme";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Linking, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Params = { kind: string; data: string };

export default function StoreDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session } = useAuthContext();
  const { kind, data } = useLocalSearchParams<Params>();

  const isUserStore = kind === "user-store";
  const store: SkateStore | OsmStore | UserStore = JSON.parse(data);

  const storeId: string | null = isUserStore ? (store as UserStore).store_id : null;
  const osmPlaceId: string | null = !isUserStore
    ? (store as SkateStore | OsmStore).place_id
    : null;

  const initialVoteCount =
    "upvote_count" in store ? (store as OsmStore | UserStore).upvote_count : 0;

  const lat = isUserStore
    ? (store as UserStore).latitude
    : (store as SkateStore | OsmStore).coordinates.lat;
  const lng = isUserStore
    ? (store as UserStore).longitude
    : (store as SkateStore | OsmStore).coordinates.lng;

  const name = store.name;
  const address = store.address;
  const osmRating = "rating" in store ? (store as SkateStore).rating : null;
  const phone = "phone" in store ? (store as OsmStore | UserStore).phone : null;
  const website = "website" in store ? (store as OsmStore | UserStore).website : null;
  const hours = "opening_hours" in store ? (store as OsmStore | UserStore).opening_hours : null;
  const photoUrl = isUserStore ? (store as UserStore).photo_url : null;
  const isOsm = kind === "osm-store" || kind === "skate-store";

  const [showAddCard, setShowAddCard] = useState(false);
  const [isVerified, setIsVerified] = useState(isUserStore ? (store as UserStore).is_verified : false);

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
  } = useReviewableEntity(storeId, osmPlaceId, initialVoteCount, storeReviewableAdapter, (result) => {
    if (isUserStore) setIsVerified(result.upvote_count >= 3);
  });

  function handleDirections() {
    const label = encodeURIComponent(name);
    const url =
      Platform.OS === "ios"
        ? `maps:0,0?q=${label}@${lat},${lng}`
        : `geo:${lat},${lng}?q=${lat},${lng}(${label})`;
    Linking.openURL(url);
  }

  const isOwner = isUserStore && session?.user.id === (store as UserStore).profile_id;

  async function handleDeleteStore() {
    if (!storeId || !session) return;
    await deleteStore(storeId, session.user.id);
    router.back();
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <DetailHeader
        title="STORE DETAILS"
        accent={C.secondary}
        isFavorited={isFavorited}
        isTogglingFavorite={isTogglingFav}
        onBack={() => router.back()}
        onToggleFavorite={handleFavorite}
      />

      <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
        <StoreHero photoUrl={photoUrl} />

        <View style={styles.body}>
          <StoreInfoBlock
            name={name}
            isOsm={isOsm}
            osmRating={osmRating}
            onDirections={handleDirections}
            address={address}
            hours={hours}
            phone={phone}
            website={website}
          />

          <StoreVoteSection
            count={localVoteCount}
            hasVoted={userHasVoted}
            onPress={handleVote}
            isLoading={isVoting || isLoadingVote}
          />

          {avgRating.count > 0 && (
            <View style={styles.communityRatingSection}>
              <Text style={styles.sectionLabel}>COMMUNITY RATING</Text>
              <StarRating rating={avgRating.average} count={avgRating.count} accent={C.secondary} />
            </View>
          )}

          <StoreCommunityCards
            cards={cards}
            isLoading={isLoadingCards}
            cardVotes={cardVotes}
            onUpvote={handleCardUpvote}
            onAddCard={() => setShowAddCard(true)}
          />

          {isOwner && !isVerified && (
            <DeleteUnverifiedButton entityLabel="store" onDelete={handleDeleteStore} />
          )}
        </View>
      </ScrollView>

      <AddCardSheet
        visible={showAddCard}
        onClose={() => setShowAddCard(false)}
        accent={C.secondary}
        onAccent={C.onSecondary}
        onSubmit={handleCardSubmit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  body: { padding: 20, gap: 14 },
  sectionLabel: { fontFamily: F.mono, fontSize: 10, color: C.muted, letterSpacing: 2 },
  communityRatingSection: {
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: C.border,
    gap: 10,
  },
});
