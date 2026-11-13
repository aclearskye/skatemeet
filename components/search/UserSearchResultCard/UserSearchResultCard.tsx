import { useState } from "react";
import { LayoutChangeEvent, Text, TouchableOpacity, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { fetchUserStreak } from "@/lib/checkins/queries";
import type { ProfileSearchResult } from "@/lib/profiles/queries";
import { C } from "@/lib/theme";
import { queryKeys } from "@/utils/queryKeys";
import ProfileAvatar from "@/components/profile/ProfileAvatar";
import ProfileBadges from "@/components/profile/ProfileBadges";
import { StreakBadge } from "@/components/profile/StreakBadge";
import { styles } from "./UserSearchResultCard.styles";

type Props = {
  result: ProfileSearchResult;
  onPress: () => void;
};

// First-render guess for the avatar, close to a typical card's text height,
// so it barely moves once the real height is measured.
const INITIAL_AVATAR_SIZE = 76;

export function UserSearchResultCard({ result, onPress }: Props) {
  const { data: streak } = useQuery({
    queryKey: queryKeys.userStreak(result.profileId),
    queryFn: () => fetchUserStreak(result.profileId),
  });
  // The avatar is a square as tall as the text column beside it, so it
  // fills the card's height. ProfileAvatar takes a fixed size, so the
  // column is measured.
  const [avatarSize, setAvatarSize] = useState(INITIAL_AVATAR_SIZE);

  function handleInfoLayout(event: LayoutChangeEvent) {
    const height = Math.round(event.nativeEvent.layout.height);
    if (height > 0 && height !== avatarSize) setAvatarSize(height);
  }

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <TouchableOpacity style={styles.previewRow} onPress={onPress} activeOpacity={0.85}>
          <ProfileAvatar
            profileId={result.profileId}
            username={result.username}
            displayName={result.displayName}
            avatarUrl={result.avatarUrl}
            isOwnProfile={false}
            size={avatarSize}
          />

          <View style={styles.info} onLayout={handleInfoLayout}>
            <View style={styles.nameRow}>
              <Text style={styles.displayName} numberOfLines={1}>
                {(result.displayName || result.username).toUpperCase()}
              </Text>
              {result.isPrivate === true && (
                <Ionicons
                  name="lock-closed"
                  size={13}
                  color={C.secondary}
                  accessibilityLabel="Private account"
                />
              )}
              {streak && streak.current_streak > 0 && (
                <StreakBadge currentStreak={streak.current_streak} />
              )}
            </View>

            <View style={styles.metaRow}>
              <Text style={styles.meta}>@{result.username}</Text>
              {result.city ? (
                <>
                  <Text style={styles.metaDot}>{" · "}</Text>
                  <Ionicons name="location-outline" size={11} color={C.muted} />
                  <Text style={styles.meta}> {result.city.toUpperCase()}</Text>
                </>
              ) : null}
            </View>

            <ProfileBadges skillLevel={null} disciplines={result.disciplines} pronouns={null} size="sm" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.cta} onPress={onPress} activeOpacity={0.8}>
          <View style={styles.ctaIconRow}>
            <MaterialCommunityIcons name="account" size={22} color={C.onPrimary} />
            <Ionicons name="arrow-forward" size={13} color={C.onPrimary} />
          </View>
          <Text style={styles.ctaText}>VIEW PROFILE</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
