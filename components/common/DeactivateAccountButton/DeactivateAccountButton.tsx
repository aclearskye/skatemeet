import { useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { useDeactivateAccount } from "@/lib/profiles/hooks/useDeactivateAccount";
import { C } from "@/lib/theme";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { styles } from "./DeactivateAccountButton.styles";

type Props = {
  label?: string;
};

export function DeactivateAccountButton({ label = "DEACTIVATE ACCOUNT" }: Props) {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const deactivate = useDeactivateAccount();

  function handleConfirm() {
    if (deactivate.isPending) return;
    setErrorMsg(null);
    deactivate.mutate(undefined, {
      onSuccess: () => {
        setShowConfirm(false);
        // A held confirmation screen, not a straight-to-Login redirect --
        // signOut() already ran inside deactivateAccount(), and jumping
        // straight to Login made a successful deletion look like nothing
        // had happened.
        router.replace("/account-deleted");
      },
      onError: () => {
        setShowConfirm(false);
        setErrorMsg("Something went wrong — try again.");
      },
    });
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.btn}
        onPress={() => setShowConfirm(true)}
        activeOpacity={0.85}
        disabled={deactivate.isPending}
      >
        {deactivate.isPending ? (
          <ActivityIndicator size="small" color={C.error} />
        ) : (
          <Text style={styles.btnText}>{label}</Text>
        )}
      </TouchableOpacity>
      {errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}

      <ConfirmDialog
        visible={showConfirm}
        title="Deactivate your account?"
        message="This permanently deletes your account and everything tied to it — reviews, photos, check-ins, XP. This cannot be undone."
        confirmLabel="DEACTIVATE"
        onConfirm={handleConfirm}
        onCancel={() => setShowConfirm(false)}
      />
    </View>
  );
}
