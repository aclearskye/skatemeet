import { Ionicons } from "@expo/vector-icons";
import { TouchableOpacity } from "react-native";
import { DuctTapeLabel } from "@/components/common/DuctTapeLabel";
import type { FriendStatus } from "@/lib/friendRequests/types";
import { useOpenConversation } from "@/lib/messages/hooks/useOpenConversation";
import { C } from "@/lib/theme";
import { styles } from "./MessageButton.styles";

const ICON_SIZE = 18;

type Props = {
  profileId: string;
  friendStatus: FriendStatus;
};

// Messaging is friends-only, public profile or not.
export function MessageButton({ profileId, friendStatus }: Props) {
  const { openChat, isOpening } = useOpenConversation();

  if (friendStatus !== "friends") {
    return (
      <TouchableOpacity
        style={[styles.btn, styles.btnDisabled]}
        disabled
        activeOpacity={1}
        accessibilityLabel="Messaging locked until you're friends"
      >
        <Ionicons name="lock-closed-outline" size={ICON_SIZE} color={C.muted} />
      </TouchableOpacity>
    );
  }

  return (
    <DuctTapeLabel
      color={C.tertiary}
      style={styles.btn}
      disabled={isOpening}
      onPress={() => openChat(profileId)}
    >
      <Ionicons name="mail" size={ICON_SIZE} color={C.onTertiary} accessibilityLabel="Message" />
    </DuctTapeLabel>
  );
}
