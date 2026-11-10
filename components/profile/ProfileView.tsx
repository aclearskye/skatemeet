import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useQueries, useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useFollowCounts } from "@/lib/follows/hooks/useFollowCounts";
import { getProfilePostCount } from "@/lib/posts/queries";
import { useBlockProfile } from "@/lib/blocks/hooks/useBlockProfile";
import { fetchProfileVisitedCount, fetchUserStreak } from "@/lib/checkins/queries";
import { type Profile } from "@/lib/context/use-auth-context";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { useToast } from "@/lib/context/toast-context";
import { useFriendStatus } from "@/lib/friendRequests/hooks/useFriendStatus";
import { useReportProfile } from "@/lib/profiles/hooks/useReportProfile";
import { parseTapeLabels } from "@/lib/shared/tapeLabels";
import { PROFILE_REPORT_REASONS, type ProfileReportReason } from "@/lib/shared/types";
import { C, F } from "@/lib/theme";
import { fetchProfileXpState } from "@/lib/xp/queries";
import { queryKeys } from "@/utils/queryKeys";
import BurgerButton from "@/components/ui/BurgerButton";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { ReportReasonSheet } from "@/components/common/ReportReasonSheet";
import { AddFriendButton } from "@/components/profile/AddFriendButton";
import { EditProfileSheet } from "@/components/profile/EditProfileSheet";
import { ExpBar } from "@/components/profile/ExpBar";
import { MessageButton } from "@/components/profile/MessageButton";
import { PrivateProfileLock } from "@/components/profile/PrivateProfileLock";
import { PostGrid } from "@/components/posts/PostGrid";
import { FollowButton } from "./FollowButton";
import ContentTabs from "./ContentTabs";
import ProfileAvatar from "./ProfileAvatar";
import ProfileBadges from "./ProfileBadges";
import { StreakBadge } from "./StreakBadge";
import StatsRow from "./StatsRow";

type Props = {
  profile: Profile;
  isOwnProfile: boolean;
};

