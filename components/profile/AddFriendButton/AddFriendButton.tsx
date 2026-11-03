import { useState } from "react";
import { TouchableOpacity, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useToast } from "@/lib/context/toast-context";
import { useCancelFriendRequest } from "@/lib/friendRequests/hooks/useCancelFriendRequest";
import { useFriendStatus } from "@/lib/friendRequests/hooks/useFriendStatus";
import { useRemoveFriend } from "@/lib/friendRequests/hooks/useRemoveFriend";
import { useRespondToFriendRequest } from "@/lib/friendRequests/hooks/useRespondToFriendRequest";
import { useSendFriendRequest } from "@/lib/friendRequests/hooks/useSendFriendRequest";
import { C } from "@/lib/theme";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DuctTapeLabel } from "@/components/common/DuctTapeLabel";
import { styles } from "./AddFriendButton.styles";

const ICON_SIZE = 18;

type Props = {
  profileId: string;
  username: string;
};

export function AddFriendButton({ profileId, username }: Props) {
  const { data } = useFriendStatus(profileId);
  const status = data?.status ?? "none";
  const { showToast } = useToast();
  const { sendRequest, isSending } = useSendFriendRequest(profileId);
  const { respond, isResponding } = useRespondToFriendRequest();
  const { unfriend, isUnfriending } = useRemoveFriend(profileId);
  const { cancelRequest, isCancelling } = useCancelFriendRequest(profileId);
  const [showUnfriendConfirm, setShowUnfriendConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  function showError(err: Error) {
    showToast({ message: err.message.toUpperCase(), variant: "danger" });
  }

  function handleUnfriend() {
    setShowUnfriendConfirm(false);
    unfriend(undefined, { onError: showError });
  }

  function handleCancelRequest() {
    setShowCancelConfirm(false);
    cancelRequest(undefined, { onError: showError });
  }

  if (status === "friends") {
    return (
      <>
        <DuctTapeLabel
          color={C.secondary}
          style={styles.btn}
          disabled={isUnfriending}
          onPress={() => setShowUnfriendConfirm(true)}
        >
          <MaterialCommunityIcons name="account-minus" size={ICON_SIZE} color={C.onSecondary} />
        </DuctTapeLabel>
        <ConfirmDialog
          visible={showUnfriendConfirm}
          title="UNFRIEND?"
          message={`You and @${username} will no longer be friends. You can send a new request later.`}
          confirmLabel="UNFRIEND"
          onConfirm={handleUnfriend}
          onCancel={() => setShowUnfriendConfirm(false)}
        />
      </>
    );
  }

  if (status === "pending_sent") {
    return (
      <>
        <TouchableOpacity
          style={[styles.btn, styles.btnPending]}
          disabled={isCancelling}
          onPress={() => setShowCancelConfirm(true)}
          activeOpacity={0.7}
          accessibilityLabel="Friend request sent. Tap to withdraw it."
        >
          <MaterialCommunityIcons name="account-clock" size={ICON_SIZE} color={C.muted} />
        </TouchableOpacity>
        <ConfirmDialog
          visible={showCancelConfirm}
          title="WITHDRAW REQUEST?"
          message={`Your friend request to @${username} will be withdrawn. You can send another one later.`}
          confirmLabel="WITHDRAW"
          onConfirm={handleCancelRequest}
          onCancel={() => setShowCancelConfirm(false)}
        />
      </>
    );
  }

  if (status === "pending_received") {
    const requestId = data?.requestId;
    return (
      <View style={styles.respondRow}>
        <DuctTapeLabel
          color={C.primary}
          style={styles.btn}
          disabled={isResponding || !requestId}
          onPress={() => requestId && respond({ requestId, accept: true, otherProfileId: profileId })}
        >
          <MaterialCommunityIcons name="account-check" size={ICON_SIZE} color={C.onPrimary} />
        </DuctTapeLabel>
        <DuctTapeLabel
          color={C.secondary}
          style={styles.btn}
          disabled={isResponding || !requestId}
          onPress={() => requestId && respond({ requestId, accept: false, otherProfileId: profileId })}
        >
          <MaterialCommunityIcons name="account-remove" size={ICON_SIZE} color={C.onSecondary} />
        </DuctTapeLabel>
      </View>
    );
  }

  return (
    <DuctTapeLabel
      color={C.primary}
      style={styles.btn}
      disabled={isSending}
      onPress={() => sendRequest()}
    >
      <MaterialCommunityIcons name="account-plus" size={ICON_SIZE} color={C.onPrimary} />
    </DuctTapeLabel>
  );
}
