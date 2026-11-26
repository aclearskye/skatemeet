import { useState } from "react";
import { Switch, Text, TextInput, View } from "react-native";
import { useSetTicketRequestRules } from "@/lib/tickets/hooks/useSetTicketRequestRules";
import { formatTicketPrice, TicketsError, type MyTicketing } from "@/lib/tickets/types";
import { C } from "@/lib/theme";
import { styles } from "./StoreRequestRules.styles";

type Props = {
  ticketing: MyTicketing;
  canEdit: boolean;
};

const DEFAULT_REFUND_MAX_MINOR = 1000;
const PRICE_REGEX = /^\d+(\.\d{1,2})?$/;

function toPounds(minor: number): string {
  return (minor / 100).toFixed(2);
}

// Whether the store handles refund and swap requests itself or lets them
// through: swaps (always same price) and refunds up to an amount.
export function StoreRequestRules({ ticketing, canEdit }: Props) {
  const rules = useSetTicketRequestRules();
  const [amount, setAmount] = useState(toPounds(ticketing.autoRefundMaxMinor ?? DEFAULT_REFUND_MAX_MINOR));
  const [error, setError] = useState<string | null>(null);
  const refundsOn = ticketing.autoRefundMaxMinor != null;

  const save = (autoApproveSwaps: boolean, autoRefundMaxMinor: number | null) => {
    setError(null);
    rules.mutate(
      { autoApproveSwaps, autoRefundMaxMinor },
      { onError: (err) => setError(err instanceof TicketsError ? err.message : "Couldn't save. Try again.") }
    );
  };

  const amountMinor = (): number | null => {
    const text = amount.trim();
    if (!PRICE_REGEX.test(text)) return null;
    const minor = Math.round(Number(text) * 100);
    return minor <= 100000 ? minor : null;
  };

  const saveAmount = () => {
    if (!refundsOn) return;
    const minor = amountMinor();
    if (minor == null) {
      setError("Enter an amount like 7.00, up to 1,000.");
      return;
    }
    if (minor !== ticketing.autoRefundMaxMinor) save(ticketing.autoApproveSwaps, minor);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>REFUNDS AND SWAPS</Text>
      <Text style={styles.hint}>
        Skaters can ask to refund or swap a ticket they haven&apos;t used 30 days after buying it. Let some through
        without you, or decide each one under Requests.
      </Text>

      <View style={styles.row}>
        <View style={styles.rowText}>
          <Text style={styles.rowTitle}>Approve swaps automatically</Text>
          <Text style={styles.hint}>Swaps are always for a ticket at the same price.</Text>
        </View>
        <Switch
          value={ticketing.autoApproveSwaps}
          onValueChange={(on) => save(on, ticketing.autoRefundMaxMinor)}
          disabled={!canEdit}
          trackColor={{ true: C.primary, false: C.borderVariant }}
        />
      </View>

      <View style={styles.row}>
        <View style={styles.rowText}>
          <Text style={styles.rowTitle}>Refund small tickets automatically</Text>
          <Text style={styles.hint}>
            {refundsOn
              ? `Tickets up to ${formatTicketPrice(ticketing.autoRefundMaxMinor ?? 0, ticketing.currency)} are refunded straight away. Stripe keeps its fee.`
              : "Every refund waits for you."}
          </Text>
        </View>
        <Switch
          value={refundsOn}
          onValueChange={(on) => save(ticketing.autoApproveSwaps, on ? (amountMinor() ?? DEFAULT_REFUND_MAX_MINOR) : null)}
          disabled={!canEdit}
          trackColor={{ true: C.primary, false: C.borderVariant }}
        />
      </View>
      {refundsOn ? (
        <View style={styles.amountRow}>
          <Text style={styles.rowTitle}>Up to</Text>
          <TextInput
            style={styles.amount}
            value={amount}
            onChangeText={setAmount}
            onBlur={saveAmount}
            onSubmitEditing={saveAmount}
            keyboardType="decimal-pad"
            returnKeyType="done"
            editable={canEdit}
            accessibilityLabel="Automatic refund limit"
          />
          <Text style={styles.hint}>{ticketing.currency}</Text>
        </View>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}
