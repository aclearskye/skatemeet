import { AddReviewSheet } from "@/components/common/AddReviewSheet";
import { CheckInSection } from "@/components/common/CheckInSection";
import { DeleteUnverifiedButton } from "@/components/common/DeleteUnverifiedButton";
import { DetailHeader } from "@/components/common/DetailHeader";
import { EditMetadataSheet } from "@/components/common/EditMetadataSheet";
import { EntityMetadataSection } from "@/components/common/EntityMetadataSection";
import { EntityPhotoViewerModal } from "@/components/common/EntityPhotoViewerModal";
import { ReviewsModal } from "@/components/common/ReviewsModal";
import { StarRating } from "@/components/common/StarRating";
import { StoreHero } from "@/components/store-detail/StoreHero";
import { StoreInfoBlock } from "@/components/store-detail/StoreInfoBlock";
import { StoreReviews } from "@/components/store-detail/StoreReviews";
import { StoreVoteSection } from "@/components/store-detail/StoreVoteSection";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { useCheckInSync } from "@/lib/shared/hooks/useCheckInSync";
import { useEntityMetadata } from "@/lib/shared/hooks/useEntityMetadata";
import { openDirections } from "@/lib/shared/openDirections";
import { ReviewInteractions } from "@/lib/shared/types";
import { useEntityPhotos } from "@/lib/shared/useEntityPhotos";
import { useReviewableEntity } from "@/lib/shared/useReviewableEntity";
import { OsmStore } from "@/lib/spots/types";
import { deleteStore } from "@/lib/stores/mutations";
import { storeMetadataAdapter } from "@/lib/stores/storeMetadataAdapter";
import { storePhotosAdapter } from "@/lib/stores/storePhotosAdapter";
import { SkateStore, UserStore } from "@/lib/stores/types";
import { storeReviewableAdapter } from "@/lib/stores/storeReviewableAdapter";
import { useAddStorePhoto } from "@/lib/stores/useAddStorePhoto";
import { C, F } from "@/lib/theme";
import { queryKeys } from "@/utils/queryKeys";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Params = { kind: string; data: string };

