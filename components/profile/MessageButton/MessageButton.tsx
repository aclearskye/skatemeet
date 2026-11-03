import { Ionicons } from "@expo/vector-icons";
import { TouchableOpacity } from "react-native";
import { DuctTapeLabel } from "@/components/common/DuctTapeLabel";
import { useToast } from "@/lib/context/toast-context";
import type { FriendStatus } from "@/lib/friendRequests/types";
import { C } from "@/lib/theme";
import { styles } from "./MessageButton.styles";

const ICON_SIZE = 18;

type Props = {
  isPrivate: boolean;
  friendStatus: FriendStatus;
};

export function MessageButton({ isPrivate, friendStatus }: Props) {
  const { showToast } = useToast();

  // Public profiles can be messaged by anyone signed in; private profiles
  // only once the friend request has been accepted.
  const isEnabled = !isPrivate || friendStatus === "friends";

  function handlePress() {
    showToast({ message: "MESSAGING IS COMING SOON", variant: "info" });
  }

  if (!isEnabled) {
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
    <DuctTapeLabel color={C.tertiary} style={styles.btn} onPress={handlePress}>
      <Ionicons name="mail" size={ICON_SIZE} color={C.onTertiary} />
    </DuctTapeLabel>
  );
}
