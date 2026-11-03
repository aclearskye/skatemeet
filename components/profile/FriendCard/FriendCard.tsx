import { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { fetchUserStreak } from "@/lib/checkins/queries";
import { useToast } from "@/lib/context/toast-context";
import { useRemoveFriend } from "@/lib/friendRequests/hooks/useRemoveFriend";
import type { ProfileSearchResult } from "@/lib/profiles/queries";
import { C } from "@/lib/theme";
import { queryKeys } from "@/utils/queryKeys";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DuctTapeLabel } from "@/components/common/DuctTapeLabel";
import { MessageButton } from "@/components/profile/MessageButton";
import ProfileAvatar from "@/components/profile/ProfileAvatar";
import { StreakBadge } from "@/components/profile/StreakBadge";
import { AVATAR_SIZE, styles } from "./FriendCard.styles";

type Props = {
  friend: ProfileSearchResult;
  onViewProfile: () => void;
};

// Only the avatar, the name and the VIEW PROFILE block navigate -- the rest
// of the card isn't a hitbox, so the message/unfriend icons beside them
// can't be mis-tapped into a profile visit.
export function FriendCard({ friend, onViewProfile }: Props) {
  const { showToast } = useToast();
  const { unfriend, isUnfriending } = useRemoveFriend(friend.profileId);
  const [showUnfriendConfirm, setShowUnfriendConfirm] = useState(false);

  const { data: streak } = useQuery({
    queryKey: queryKeys.userStreak(friend.profileId),
    queryFn: () => fetchUserStreak(friend.profileId),
  });

  function handleUnfriend() {
    setShowUnfriendConfirm(false);
    unfriend(undefined, {
      onError: (err) =>
        showToast({ message: err.message.toUpperCase(), variant: "danger" }),
    });
  }

  return (
    <View style={styles.card}>
      <TouchableOpacity onPress={onViewProfile} activeOpacity={0.85}>
        <ProfileAvatar
          profileId={friend.profileId}
          username={friend.username}
          displayName={friend.displayName}
          avatarUrl={friend.avatarUrl}
          isOwnProfile={false}
          size={AVATAR_SIZE}
        />
      </TouchableOpacity>

      <View style={styles.info}>
        <View style={styles.textGroup}>
          <View style={styles.nameRow}>
            <TouchableOpacity
              style={styles.nameBtn}
              onPress={onViewProfile}
              activeOpacity={0.7}
            >
              <Text style={styles.displayName} numberOfLines={1}>
                {(friend.displayName || friend.username).toUpperCase()}
              </Text>
            </TouchableOpacity>
            {friend.isPrivate === true && (
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
            <Text style={styles.meta} numberOfLines={1}>
              @{friend.username}
              {friend.city ? ` · ${friend.city.toUpperCase()}` : ""}
            </Text>
          </View>
        </View>

        <View style={styles.actionRow}>
          {/* Friends can always message, even when this friend is private. */}
          <MessageButton isPrivate={friend.isPrivate} friendStatus="friends" />
          <DuctTapeLabel
            color={C.secondary}
            style={styles.unfriendBtn}
            disabled={isUnfriending}
            onPress={() => setShowUnfriendConfirm(true)}
          >
            <MaterialCommunityIcons
              name="account-minus"
              size={18}
              color={C.onSecondary}
            />
          </DuctTapeLabel>
        </View>
      </View>

      <TouchableOpacity
        style={styles.cta}
        onPress={onViewProfile}
        activeOpacity={0.8}
      >
        <View style={styles.ctaIconRow}>
          <MaterialCommunityIcons
            name="account"
            size={22}
            color={C.onPrimary}
          />
          <Ionicons name="arrow-forward" size={13} color={C.onPrimary} />
        </View>
        <Text style={styles.ctaText}>VIEW PROFILE</Text>
      </TouchableOpacity>

      <ConfirmDialog
        visible={showUnfriendConfirm}
        title="UNFRIEND?"
        message={`You and @${friend.username} will no longer be friends. You can send a new request later.`}
        confirmLabel="UNFRIEND"
        onConfirm={handleUnfriend}
        onCancel={() => setShowUnfriendConfirm(false)}
      />
    </View>
  );
}
