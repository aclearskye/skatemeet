import { Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { C } from "@/lib/theme";
import { formatTicketPrice, isTicketExpired, ticketValidityLabel, type MyTicket } from "@/lib/tickets/types";
import { styles } from "./TicketCard.styles";

type Props = {
  ticket: MyTicket;
};

const QR_SIZE = 200;

// Entry scanning reads this prefix to know it's a SkateMeet ticket.
function qrValue(token: string): string {
  return `skatemeet:ticket:${token}`;
}

// A bought ticket. The QR code is what staff scan at the till.
export function TicketCard({ ticket }: Props) {
  const expired = isTicketExpired(ticket);
  const refunded = ticket.status === "refunded";
  const showQr = ticket.qrToken != null && !expired && !refunded;
  const status = refunded ? "REFUNDED" : expired ? "ENDED" : null;

  return (
    <View style={[styles.card, !showQr && styles.inactive]}>
      <Text style={styles.store}>{ticket.storeName.toUpperCase()}</Text>
      <Text style={styles.name}>{ticket.name}</Text>
      <Text style={styles.detail}>
        {ticket.kind === "session" ? "One entry · " : "Pass · "}
        {ticketValidityLabel(ticket)}
      </Text>
      <Text style={styles.price}>{formatTicketPrice(ticket.priceMinor, ticket.currency)}</Text>

      {showQr ? (
        <>
          <View style={styles.qr}>
            <QRCode value={qrValue(ticket.qrToken!)} size={QR_SIZE} color={C.inverseText} backgroundColor={C.text} />
          </View>
          <Text style={styles.hint}>Show this at the till to get in.</Text>
        </>
      ) : status ? (
        <Text style={styles.status}>{status}</Text>
      ) : null}
    </View>
  );
}
