import BurgerButton from "@/components/ui/BurgerButton";
import {
  fetchProfileClips,
  getProfileClipCount,
  getProfileCrewCount,
  getProfileSpotCount,
  type Clip,
} from "@/lib/clips/clips";
import { type Profile } from "@/lib/context/use-auth-context";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { C, F } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ClipCard, { COLS, GAP } from "./ClipCard";
import ContentTabs from "./ContentTabs";
import ProfileAvatar from "./ProfileAvatar";
import ProfileBadges from "./ProfileBadges";
import StatsRow from "./StatsRow";

type Props = {
  profile: Profile;
  isOwnProfile: boolean;
};

export default function ProfileView({ profile, isOwnProfile }: Props) {
  const { refreshProfile } = useAuthContext();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState(0);
  const [clips, setClips] = useState<Clip[]>([]);
  const [spotCount, setSpotCount] = useState(0);
  const [clipCount, setClipCount] = useState(0);
  const [crewCount, setCrewCount] = useState(0);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingClips, setLoadingClips] = useState(true);
  const [localAvatarUrl, setLocalAvatarUrl] = useState<string | null>(
    profile.avatar_url
  );

  const displayName =
    profile.display_name?.trim() || `${profile.first_name} ${profile.last_name}`.trim();

  useEffect(() => {
    async function loadStats() {
      setLoadingStats(true);
      try {
        const [spots, clipsN, crew] = await Promise.all([
          getProfileSpotCount(profile.profile_id),
          getProfileClipCount(profile.profile_id),
          getProfileCrewCount(profile.profile_id),
        ]);
        setSpotCount(spots);
        setClipCount(clipsN);
        setCrewCount(crew);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingStats(false);
      }
    }
    loadStats();
  }, [profile.profile_id]);

  useEffect(() => {
    async function loadClips() {
      setLoadingClips(true);
      const data = await fetchProfileClips(profile.profile_id);
      setClips(data);
      setLoadingClips(false);
    }
    loadClips().catch(console.error);
  }, [profile.profile_id]);

  function handleAvatarUpdated(url: string) {
    setLocalAvatarUrl(url);
    refreshProfile();
  }

  return (
    <ScrollView style={styles.bg} contentContainerStyle={styles.scrollContent}>
      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
        <BurgerButton />
      </View>

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
        </View>

        <View style={styles.heroRight}>
          <View style={styles.nameRow}>
            <Text style={styles.displayName} numberOfLines={1}>
              {displayName.toUpperCase()}
            </Text>
            {isOwnProfile && (
              <TouchableOpacity style={styles.editBtn} activeOpacity={0.7}>
                <Ionicons name="pencil" size={14} color={C.muted} />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.meta}>@{profile.username}</Text>
            {profile.city ? (
              <>
                <Text style={styles.metaDot}> · </Text>
                <Ionicons name="location-outline" size={12} color={C.muted} />
                <Text style={styles.meta}> {profile.city.toUpperCase()}</Text>
              </>
            ) : null}
          </View>

          <ProfileBadges
            skillLevel={profile.skill_level}
            disciplines={profile.disciplines}
            pronouns={profile.pronouns}
          />
        </View>
      </View>

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
        <StatsRow spots={spotCount} clips={clipCount} crew={crewCount} />
      )}

      {/* Content tabs */}
      <ContentTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Grid */}
      {activeTab === 0 && (
        <View style={styles.gridContainer}>
          {loadingClips ? (
            <View style={styles.centeredMsg}>
              <ActivityIndicator color={C.primary} />
            </View>
          ) : clips.length === 0 ? (
            <EmptyClips isOwnProfile={isOwnProfile} />
          ) : (
            <View style={styles.grid}>
              {clips.map((clip) => (
                <ClipCard key={clip.clip_id} clip={clip} />
              ))}
            </View>
          )}
        </View>
      )}

      {activeTab === 1 && (
        <View style={styles.centeredMsg}>
          <Ionicons name="pricetag-outline" size={32} color={C.muted} />
          <Text style={styles.emptyLabel}>TAGGED SPOTS COMING SOON</Text>
        </View>
      )}

      {activeTab === 2 && (
        <View style={styles.centeredMsg}>
          <Ionicons name="bookmark-outline" size={32} color={C.muted} />
          <Text style={styles.emptyLabel}>BOOKMARKS COMING SOON</Text>
        </View>
      )}
    </ScrollView>
  );
}

function EmptyClips({ isOwnProfile }: { isOwnProfile: boolean }) {
  return (
    <View style={styles.centeredMsg}>
      <Ionicons
        name={isOwnProfile ? "camera-outline" : "film-outline"}
        size={40}
        color={C.muted}
      />
      {isOwnProfile ? (
        <>
          <Text style={styles.emptyLabel}>SHARE YOUR FIRST CLIP</Text>
          <TouchableOpacity style={styles.uploadBtn} activeOpacity={0.8}>
            <Text style={styles.uploadBtnText}>+ UPLOAD</Text>
          </TouchableOpacity>
        </>
      ) : (
        <Text style={styles.emptyLabel}>NO CLIPS YET</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: C.bg },
  scrollContent: { paddingBottom: 40 },

  topBar: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },

  hero: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 14,
  },
  heroLeft: {},
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
    borderColor: C.border,
  },

  gridContainer: {
    minHeight: 200,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GAP,
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
  uploadBtn: {
    borderWidth: 1.5,
    borderColor: C.primary,
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginTop: 4,
  },
  uploadBtnText: {
    fontFamily: F.mono,
    fontSize: 11,
    color: C.primary,
    letterSpacing: 2,
  },
});