export default function StoreDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session } = useAuthContext();
  const { kind, data } = useLocalSearchParams<Params>();

  useCheckInSync();

  const isUserStore = kind === "user-store";

  const store = useMemo<SkateStore | OsmStore | UserStore | null>(() => {
    if (!data) return null;
    try {
      const parsed: unknown = JSON.parse(data);
      if (typeof parsed !== "object" || parsed === null) return null;
      if (kind === "user-store" && "store_id" in parsed) return parsed as UserStore;
      if ((kind === "osm-store" || kind === "skate-store") && "place_id" in parsed) return parsed as OsmStore;
      return null;
    } catch {
      return null;
    }
  }, [data, kind]);

  const storeId: string | null = isUserStore && store ? (store as UserStore).store_id : null;
  const osmPlaceId: string | null = !isUserStore && store
    ? (store as SkateStore | OsmStore).place_id
    : null;

  const initialVoteCount = store && "upvote_count" in store ? (store as OsmStore | UserStore).upvote_count : 0;

  const lat = store
    ? (isUserStore ? (store as UserStore).latitude : (store as SkateStore | OsmStore).coordinates.lat)
    : 0;
  const lng = store
    ? (isUserStore ? (store as UserStore).longitude : (store as SkateStore | OsmStore).coordinates.lng)
    : 0;

  const name = store?.name ?? "";
  const address = store?.address ?? "";
  const osmRating = store && "rating" in store ? (store as SkateStore).rating : null;
  const phone = store && "phone" in store ? (store as OsmStore | UserStore).phone : null;
  const website = store && "website" in store ? (store as OsmStore | UserStore).website : null;
  const hours = store && "opening_hours" in store ? (store as OsmStore | UserStore).opening_hours : null;
  const description = store && "description" in store ? (store as OsmStore | UserStore).description : null;

  const [showAddReview, setShowAddReview] = useState(false);
  const [showReviewsModal, setShowReviewsModal] = useState(false);
  const [showEditMetadata, setShowEditMetadata] = useState(false);
  const [isVerified, setIsVerified] = useState(isUserStore && store ? (store as UserStore).is_verified : false);
  const { addPhoto, isAddingPhoto } = useAddStorePhoto(storeId, osmPlaceId);

  const [showPhotoViewer, setShowPhotoViewer] = useState(false);
  const {
    photos,
    isLoading: isLoadingPhotos,
    voteStatuses: photoVoteStatuses,
    reportStatuses: photoReportStatuses,
    castVote: castPhotoVote,
    report: reportPhoto,
    isReporting: isReportingPhoto,
    deletePhoto,
    isDeleting: isDeletingPhoto,
  } = useEntityPhotos(storeId, osmPlaceId, storePhotosAdapter, queryKeys.storePhotos(storeId, osmPlaceId));

  // photos[0] is always the current highest-voted, non-hidden photo (same
  // ordering the DB's cover-photo trigger uses) — falls back to the
  // route-param snapshot only until that query resolves on first mount.
  const initialPhotoUrl =
    isUserStore && store
      ? (store as UserStore).photo_url
      : store && "cover_photo_url" in store
        ? ((store as OsmStore).cover_photo_url ?? (store as OsmStore).osm_image_url)
        : null;
  const photoUrl = photos[0]?.media_url ?? initialPhotoUrl;

  const {
    userHasVoted,
    localVoteCount,
    isVoting,
    isLoadingVote,
    handleVote,
    isFavorited,
    isTogglingFav,
    handleFavorite,
    reviews,
    isLoadingReviews,
    avgRating,
    reviewVotes,
    handleReviewUpvote,
    handleReviewSubmit,
    reportStatuses,
    handleReviewReport,
    handleReviewDelete,
  } = useReviewableEntity(storeId, osmPlaceId, initialVoteCount, storeReviewableAdapter, queryKeys.storeDetail(storeId, osmPlaceId), (result) => {
    if (isUserStore) setIsVerified(result.upvote_count >= 3);
  });

  const reviewInteractions: ReviewInteractions = {
    currentUserId: session?.user.id ?? null,
    reviewVotes,
    reportStatuses,
    onUpvote: handleReviewUpvote,
    onReport: handleReviewReport,
    onDelete: handleReviewDelete,
  };

  const { metadata, isLoading: isLoadingMetadata, upsertMetadata } = useEntityMetadata(
    storeId,
    osmPlaceId,
    storeMetadataAdapter,
    queryKeys.storeMetadata(storeId, osmPlaceId)
  );

  function handleDirections() {
    if (!store) return;
    openDirections({ lat, lng, label: name });
  }

  const isOwner = isUserStore && store != null && session?.user.id === (store as UserStore).profile_id;

  async function handleDeleteStore() {
    if (!storeId || !session) return;
    await deleteStore(storeId, session.user.id);
    router.back();
  }

  if (!store) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <DetailHeader
          title="STORE DETAILS"
          accent={C.secondary}
          isFavorited={false}
          onBack={() => router.back()}
          onToggleFavorite={() => {}}
        />
        <View style={styles.body}>
          <Text style={styles.sectionLabel}>INVALID STORE DATA</Text>
        </View>
      </View>
    );
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
        <StoreHero photoUrl={photoUrl} onPress={() => setShowPhotoViewer(true)} />

        <View style={styles.body}>
          <StoreInfoBlock
            name={name}
            osmRating={osmRating}
            onDirections={handleDirections}
            onAddPhoto={addPhoto}
            isAddingPhoto={isAddingPhoto}
            address={address}
            hours={hours}
            phone={phone}
            website={website}
            description={description}
          />

          <EntityMetadataSection
            metadata={metadata}
            isLoading={isLoadingMetadata}
            accent={C.secondary}
            canEdit={session != null}
            onEdit={() => setShowEditMetadata(true)}
          />

          <CheckInSection
            entityRef={{ spotId: null, osmSpotPlaceId: null, storeId, osmStorePlaceId: osmPlaceId }}
            accent={C.secondary}
            onAccent={C.onSecondary}
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

          <StoreReviews
            reviews={reviews}
            isLoading={isLoadingReviews}
            interactions={reviewInteractions}
            onAddReview={() => setShowAddReview(true)}
            onSeeMore={() => setShowReviewsModal(true)}
          />

          {isOwner && !isVerified && (
            <DeleteUnverifiedButton entityLabel="store" onDelete={handleDeleteStore} />
          )}
        </View>
      </ScrollView>

      <AddReviewSheet
        visible={showAddReview}
        onClose={() => setShowAddReview(false)}
        accent={C.secondary}
        onAccent={C.onSecondary}
        onSubmit={handleReviewSubmit}
      />

      <ReviewsModal
        visible={showReviewsModal}
        onClose={() => setShowReviewsModal(false)}
        reviews={reviews}
        isLoading={isLoadingReviews}
        interactions={reviewInteractions}
        accent={C.secondary}
      />

      <EditMetadataSheet
        visible={showEditMetadata}
        onClose={() => setShowEditMetadata(false)}
        initialValue={metadata}
        accent={C.secondary}
        onAccent={C.onSecondary}
        onSubmit={async (payload) => {
          await upsertMetadata(payload);
        }}
      />

      <EntityPhotoViewerModal
        visible={showPhotoViewer}
        onClose={() => setShowPhotoViewer(false)}
        photos={photos}
        isLoadingPhotos={isLoadingPhotos}
        currentUserId={session?.user.id ?? null}
        voteStatuses={photoVoteStatuses}
        reportStatuses={photoReportStatuses}
        onVote={castPhotoVote}
        onReport={reportPhoto}
        isReporting={isReportingPhoto}
        onDelete={deletePhoto}
        isDeleting={isDeletingPhoto}
        accent={C.secondary}
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
    borderTopColor: C.borderVariant,
    gap: 10,
  },
});
