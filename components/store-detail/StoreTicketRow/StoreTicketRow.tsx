import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import type { TapeColors } from "@/lib/shared/tapeLabels";
import { formatTicketPrice, ticketValidityLabel, type MyTicket, type StoreTicketType } from "@/lib/tickets/types";
import { styles } from "./StoreTicketRow.styles";

type Props = {
  ticket: StoreTicketType;
  // The skater's own valid ticket of this type: Show QR code instead of Buy.
  held: MyTicket | null;
  isBuying: boolean;
  // Another purchase is starting: every Buy waits.
  buyDisabled: boolean;
  accent: TapeColors;
  onBuy: () => void;
  onShowQr: (held: MyTicket) => void;
};

// One ticket or pass on a store page, with its Buy (or Show QR code) button.
export function StoreTicketRow({ ticket, held, isBuying, buyDisabled, accent, onBuy, onShowQr }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.text}>
        <Text style={styles.name}>{ticket.name}</Text>
        <Text style={styles.detail}>{ticketValidityLabel(ticket)}</Text>
        {ticket.description ? <Text style={styles.description}>{ticket.description}</Text> : null}
        <Text style={[styles.price, { color: accent.bg }]}>{formatTicketPrice(ticket.priceMinor, ticket.currency)}</Text>
      </View>
      {held ? (
        <TouchableOpacity
          style={[styles.buy, styles.view, { borderColor: accent.bg }]}
          onPress={() => onShowQr(held)}
          activeOpacity={0.8}
          accessibilityLabel={`Show your QR code for ${ticket.name}`}
        >
          <Text style={[styles.buyText, { color: accent.bg }]}>SHOW QR CODE</Text>
        </TouchableOpacity>
      ) : ticket.viewerCanBuy ? (
        <TouchableOpacity
          style={[styles.buy, { backgroundColor: accent.bg }, buyDisabled && styles.buyBusy]}
          onPress={onBuy}
          disabled={buyDisabled}
          activeOpacity={0.8}
          accessibilityLabel={`Buy ${ticket.name}`}
        >
          {isBuying ? (
            <ActivityIndicator color={accent.fg} />
          ) : (
            <Text style={[styles.buyText, { color: accent.fg }]}>BUY</Text>
          )}
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
