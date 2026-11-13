import { useState } from "react";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useStoreBillingAction } from "@/lib/storeAccounts/hooks/useStoreBillingAction";
import { StoreAccountError } from "@/lib/storeAccounts/types";
import { C } from "@/lib/theme";
import { StorePrimaryButton } from "@/components/storeAccount/StorePrimaryButton";
import { styles } from "./StoreBillingStep.styles";

type Props = {
  // Refetch billing by hand, in case Stripe's confirmation is slow.
  onCheckAgain: () => void;
  isChecking: boolean;
};

// Onboarding: save a card with Stripe before the claim goes to review.
// Nothing is charged now; the 14-day trial starts when the claim is approved.
export function StoreBillingStep({ onCheckAgain, isChecking }: Props) {
  const billing = useStoreBillingAction();
  const [error, setError] = useState<string | null>(null);
  const [opened, setOpened] = useState(false);

  const handleAddCard = () => {
    setError(null);
    billing.mutate("setup_card", {
      onSuccess: () => setOpened(true),
      onError: (err) => setError(err instanceof StoreAccountError ? err.message : "Couldn't open billing. Try again."),
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>PAYMENT CARD</Text>
      <Text style={styles.body}>
        SkateMeet for business is a monthly subscription. Add a card now and you won&apos;t be charged yet: your 14-day
        free trial starts when your claim is approved.
      </Text>
      <View style={styles.points}>
        <Point text="Card details are entered on Stripe's secure page, never in SkateMeet." />
        <Point text="Cancel any time from your store's billing settings." />
        <Point text="A failed payment is retried weekly before purchasing is paused." />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <StorePrimaryButton label="ADD PAYMENT CARD" onPress={handleAddCard} isBusy={billing.isPending} />
      {opened ? (
        <>
          <Text style={styles.hint}>Added your card? It can take a few seconds to show here.</Text>
          <StorePrimaryButton label="CHECK AGAIN" variant="secondary" onPress={onCheckAgain} isBusy={isChecking} />
        </>
      ) : null}
    </View>
  );
}

function Point({ text }: { text: string }) {
  return (
    <View style={styles.point}>
      <Ionicons name="checkmark" size={16} color={C.primary} />
      <Text style={styles.pointText}>{text}</Text>
    </View>
  );
}
