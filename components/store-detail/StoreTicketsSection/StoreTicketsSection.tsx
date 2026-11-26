import { useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import type { TapeColors } from "@/lib/shared/tapeLabels";
import { useBuyTicket } from "@/lib/tickets/hooks/useBuyTicket";
import { useMyTickets } from "@/lib/tickets/hooks/useMyTickets";
import { useStoreTickets } from "@/lib/tickets/hooks/useStoreTickets";
import { formatTicketPrice, isTicketUsable, TicketsError, ticketValidityLabel, type MyTicket } from "@/lib/tickets/types";
import { TicketQrModal } from "@/components/tickets/TicketQrModal";
import { styles } from "./StoreTicketsSection.styles";

type Props = {
  storeOwnerId: string;
  // The page's accent colour, for the Buy buttons and prices.
  accent: TapeColors;
};

const BLOCKED_MESSAGES = {
  store: "This store isn't selling tickets through SkateMeet right now.",
  account: "Your account can't buy tickets here.",
};

// A store's entry tickets on its page. Paid on a Stripe page run on the
// store's own account. Renders nothing when the store sells no tickets.
export function StoreTicketsSection({ storeOwnerId, accent }: Props) {
  const { data: tickets } = useStoreTickets(storeOwnerId);
  const { data: myTickets = [] } = useMyTickets();
  const buy = useBuyTicket();
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shownTicket, setShownTicket] = useState<MyTicket | null>(null);

  if (!tickets) return null;

  // The newest ticket the skater can still get in with, per ticket type.
  // My tickets is newest first, so the first match wins.
  const heldByType = new Map<string, MyTicket>();
  for (const ticket of myTickets) {
    if (ticket.ticketTypeId && isTicketUsable(ticket) && !heldByType.has(ticket.ticketTypeId)) {
      heldByType.set(ticket.ticketTypeId, ticket);
    }
  }

  const handleBuy = (ticketTypeId: string) => {
    setError(null);
    setBuyingId(ticketTypeId);
    buy.mutate(ticketTypeId, {
      onError: (err) => setError(err instanceof TicketsError ? err.message : "Couldn't start the payment. Try again."),
      onSettled: () => setBuyingId(null),
    });
  };

  return (
    <View style={styles.section}>
      <Text style={styles.label}>TICKETS</Text>
      {tickets.blockedReason ? <Text style={styles.notice}>{BLOCKED_MESSAGES[tickets.blockedReason]}</Text> : null}

      {tickets.ticketTypes.map((ticket) => (
        <View key={ticket.ticketTypeId} style={styles.row}>
          <View style={styles.text}>
            <Text style={styles.name}>{ticket.name}</Text>
            <Text style={styles.detail}>{ticketValidityLabel(ticket)}</Text>
            {ticket.description ? <Text style={styles.description}>{ticket.description}</Text> : null}
            <Text style={[styles.price, { color: accent.bg }]}>{formatTicketPrice(ticket.priceMinor, ticket.currency)}</Text>
          </View>
          {heldByType.has(ticket.ticketTypeId) ? (
            <TouchableOpacity
              style={[styles.buy, styles.view, { borderColor: accent.bg }]}
              onPress={() => setShownTicket(heldByType.get(ticket.ticketTypeId)!)}
              activeOpacity={0.8}
              accessibilityLabel={`Show your QR code for ${ticket.name}`}
            >
              <Text style={[styles.buyText, { color: accent.bg }]}>SHOW QR CODE</Text>
            </TouchableOpacity>
          ) : ticket.viewerCanBuy ? (
            <TouchableOpacity
              style={[styles.buy, { backgroundColor: accent.bg }, buy.isPending && styles.buyBusy]}
              onPress={() => handleBuy(ticket.ticketTypeId)}
              disabled={buy.isPending}
              activeOpacity={0.8}
              accessibilityLabel={`Buy ${ticket.name}`}
            >
              {buyingId === ticket.ticketTypeId ? (
                <ActivityIndicator color={accent.fg} />
              ) : (
                <Text style={[styles.buyText, { color: accent.fg }]}>BUY</Text>
              )}
            </TouchableOpacity>
          ) : null}
        </View>
      ))}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TicketQrModal ticket={shownTicket} onClose={() => setShownTicket(null)} />
    </View>
  );
}
