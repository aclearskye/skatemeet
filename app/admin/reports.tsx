import { useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useBanAppealsQueue } from "@/lib/admin/hooks/useBanAppealsQueue";
import { useBanUser } from "@/lib/admin/hooks/useBanUser";
import { useDismissProfileReport } from "@/lib/admin/hooks/useDismissProfileReport";
import { usePhotoReportsQueue } from "@/lib/admin/hooks/usePhotoReportsQueue";
import { useProfileReportsQueue } from "@/lib/admin/hooks/useProfileReportsQueue";
import { useResolveBanAppeal } from "@/lib/admin/hooks/useResolveBanAppeal";
import { useResolvePhotoReport } from "@/lib/admin/hooks/useResolvePhotoReport";
import { useResolveReviewReport } from "@/lib/admin/hooks/useResolveReviewReport";
import { useReviewReportsQueue } from "@/lib/admin/hooks/useReviewReportsQueue";
import { AdminError } from "@/lib/admin/mutations";
import type { AdminEntityKind, BanAppealItem, ProfileReportItem, ReportResolution } from "@/lib/admin/types";
import { C, F } from "@/lib/theme";
import { BanAppealCard } from "@/components/admin/BanAppealCard";
import { BanUserSheet } from "@/components/admin/BanUserSheet";
import { PhotoReportCard } from "@/components/admin/PhotoReportCard";
import { ProfileReportCard } from "@/components/admin/ProfileReportCard";
import { ReviewReportCard } from "@/components/admin/ReviewReportCard";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";

