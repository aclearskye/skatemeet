import { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import type { TapeColors } from "@/lib/shared/tapeLabels";
import { useBuyTicket } from "@/lib/tickets/hooks/useBuyTicket";
import { useMyTickets } from "@/lib/tickets/hooks/useMyTickets";
import { useStoreTickets } from "@/lib/tickets/hooks/useStoreTickets";
import { useTicketWaiverForm } from "@/lib/tickets/hooks/useTicketWaiverForm";
import { DAY_ORDER, dayShortLabel, startingDay, ticketSectionLabel, type TicketTab } from "@/lib/tickets/browse";
import { isTicketUsable, TicketsError, WEEKDAYS, type MyTicket, type StoreTicketType } from "@/lib/tickets/types";
import type { WaiverSignature } from "@/lib/tickets/waiverTypes";
import { StoreTicketRow } from "@/components/store-detail/StoreTicketRow";
import { TicketQrModal } from "@/components/tickets/TicketQrModal";
import { WaiverSheet } from "@/components/tickets/WaiverSheet";
import { styles } from "./StoreTicketsSection.styles";

type Props = {
  storeOwnerId: string;
  // Shown on the waiver sheet.
  storeName: string;
  // The page's accent colour, for the Buy buttons and prices.
  accent: TapeColors;
};

const BLOCKED_MESSAGES = {
  store: "This store isn't selling tickets through SkateMeet right now.",
  account: "Your account can't buy tickets here.",
};

// A store's entry tickets on its page: sessions picked by day of the week,
// and passes, under Tickets / Passes tabs when it sells both. Paid on a
// Stripe page run on the store's own account. Renders nothing when the
// store sells no tickets.
export function StoreTicketsSection({ storeOwnerId, storeName, accent }: Props) {
  const { data: tickets } = useStoreTickets(storeOwnerId);
  const { data: myTickets = [] } = useMyTickets();
  const buy = useBuyTicket();
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shownTicket, setShownTicket] = useState<MyTicket | null>(null);
  // The ticket being signed for, while the waiver sheet is open.
  const [signingFor, setSigningFor] = useState<StoreTicketType | null>(null);
  // Tickets or passes, and the day picked (null: today, or the next day
  // with a session).
  const [tab, setTab] = useState<TicketTab>("tickets");
  const [day, setDay] = useState<number | null>(null);
  const waiverForm = useTicketWaiverForm(storeOwnerId, tickets != null);

  if (!tickets) return null;

  // The newest ticket the skater can still get in with, per ticket type.
  // My tickets is newest first, so the first match wins.
  const heldByType = new Map<string, MyTicket>();
  for (const ticket of myTickets) {
    if (ticket.ticketTypeId && isTicketUsable(ticket) && !heldByType.has(ticket.ticketTypeId)) {
      heldByType.set(ticket.ticketTypeId, ticket);
    }
  }

  const checkout = (ticketTypeId: string, waiver: WaiverSignature | null) => {
    setError(null);
    setBuyingId(ticketTypeId);
    buy.mutate(
      { ticketTypeId, waiver },
      {
        onError: (err) => {
          setError(err instanceof TicketsError ? err.message : "Couldn't start the payment. Try again.");
          // The store changed its waiver mid-purchase: load the new one.
          if (err instanceof TicketsError && err.code === "WAIVER_CHANGED") waiverForm.refetch();
        },
        onSettled: () => {
          setBuyingId(null);
          // Saved (or cleared) details for this store's waiver.
          if (waiver) waiverForm.refetch();
        },
      }
    );
  };

  // Signed: close the sheet and pay. The null check stays inside the
  // handler: React Compiler reads a callback's dependencies during render,
  // so a non-null assertion here would crash while no sheet is open.
  const submitWaiver = (signature: WaiverSignature) => {
    if (!signingFor) return;
    const { ticketTypeId } = signingFor;
    setSigningFor(null);
    checkout(ticketTypeId, signature);
  };

  // A store with a waiver gets it signed first; otherwise straight to paying.
  const handleBuy = (ticket: StoreTicketType) => {
    if (waiverForm.data) setSigningFor(ticket);
    else checkout(ticket.ticketTypeId, null);
  };

  const sessions = tickets.ticketTypes.filter((t) => t.kind === "session");
  const passes = tickets.ticketTypes.filter((t) => t.kind === "pass");
  const hasBoth = sessions.length > 0 && passes.length > 0;
  const activeTab: TicketTab = hasBoth ? tab : sessions.length > 0 ? "tickets" : "passes";
  const activeDay = day ?? startingDay(sessions);
  const sessionDays = new Set(sessions.map((t) => t.weekday));
  const shown = activeTab === "passes" ? passes : sessions.filter((t) => t.weekday === activeDay);

  return (
    <View style={styles.section}>
      <Text style={styles.label}>{ticketSectionLabel(sessions.length > 0, passes.length > 0)}</Text>
      {tickets.blockedReason ? <Text style={styles.notice}>{BLOCKED_MESSAGES[tickets.blockedReason]}</Text> : null}

      {hasBoth ? (
        <View style={styles.tabs} accessibilityRole="tablist">
          {(["tickets", "passes"] as const).map((key) => {
            const selected = activeTab === key;
            return (
              <TouchableOpacity
                key={key}
                style={[styles.tab, selected && { backgroundColor: accent.bg, borderColor: accent.bg }]}
                onPress={() => setTab(key)}
                activeOpacity={0.8}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
              >
                <Text style={[styles.tabText, selected && { color: accent.fg }]}>{key.toUpperCase()}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : null}

      {activeTab === "tickets" ? (
        <View style={styles.days} accessibilityRole="tablist">
          {DAY_ORDER.map((weekday) => {
            const has = sessionDays.has(weekday);
            const selected = activeDay === weekday;
            return (
              <TouchableOpacity
                key={weekday}
                style={[
                  styles.day,
                  selected && { backgroundColor: accent.bg, borderColor: accent.bg },
                  !has && styles.dayEmpty,
                ]}
                onPress={() => setDay(weekday)}
                disabled={!has}
                activeOpacity={0.8}
                accessibilityRole="tab"
                accessibilityState={{ selected, disabled: !has }}
                accessibilityLabel={has ? WEEKDAYS[weekday] : `${WEEKDAYS[weekday]}, no sessions`}
              >
                <Text style={[styles.dayText, selected && { color: accent.fg }]}>{dayShortLabel(weekday)}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : null}

      {shown.map((ticket) => (
        <StoreTicketRow
          key={ticket.ticketTypeId}
          ticket={ticket}
          held={heldByType.get(ticket.ticketTypeId) ?? null}
          isBuying={buyingId === ticket.ticketTypeId}
          buyDisabled={buy.isPending}
          accent={accent}
          onBuy={() => handleBuy(ticket)}
          onShowQr={setShownTicket}
        />
      ))}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TicketQrModal ticket={shownTicket} onClose={() => setShownTicket(null)} />
      <WaiverSheet
        form={signingFor ? (waiverForm.data ?? null) : null}
        storeName={storeName}
        ticketName={signingFor?.name ?? ""}
        accent={accent}
        isBusy={buy.isPending}
        error={null}
        onSubmit={submitWaiver}
        onClose={() => setSigningFor(null)}
      />
    </View>
  );
}
