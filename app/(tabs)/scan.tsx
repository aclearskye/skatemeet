import { TicketScanner } from "@/components/tickets/TicketScanner";

// The till scanner as a bottom tab, for approved stores only: in the bar by
// default when the store's page puts tickets first, or when picked in
// Settings, Customise navigation (lib/navigation/types.ts).
export default function ScanTab() {
  return <TicketScanner inTab />;
}