export default function AdminReportsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [banTarget, setBanTarget] = useState<ProfileReportItem | null>(null);
  const [reinstateTarget, setReinstateTarget] = useState<BanAppealItem | null>(null);

  const { data: photoReports = [], isLoading: photosLoading, isError: photosError } = usePhotoReportsQueue();
  const { data: reviewReports = [], isLoading: reviewsLoading, isError: reviewsError } = useReviewReportsQueue();
  const { data: profileReports = [], isLoading: profilesLoading, isError: profilesError } = useProfileReportsQueue();
  const { data: banAppeals = [], isLoading: appealsLoading, isError: appealsError } = useBanAppealsQueue();
  const resolvePhoto = useResolvePhotoReport();
  const resolveReview = useResolveReviewReport();
  const dismissProfileReport = useDismissProfileReport();
  const banMutation = useBanUser();
  const resolveAppeal = useResolveBanAppeal();

  const handleError = (error: unknown) => {
    setErrorMessage(error instanceof AdminError ? error.message : "Something went wrong — try again.");
  };

  const handleResolvePhoto = (photoId: string, entityKind: AdminEntityKind, resolution: ReportResolution) => {
    setErrorMessage(null);
    setPendingId(photoId);
    resolvePhoto.mutate(
      { photoId, entityKind, resolution },
      { onError: handleError, onSettled: () => setPendingId(null) }
    );
  };

  const handleResolveReview = (reviewId: string, entityKind: AdminEntityKind, resolution: ReportResolution) => {
    setErrorMessage(null);
    setPendingId(reviewId);
    resolveReview.mutate(
      { reviewId, entityKind, resolution },
      { onError: handleError, onSettled: () => setPendingId(null) }
    );
  };

  const handleDismissProfileReport = (profileId: string) => {
    setErrorMessage(null);
    setPendingId(profileId);
    dismissProfileReport.mutate(profileId, {
      onError: handleError,
      onSettled: () => setPendingId(null),
    });
  };

  async function handleBanSubmit(reason: string) {
    if (!banTarget) return;
    setErrorMessage(null);
    setPendingId(banTarget.profileId);
    try {
      await banMutation.mutateAsync({ profileId: banTarget.profileId, reason });
    } finally {
      setPendingId(null);
    }
  }

  const handleDenyAppeal = (item: BanAppealItem) => {
    setErrorMessage(null);
    setPendingId(item.appealId);
    resolveAppeal.mutate(
      { appealId: item.appealId, profileId: item.profileId, decision: "denied" },
      { onError: handleError, onSettled: () => setPendingId(null) }
    );
  };

  function handleConfirmReinstate() {
    if (!reinstateTarget) return;
    setErrorMessage(null);
    setPendingId(reinstateTarget.appealId);
    resolveAppeal.mutate(
      { appealId: reinstateTarget.appealId, profileId: reinstateTarget.profileId, decision: "reinstated" },
      {
        onError: handleError,
        onSettled: () => {
          setPendingId(null);
          setReinstateTarget(null);
        },
      }
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color={C.text} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.heading}>REPORTS</Text>
          <Text style={styles.subheading} numberOfLines={1}>
            {"// reported photos and reviews"}
          </Text>
        </View>
      </View>

      {errorMessage ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionLabel}>PHOTOS</Text>
        {photosLoading ? (
          <ActivityIndicator color={C.primary} style={styles.sectionSpinner} />
        ) : photosError ? (
          <Text style={styles.emptyLabel}>FAILED TO LOAD PHOTO REPORTS</Text>
        ) : photoReports.length === 0 ? (
          <Text style={styles.emptyLabel}>NO REPORTED PHOTOS</Text>
        ) : (
          <View style={styles.list}>
            {photoReports.map((item) => (
              <PhotoReportCard
                key={item.photoId}
                item={item}
                onResolve={(photoId, resolution) => handleResolvePhoto(photoId, item.entityKind, resolution)}
                isBusy={pendingId === item.photoId}
              />
            ))}
          </View>
        )}

        <Text style={[styles.sectionLabel, styles.sectionSpacing]}>REVIEWS</Text>
        {reviewsLoading ? (
          <ActivityIndicator color={C.primary} style={styles.sectionSpinner} />
        ) : reviewsError ? (
          <Text style={styles.emptyLabel}>FAILED TO LOAD REVIEW REPORTS</Text>
        ) : reviewReports.length === 0 ? (
          <Text style={styles.emptyLabel}>NO REPORTED REVIEWS</Text>
        ) : (
          <View style={styles.list}>
            {reviewReports.map((item) => (
              <ReviewReportCard
                key={item.reviewId}
                item={item}
                onResolve={(reviewId, resolution) => handleResolveReview(reviewId, item.entityKind, resolution)}
                isBusy={pendingId === item.reviewId}
              />
            ))}
          </View>
        )}

        <Text style={[styles.sectionLabel, styles.sectionSpacing]}>PROFILES</Text>
        {profilesLoading ? (
          <ActivityIndicator color={C.primary} style={styles.sectionSpinner} />
        ) : profilesError ? (
          <Text style={styles.emptyLabel}>FAILED TO LOAD PROFILE REPORTS</Text>
        ) : profileReports.length === 0 ? (
          <Text style={styles.emptyLabel}>NO REPORTED PROFILES</Text>
        ) : (
          <View style={styles.list}>
            {profileReports.map((item) => (
              <ProfileReportCard
                key={item.profileId}
                item={item}
                onDismiss={handleDismissProfileReport}
                onBan={setBanTarget}
                isBusy={pendingId === item.profileId}
              />
            ))}
          </View>
        )}

        <Text style={[styles.sectionLabel, styles.sectionSpacing]}>BAN APPEALS</Text>
        {appealsLoading ? (
          <ActivityIndicator color={C.primary} style={styles.sectionSpinner} />
        ) : appealsError ? (
          <Text style={styles.emptyLabel}>FAILED TO LOAD BAN APPEALS</Text>
        ) : banAppeals.length === 0 ? (
          <Text style={styles.emptyLabel}>NO PENDING APPEALS</Text>
        ) : (
          <View style={styles.list}>
            {banAppeals.map((item) => (
              <BanAppealCard
                key={item.appealId}
                item={item}
                onDecision={(appealItem, decision) =>
                  decision === "reinstated" ? setReinstateTarget(appealItem) : handleDenyAppeal(appealItem)
                }
                isBusy={pendingId === item.appealId}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <BanUserSheet
        visible={banTarget != null}
        username={banTarget?.username ?? ""}
        onClose={() => setBanTarget(null)}
        onSubmit={handleBanSubmit}
      />

      <ConfirmDialog
        visible={reinstateTarget != null}
        title={`Reinstate @${reinstateTarget?.username ?? ""}?`}
        message="They'll be able to sign in again immediately, with all their data intact."
        confirmLabel="REINSTATE"
        onConfirm={handleConfirmReinstate}
        onCancel={() => setReinstateTarget(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: C.border,
  },
  backBtn: { paddingVertical: 2 },
  headerText: {
    flex: 1,
    flexDirection: "row",
    alignItems: "baseline",
    gap: 10,
  },
  heading: {
    fontFamily: F.heading,
    fontSize: 20,
    color: C.text,
    letterSpacing: 2,
  },
  subheading: {
    flexShrink: 1,
    fontFamily: F.monoRegular,
    fontSize: 13,
    color: C.muted,
    letterSpacing: 0.5,
  },
  errorBanner: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: C.errorContainer,
    borderBottomWidth: 1,
    borderBottomColor: C.errorBorder,
  },
  errorText: {
    fontFamily: F.monoRegular,
    fontSize: 12,
    color: C.error,
  },
  scrollContent: {
    padding: 16,
  },
  sectionLabel: {
    fontFamily: F.mono,
    fontSize: 12,
    color: C.muted,
    letterSpacing: 2,
    marginBottom: 10,
  },
  sectionSpacing: {
    marginTop: 24,
  },
  sectionSpinner: {
    marginVertical: 12,
  },
  list: {
    gap: 10,
  },
  emptyLabel: {
    fontFamily: F.mono,
    fontSize: 11,
    color: C.muted,
    letterSpacing: 1,
  },
});
