import { useState } from "react";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { restartStoreClaim, withdrawStoreClaim } from "@/lib/storeAccounts/mutations";
import { useStoreOnboardingAction } from "@/lib/storeAccounts/hooks/useStoreOnboardingAction";
import { StoreAccountError, type StoreClaim, type StoreClaimStatus } from "@/lib/storeAccounts/types";
import { C } from "@/lib/theme";
import { ClaimedStoreSummaryCard } from "@/components/storeAccount/ClaimedStoreSummaryCard";
import { StorePrimaryButton } from "@/components/storeAccount/StorePrimaryButton";
import { styles } from "./ClaimStatusPanel.styles";

type Props = {
  claim: StoreClaim;
};

type StatusCopy = { icon: keyof typeof Ionicons.glyphMap; color: string; title: string; body: string };

const COPY: Record<Exclude<StoreClaimStatus, "draft">, StatusCopy> = {
  pending: {
    icon: "time-outline",
    color: C.secondary,
    title: "CLAIM UNDER REVIEW",
    body: "We're checking your proof. This usually takes a few working days. You can withdraw the claim to change it.",
  },
  approved: {
    icon: "checkmark-circle-outline",
    color: C.primary,
    title: "YOU OWN THIS STORE",
    body: "Your claim is approved. Store page tools are coming in the next update.",
  },
  rejected: {
    icon: "close-circle-outline",
    color: C.error,
    title: "CLAIM NOT APPROVED",
    body: "Read the note below, then start again with better proof.",
  },
  revoked: {
    icon: "alert-circle-outline",
    color: C.error,
    title: "OWNERSHIP TRANSFERRED",
    body: "After a dispute, this store was transferred to another business. You can file a dispute with your proof.",
  },
};

export function ClaimStatusPanel({ claim }: Props) {
  const [error, setError] = useState<string | null>(null);
  const withdraw = useStoreOnboardingAction(withdrawStoreClaim);
  const restart = useStoreOnboardingAction(restartStoreClaim);

  if (claim.status === "draft") return null;
  const copy = COPY[claim.status];
  const onError = (err: unknown) =>
    setError(err instanceof StoreAccountError ? err.message : "Something went wrong. Try again.");

  return (
    <View style={styles.container}>
      <View style={styles.banner}>
        <Ionicons name={copy.icon} size={28} color={copy.color} />
        <Text style={[styles.title, { color: copy.color }]}>
          {claim.status === "pending" && claim.kind === "dispute" ? "DISPUTE UNDER REVIEW" : copy.title}
        </Text>
      </View>
      {claim.store ? <ClaimedStoreSummaryCard store={claim.store} /> : null}
      <Text style={styles.body}>{copy.body}</Text>

      {claim.reviewNotes ? (
        <View style={styles.notes}>
          <Text style={styles.notesLabel}>NOTE FROM SKATEMEET</Text>
          <Text style={styles.notesText}>{claim.reviewNotes}</Text>
        </View>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {claim.status === "pending" ? (
        <StorePrimaryButton
          label="WITHDRAW CLAIM"
          variant="secondary"
          onPress={() => withdraw.mutate(undefined, { onError })}
          isBusy={withdraw.isPending}
        />
      ) : null}
      {claim.status === "rejected" || claim.status === "revoked" ? (
        <StorePrimaryButton
          label={claim.status === "revoked" ? "FILE A DISPUTE" : "START AGAIN"}
          onPress={() => restart.mutate(undefined, { onError })}
          isBusy={restart.isPending}
        />
      ) : null}
    </View>
  );
}
