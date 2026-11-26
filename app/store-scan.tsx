import { TicketScanner } from "@/components/tickets/TicketScanner";

// The till scanner from the side drawer's Scan entry. Stores can also have
// it as a bottom tab (app/(tabs)/scan.tsx).
export default function StoreScanScreen() {
  return <TicketScanner inTab={false} />;
}
