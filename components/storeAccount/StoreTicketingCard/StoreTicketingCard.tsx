import { useState } from "react";
import { ActivityIndicator, Switch, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useMyTicketing } from "@/lib/tickets/hooks/useMyTicketing";
import { useSetTicketingUnder18 } from "@/lib/tickets/hooks/useSetTicketingUnder18";
import { useTicketingOnboarding } from "@/lib/tickets/hooks/useTicketingOnboarding";
import { TicketsError } from "@/lib/tickets/types";
import { C } from "@/lib/theme";
import { StorePrimaryButton } from "@/components/storeAccount/StorePrimaryButton";
import { styles } from "./StoreTicketingCard.styles";

type Props = {
  // Unpaid stores can't set up or change tickets.
  canEdit: boolean;
};

// Entry tickets on the store page editor: connect Stripe, then manage
// tickets. Payments go straight to the store's own Stripe account.
export function StoreTicketingCard({ canEdit }: Props) {
  const router = useRouter();
  const { data: ticketing, isLoading, isFetching } = useMyTicketing();
  const onboarding = useTicketingOnboarding();
  const under18 = useSetTicketingUnder18();
  const [error, setError] = useState<string | null>(null);

  // While loading, or just back from Stripe and re-checking the account.
  const checking = isLoading || onboarding.isPending || (isFetching && ticketing != null && !ticketing.chargesEnabled);
  if (checking) {
    return (
      <View style={[styles.card, styles.checking]}>
        <ActivityIndicator color={C.primary} />
        {isLoading ? null : <Text style={styles.hint}>Checking with Stripe…</Text>}
      </View>
    );
  }

  const startOnboarding = () => {
    setError(null);
    onboarding.mutate(undefined, {
      onError: (err) => setError(err instanceof TicketsError ? err.message : "Couldn't open Stripe. Try again."),
    });
  };

  if (!ticketing?.chargesEnabled) {
    const started = ticketing != null;
    return (
      <View style={styles.card}>
        <Text style={styles.hint}>
          {started
            ? ticketing.detailsSubmitted
              ? "Stripe is checking your details. You can sell tickets once it's done."
              : "Finish setting up Stripe to start selling tickets."
            : "Set up your own Stripe account to get paid. It's free to set up."}
        </Text>
        {!canEdit ? <Text style={styles.error}>Selling tickets needs an active subscription.</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <StorePrimaryButton
          label={started ? "CONTINUE STRIPE SETUP" : "SET UP TICKETS WITH STRIPE"}
          onPress={startOnboarding}
          isBusy={onboarding.isPending}
          disabled={!canEdit}
        />
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.connected}>{ticketing.canSell ? "Selling tickets" : "Ticket sales paused"}</Text>
      <Text style={styles.hint}>
        Payments go to your Stripe account ({ticketing.currency}). Refunds and payouts are in your Stripe dashboard.
      </Text>

      <View style={styles.row}>
        <View style={styles.rowText}>
          <Text style={styles.rowTitle}>Sell to under-18s</Text>
          <Text style={styles.hint}>Up to £20 a ticket. A parent or guardian signs consent by email.</Text>
        </View>
        <Switch
          value={ticketing.allowUnder18}
          onValueChange={(allow) =>
            under18.mutate(allow, {
              onError: (err) => setError(err instanceof TicketsError ? err.message : "Couldn't save. Try again."),
            })
          }
          disabled={!canEdit}
          trackColor={{ true: C.primary, false: C.borderVariant }}
        />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <StorePrimaryButton label="MANAGE TICKETS" onPress={() => router.push("/store-tickets" as never)} />
    </View>
  );
}