export default function ProfileView({ profile, isOwnProfile }: Props) {
  const { refreshProfile } = useAuthContext();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { hasReported, report, isReporting } = useReportProfile(profile.profile_id);
  const { data: friendStatusResult } = useFriendStatus(profile.profile_id);
  const friendStatus = friendStatusResult?.status ?? "none";
  const { block, isUpdating: isBlocking } = useBlockProfile(profile.profile_id);
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState(0);
  const [showReportReasons, setShowReportReasons] = useState(false);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [localAvatarUrl, setLocalAvatarUrl] = useState<string | null>(
    profile.avatar_url
  );

  function handleSelectReportReason(reason: string) {
    setShowReportReasons(false);
    report(reason as ProfileReportReason);
  }

  // A block hides each profile from the other, so this screen can't stay.
  function handleBlock() {
    setShowBlockConfirm(false);
    block({
      onSuccess: () => {
        showToast({ message: `@${(profile.username ?? "").toUpperCase()} BLOCKED`, variant: "info" });
        router.back();
      },
      onError: (err) => showToast({ message: err.message.toUpperCase(), variant: "danger" }),
    });
  }

  const displayName =
    profile.display_name?.trim() || `${profile.first_name} ${profile.last_name}`.trim();

  const statsQueries = useQueries({
    queries: [
      {
        queryKey: [...queryKeys.profileStats(profile.profile_id), "spots"],
        queryFn: () => fetchProfileVisitedCount(profile.profile_id),
      },
      {
        queryKey: queryKeys.profilePostCount(profile.profile_id),
        queryFn: () => getProfilePostCount(profile.profile_id),
      },
    ],
  });
  const { data: followCounts, isLoading: loadingFollowCounts } = useFollowCounts(profile.profile_id);
  const loadingStats = statsQueries.some((q) => q.isLoading) || loadingFollowCounts;
  const spotCount = statsQueries[0].data ?? 0;
  const postCount = statsQueries[1].data ?? 0;
  const followerCount = followCounts?.followers ?? 0;

  const { data: xpState } = useQuery({
    queryKey: queryKeys.profileXp(profile.profile_id),
    queryFn: () => fetchProfileXpState(profile.profile_id),
  });

  const { data: streak } = useQuery({
    queryKey: queryKeys.userStreak(profile.profile_id),
    queryFn: () => fetchUserStreak(profile.profile_id),
  });

  const previousLevelRef = useRef<number | null>(null);
  const [didLevelUp, setDidLevelUp] = useState(false);

  useEffect(() => {
    if (!xpState) return;
    const previousLevel = previousLevelRef.current;
    if (previousLevel !== null && xpState.currentLevel > previousLevel) {
      setDidLevelUp(true);
    }
    previousLevelRef.current = xpState.currentLevel;
  }, [xpState]);

  useEffect(() => {
    if (!didLevelUp) return;
    // Clears the flag once the ExpBar's 320ms level-up tween has had time to
    // finish, so an unrelated re-render doesn't replay or cut off the animation.
    const timeout = setTimeout(() => setDidLevelUp(false), 400);
    return () => clearTimeout(timeout);
  }, [didLevelUp]);

  function handleAvatarUpdated(url: string) {
    setLocalAvatarUrl(url);
    refreshProfile();
  }

  return (
    <>
    <ScrollView style={styles.bg} contentContainerStyle={styles.scrollContent}>
      {/* Top bar */}
      {isOwnProfile ? (
        <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
          <BurgerButton />
        </View>
      ) : (
        <>
          {/* Breadcrumb: back button + centered @username, eases nav back
              out of another user's profile (e.g. from search results). */}
          <View style={[styles.breadcrumb, { paddingTop: insets.top + 12 }]}>
            <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color={C.text} />
            </TouchableOpacity>
            <Text style={styles.breadcrumbTitle} numberOfLines={1}>
              @{profile.username}
            </Text>
            <TouchableOpacity
              onPress={() => setShowBlockConfirm(true)}
              disabled={isBlocking}
              style={styles.blockBtn}
              hitSlop={12}
              accessibilityLabel={`Block @${profile.username}`}
            >
              <Ionicons name="ban" size={18} color={C.muted} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => !hasReported && !isReporting && setShowReportReasons(true)}
              disabled={hasReported || isReporting}
              style={styles.reportBtn}
              hitSlop={12}
            >
              <Ionicons
                name={hasReported ? "flag" : "flag-outline"}
                size={18}
                color={hasReported ? C.error : C.muted}
              />
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Hero */}
      <View style={styles.hero}>
        <View style={styles.heroLeft}>
          <ProfileAvatar
            profileId={profile.profile_id}
            username={profile.username}
            displayName={profile.display_name}
            avatarUrl={localAvatarUrl}
            isOwnProfile={isOwnProfile}
            onAvatarUpdated={handleAvatarUpdated}
            size={96}
          />
          {streak && (
            <View style={styles.streakBadgeOverlay}>
              <StreakBadge currentStreak={streak.current_streak} />
            </View>
          )}
        </View>

        <View style={styles.heroRight}>
          <View style={styles.nameRow}>
            <Text style={styles.displayName} numberOfLines={1}>
              {displayName.toUpperCase()}
            </Text>
            {isOwnProfile ? (
              <>
                <TouchableOpacity
                  style={styles.editBtn}
                  activeOpacity={0.7}
                  onPress={() => setShowEditProfile(true)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Edit skate name and labels"
                >
                  <Ionicons name="pencil" size={14} color={C.muted} />
                </TouchableOpacity>
                <PrivateProfileLock />
              </>
            ) : (
              <View style={styles.actionIcons}>
                <AddFriendButton profileId={profile.profile_id} username={profile.username} />
                <MessageButton profileId={profile.profile_id} friendStatus={friendStatus} />
              </View>
            )}
          </View>

          {/* Private profiles can't be followed (md/media_posts.md §1). */}
          {!isOwnProfile && !profile.is_private && profile.username ? (
            <FollowButton profileId={profile.profile_id} username={profile.username} />
          ) : null}

          <View style={styles.metaRow}>
            <Text style={[styles.meta, Platform.OS === "web" && styles.metaWeb]}>
              @{profile.username}
            </Text>
            {profile.city ? (
              <>
                <Text style={[styles.metaDot, Platform.OS === "web" && styles.metaWeb]}>
                  {" · "}
                </Text>
                <Ionicons
                  name="location-outline"
                  size={Platform.OS === "web" ? 15 : 12}
                  color={C.muted}
                />
                <Text style={[styles.meta, Platform.OS === "web" && styles.metaWeb]}>
                  {" "}
                  {profile.city.toUpperCase()}
                </Text>
              </>
            ) : null}
          </View>

          <ProfileBadges
            skillLevel={profile.skill_level}
            disciplines={profile.disciplines}
            pronouns={profile.pronouns}
            labels={parseTapeLabels(profile.labels)}
          />
        </View>
      </View>

      {/* EXP bar */}
      {xpState && (
        <ExpBar
          currentLevel={xpState.currentLevel}
          levelTitle={xpState.levelTitle}
          xpIntoLevel={xpState.xpIntoLevel}
          xpForNextLevel={xpState.xpForNextLevel}
          isMaxLevel={xpState.isMaxLevel}
          didLevelUp={didLevelUp}
        />
      )}

      {/* Bio */}
      {profile.bio ? (
        <Text style={styles.bio}>{profile.bio}</Text>
      ) : null}

      {/* Stats */}
      {loadingStats ? (
        <View style={styles.statsLoader}>
          <ActivityIndicator color={C.primary} size="small" />
        </View>
      ) : (
        <StatsRow
          spots={spotCount}
          posts={postCount}
          followers={followerCount}
          onFollowersPress={() => router.push(`/follows/${profile.profile_id}` as never)}
        />
      )}

      {/* Content tabs: My Posts / Tagged in / Saved (own profile only) */}
      <ContentTabs activeTab={activeTab} onTabChange={setActiveTab} showSaved={isOwnProfile} />

      {/* Grid */}
      <View style={styles.gridContainer}>
        {activeTab === 0 && (
          <PostGrid
            source={`posts:${profile.profile_id}`}
            emptyIcon="images-outline"
            emptyLabel="NO POSTS YET"
            onCreatePost={isOwnProfile ? () => router.push("/post/new" as never) : undefined}
          />
        )}
        {activeTab === 1 && (
          <PostGrid source={`tagged:${profile.profile_id}`} emptyIcon="pricetag-outline" emptyLabel="NOT TAGGED IN ANY POSTS YET" />
        )}
        {activeTab === 2 && isOwnProfile && (
          <PostGrid source={`saved:${profile.profile_id}`} emptyIcon="bookmark-outline" emptyLabel="NOTHING SAVED YET" />
        )}
      </View>
    </ScrollView>

    {isOwnProfile && (
      <EditProfileSheet visible={showEditProfile} onClose={() => setShowEditProfile(false)} />
    )}

    <Modal
      visible={showReportReasons}
      transparent
      animationType="fade"
      onRequestClose={() => setShowReportReasons(false)}
    >
      <ReportReasonSheet
        title="WHY ARE YOU REPORTING THIS ACCOUNT?"
        reasons={PROFILE_REPORT_REASONS}
        onSelect={handleSelectReportReason}
        onCancel={() => setShowReportReasons(false)}
      />
    </Modal>

    {!isOwnProfile && (
      <ConfirmDialog
        visible={showBlockConfirm}
        title={`BLOCK @${(profile.username ?? "").toUpperCase()}?`}
        message="You'll stop being friends, neither of you can message or send friend requests, and your profiles are hidden from each other. You can unblock them in Settings."
        confirmLabel="BLOCK"
        onConfirm={handleBlock}
        onCancel={() => setShowBlockConfirm(false)}
      />
    )}
    </>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: C.bg },
  scrollContent: { paddingBottom: 40 },

  topBar: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  reportBtn: {
    width: 30,
    alignItems: "flex-end",
  },
  blockBtn: {
    width: 30,
    alignItems: "flex-end",
  },

  breadcrumb: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: {
    width: 30,
  },
  breadcrumbTitle: {
    flex: 1,
    textAlign: "center",
    fontFamily: F.mono,
    fontSize: 13,
    color: C.text,
    letterSpacing: 1,
  },

  hero: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 14,
  },
  heroLeft: {
    position: "relative",
  },
  streakBadgeOverlay: {
    position: "absolute",
    bottom: 2,
    right: -6,
    transform: [{ rotate: "-12deg" }],
    zIndex: 2,
  },
  heroRight: {
    flex: 1,
    justifyContent: "center",
    gap: 6,
  },

  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  displayName: {
    fontFamily: F.heading,
    fontSize: 22,
    color: C.text,
    letterSpacing: 1,
    flexShrink: 1,
  },
  editBtn: {
    padding: 4,
  },
  actionIcons: {
    flexDirection: "row",
    gap: 8,
    marginLeft: "auto",
  },

  metaRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  meta: {
    fontFamily: F.monoRegular,
    fontSize: 12,
    color: C.muted,
  },
  metaDot: {
    fontFamily: F.monoRegular,
    fontSize: 12,
    color: C.muted,
  },
  metaWeb: {
    fontSize: 15,
  },

  bio: {
    fontFamily: F.body,
    fontSize: 13,
    color: C.text,
    lineHeight: 19,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },

  statsLoader: {
    paddingVertical: 24,
    alignItems: "center",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: C.borderVariant,
  },

  gridContainer: {
    minHeight: 200,
  },

  centeredMsg: {
    paddingVertical: 48,
    alignItems: "center",
    gap: 12,
  },
  emptyLabel: {
    fontFamily: F.mono,
    fontSize: 11,
    color: C.muted,
    letterSpacing: 2,
  },
});
