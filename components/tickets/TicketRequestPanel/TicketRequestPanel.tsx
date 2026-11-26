import { useState } from "react";
import { Text, View } from "react-native";
import { useTicketRequest } from "@/lib/tickets/hooks/useTicketRequest";
import { REQUEST_AFTER_DAYS } from "@/lib/tickets/requestTypes";
import { TicketsError, type MyTicket } from "@/lib/tickets/types";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { StorePrimaryButton } from "@/components/storeAccount/StorePrimaryButton";
import { SwapSheet } from "@/components/tickets/SwapSheet";
import { styles } from "./TicketRequestPanel.styles";

type Props = {
  ticket: MyTicket;
};

// Under a ticket on My tickets: once it's been unused for 30 days, the
// skater can ask the store for a refund or a swap, and see how that's going.
// Renders nothing for tickets that can't be asked about.
export function TicketRequestPanel({ ticket }: Props) {
  const request = useTicketRequest();
  const [confirmRefund, setConfirmRefund] = useState(false);
  const [swapping, setSwapping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const open = ticket.request?.status === "pending" ? ticket.request : null;
  const lastDeclined = ticket.request?.status === "declined";

  if (!open && !ticket.canRequest) return null;

  const onError = (err: Error) => setError(err instanceof TicketsError ? err.message : "Couldn't send that. Try again.");

  if (open) {
    const what = open.kind === "refund" ? "a refund" : `a swap for ${open.swapName ?? "another ticket"}`;
    return (
      <View style={styles.panel}>
        <Text style={styles.status}>You asked {ticket.storeName} for {what}. Waiting for them to reply.</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <StorePrimaryButton
          label="CANCEL REQUEST"
          variant="secondary"
          isBusy={request.isPending}
          onPress={() => {
            setError(null);
            request.mutate({ action: "cancel", requestId: open.requestId }, { onError });
          }}
        />
      </View>
    );
  }

  const ask = (kind: "refund" | "swap", swapTicketTypeId: string | null) => {
    setError(null);
    request.mutate({ action: "request", ticketId: ticket.ticketId, kind, swapTicketTypeId }, { onError });
  };

  return (
    <View style={styles.panel}>
      <Text style={styles.hint}>
        {lastDeclined
          ? `${ticket.storeName} declined your last request. You can ask again.`
          : `Not used in ${REQUEST_AFTER_DAYS} days? Ask ${ticket.storeName} for a refund, or swap it for another ticket.`}
      </Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.buttons}>
        <View style={styles.button}>
          <StorePrimaryButton
            label="ASK FOR REFUND"
            variant="secondary"
            isBusy={request.isPending}
            onPress={() => setConfirmRefund(true)}
          />
        </View>
        <View style={styles.button}>
          <StorePrimaryButton label="SWAP TICKET" variant="secondary" onPress={() => setSwapping(true)} />
        </View>
      </View>

      <ConfirmDialog
        visible={confirmRefund}
        title="Ask for a refund?"
        message={`${ticket.storeName} will decide. If they agree, the money goes back to your card and the ticket stops working.`}
        confirmLabel="ASK"
        onConfirm={() => {
          setConfirmRefund(false);
          ask("refund", null);
        }}
        onCancel={() => setConfirmRefund(false)}
      />
      <SwapSheet
        ticket={swapping ? ticket : null}
        onPick={(option) => {
          setSwapping(false);
          ask("swap", option.ticketTypeId);
        }}
        onClose={() => setSwapping(false)}
      />
    </View>
  );
}
