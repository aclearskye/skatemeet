import { useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useEnsureStoreSubscription } from "@/lib/storeAccounts/hooks/useEnsureStoreSubscription";
import { useStoreBilling } from "@/lib/storeAccounts/hooks/useStoreBilling";
import { useStoreBillingAction } from "@/lib/storeAccounts/hooks/useStoreBillingAction";
import { StoreAccountError, type BillingAction, type StoreBilling } from "@/lib/storeAccounts/types";
import { C } from "@/lib/theme";
import { StorePrimaryButton } from "@/components/storeAccount/StorePrimaryButton";
import { styles } from "./StoreBillingPanel.styles";

function formatDate(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "";
}

// One line describing where the subscription stands.
function statusLine(billing: StoreBilling): string {
  switch (billing.status) {
    case "trialing":
      return `Free trial until ${formatDate(billing.trialEnd)}.`;
    case "active":
      return billing.cancelAtPeriodEnd
        ? `Cancelled. Active until ${formatDate(billing.currentPeriodEnd)}.`
        : `Active. Renews ${formatDate(billing.currentPeriodEnd)}.`;
    case "past_due":
      return "Your last payment failed. We'll retry it weekly. Update your card to avoid pausing your store.";
    case "unpaid":
      return "Unpaid. Purchasing is paused and you can only change opening hours until the invoice is paid.";
    case "canceled":
    case "incomplete_expired":
      return "Your subscription has ended. Purchasing is paused and you can only change opening hours.";
    case "incomplete":
      return "Your first payment needs attention.";
    default:
      return billing.trialEnd ? `Free trial until ${formatDate(billing.trialEnd)}.` : "Setting up your subscription…";
  }
}

// The approved store's subscription, shown on its page editor.
export function StoreBillingPanel() {
  const { data: billing, isLoading } = useStoreBilling();
  const action = useStoreBillingAction();
  const [error, setError] = useState<string | null>(null);
  useEnsureStoreSubscription(billing);

  if (isLoading || !billing) {
    return (
      <View style={styles.card}>
        <ActivityIndicator color={C.primary} />
      </View>
    );
  }

  const run = (kind: BillingAction) => {
    setError(null);
    action.mutate(kind, {
      onError: (err) => setError(err instanceof StoreAccountError ? err.message : "Couldn't open billing. Try again."),
    });
  };

  const ended = billing.status === "canceled" || billing.status === "incomplete_expired";
  // A store approved without a saved card (e.g. before billing existed).
  // Once the card is saved, useEnsureStoreSubscription starts the
  // subscription, with whatever is left of the 14-day trial.
  const needsCard = !billing.paymentMethodReady && !billing.hasSubscription;
  const warn = !billing.isPaid || needsCard;

  return (
    <View style={[styles.card, warn && styles.cardWarning]}>
      <Text style={styles.label}>SUBSCRIPTION</Text>
      <Text style={[styles.status, warn && styles.statusWarning]}>
        {needsCard
          ? "Add a payment card to keep your store page active after your free trial."
          : statusLine(billing)}
      </Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {needsCard ? (
        <StorePrimaryButton label="ADD PAYMENT CARD" onPress={() => run("setup_card")} isBusy={action.isPending} />
      ) : ended ? (
        <StorePrimaryButton label="RESUBSCRIBE" onPress={() => run("resubscribe")} isBusy={action.isPending} />
      ) : (
        <StorePrimaryButton
          label={billing.status === "unpaid" ? "PAY NOW" : "MANAGE BILLING"}
          variant={billing.isPaid ? "secondary" : "primary"}
          onPress={() => run("portal")}
          isBusy={action.isPending}
        />
      )}
    </View>
  );
}
