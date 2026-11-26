import { Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { formatClockTime } from "@/lib/tickets/scanTypes";
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

function isToday(iso: string): boolean {
  return new Date(iso).toDateString() === new Date().toDateString();
}

function formatUsedAt(iso: string): string {
  const day = new Date(iso).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
  return `${day.toUpperCase()}, ${formatClockTime(iso)}`;
}

// A bought ticket. The QR code is what staff scan at the till.
export function TicketCard({ ticket }: Props) {
  const expired = isTicketExpired(ticket);
  const refunded = ticket.status === "refunded";
  const used = ticket.status === "used";
  const swapped = ticket.status === "swapped";
  const showQr = ticket.qrToken != null && !expired && !refunded && !used && !swapped;
  const status = refunded
    ? "REFUNDED"
    : swapped
      ? `SWAPPED${ticket.request?.swapName ? ` FOR ${ticket.request?.swapName?.toUpperCase()}` : ""}`
      : used
        ? `USED${ticket.usedAt ? ` · ${formatUsedAt(ticket.usedAt)}` : ""}`
        : expired
          ? "ENDED"
          : null;
  // A pass checks in once a day; tell the skater they're already in.
  const inToday = ticket.lastCheckedInAt != null && isToday(ticket.lastCheckedInAt);

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
          <Text style={styles.hint}>
            {inToday && ticket.lastCheckedInAt
              ? `Checked in today at ${formatClockTime(ticket.lastCheckedInAt)}.`
              : "Show this at the till to get in."}
          </Text>
        </>
      ) : status ? (
        <Text style={styles.status}>{status}</Text>
      ) : null}
    </View>
  );
}
