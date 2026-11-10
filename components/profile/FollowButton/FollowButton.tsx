import { useState } from "react";
import { Text, TouchableOpacity } from "react-native";
import { useFollowToggle } from "@/lib/follows/hooks/useFollowToggle";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { styles } from "./FollowButton.styles";

type Props = {
  profileId: string;
  username: string;
};

// Only rendered for public profiles -- private ones can't be followed.
// Unfollowing asks first; following is instant.
export function FollowButton({ profileId, username }: Props) {
  const { following, isLoading, toggle, isUpdating } = useFollowToggle(profileId);
  const [confirmUnfollow, setConfirmUnfollow] = useState(false);

  return (
    <>
      <TouchableOpacity
        style={[styles.btn, following && styles.btnFollowing]}
        onPress={() => (following ? setConfirmUnfollow(true) : toggle())}
        disabled={isLoading || isUpdating}
        activeOpacity={0.8}
        accessibilityLabel={following ? `Unfollow @${username}` : `Follow @${username}`}
      >
        <Text style={[styles.text, following && styles.textFollowing]}>{following ? "FOLLOWING" : "FOLLOW"}</Text>
      </TouchableOpacity>
      <ConfirmDialog
        visible={confirmUnfollow}
        title={`Unfollow @${username}?`}
        message="Their posts will stop showing in your Following feed."
        confirmLabel="UNFOLLOW"
        onConfirm={() => {
          setConfirmUnfollow(false);
          toggle();
        }}
        onCancel={() => setConfirmUnfollow(false)}
      />
    </>
  );
}
