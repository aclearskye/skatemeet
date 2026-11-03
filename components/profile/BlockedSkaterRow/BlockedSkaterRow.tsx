import { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { useBlockProfile } from "@/lib/blocks/hooks/useBlockProfile";
import type { BlockedProfile } from "@/lib/blocks/types";
import { useToast } from "@/lib/context/toast-context";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import ProfileAvatar from "@/components/profile/ProfileAvatar";
import { AVATAR_SIZE, styles } from "./BlockedSkaterRow.styles";

type Props = {
  blocked: BlockedProfile;
};

export function BlockedSkaterRow({ blocked }: Props) {
  const { showToast } = useToast();
  const { unblock, isUpdating } = useBlockProfile(blocked.profileId);
  const [showConfirm, setShowConfirm] = useState(false);

  function handleUnblock() {
    setShowConfirm(false);
    unblock({ onError: (err) => showToast({ message: err.message.toUpperCase(), variant: "danger" }) });
  }

  return (
    <View style={styles.row}>
      <ProfileAvatar
        profileId={blocked.profileId}
        username={blocked.username}
        displayName={blocked.displayName}
        avatarUrl={blocked.avatarUrl}
        isOwnProfile={false}
        size={AVATAR_SIZE}
      />
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {(blocked.displayName || blocked.username).toUpperCase()}
        </Text>
        <Text style={styles.username} numberOfLines={1}>
          @{blocked.username}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.unblockBtn}
        onPress={() => setShowConfirm(true)}
        disabled={isUpdating}
        activeOpacity={0.7}
      >
        <Text style={styles.unblockText}>UNBLOCK</Text>
      </TouchableOpacity>

      <ConfirmDialog
        visible={showConfirm}
        title={`UNBLOCK @${(blocked.username ?? "").toUpperCase()}?`}
        message="You'll be able to see each other's profiles again. You won't be friends until one of you sends a new request."
        confirmLabel="UNBLOCK"
        onConfirm={handleUnblock}
        onCancel={() => setShowConfirm(false)}
      />
    </View>
  );
}
