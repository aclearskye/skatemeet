import type { TicketKind } from "./types";
import type { ScanWaiver } from "./waiverTypes";

// Entry scanning and the check-in list (redeem_ticket, get_store_checkins,
// 20261126120000_ticket_checkins.sql).

export type ScanOutcome = "admitted" | "already_checked_in" | "refused";

export type ScanRefusal =
  | "NOT_FOUND"
  | "WRONG_STORE"
  | "NOT_PAID"
  | "REFUNDED"
  | "ALREADY_USED"
  | "WRONG_DAY"
  | "NOT_YET_VALID"
  | "PASS_ENDED"
  // Client-side: the code isn't a SkateMeet ticket at all.
  | "NOT_A_TICKET";

// What staff see about the skater. An under-18 has no username here.
export type CheckinSkater = {
  displayName: string;
  avatarUrl: string | null;
  username: string | null;
  under18: boolean;
};

export type ScannedTicket = {
  name: string;
  kind: TicketKind;
  weekday: number | null;
  startTime: string | null;
  endTime: string | null;
  validFrom: string | null;
  validTo: string | null;
};

export type ScanResult = {
  outcome: ScanOutcome;
  reason: ScanRefusal | null;
  // Missing for NOT_FOUND, WRONG_STORE and NOT_A_TICKET.
  ticket: ScannedTicket | null;
  skater: CheckinSkater | null;
  // The signed waiver, or whether one was needed. Missing like ticket.
  waiver: ScanWaiver | null;
  // When they got in (admitted), first got in today, or used the ticket.
  checkedInAt: string | null;
};

export type StoreCheckin = {
  checkinId: string;
  checkedInAt: string;
  ticketName: string;
  ticketKind: TicketKind;
  skater: CheckinSkater;
};

// The QR code holds "skatemeet:ticket:<token>" (components/tickets/TicketCard).
const QR_PREFIX = "skatemeet:ticket:";
const TOKEN_PATTERN = /^[0-9a-f]{48}$/;

// The ticket token in a scanned code, or null when it isn't a SkateMeet ticket.
export function parseTicketQr(data: string): string | null {
  const value = data.trim();
  if (!value.startsWith(QR_PREFIX)) return null;
  const token = value.slice(QR_PREFIX.length);
  return TOKEN_PATTERN.test(token) ? token : null;
}

export function formatClockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

// The headline staff read at a glance.
export function scanHeadline(result: ScanResult): string {
  if (result.outcome === "admitted") return "LET THEM IN";
  if (result.outcome === "already_checked_in") return "ALREADY IN TODAY";
  return "DON'T LET IN";
}

// One line explaining the result.
export function scanDetail(result: ScanResult): string {
  const at = result.checkedInAt ? formatClockTime(result.checkedInAt) : null;
  if (result.outcome === "admitted") return at ? `Checked in at ${at}.` : "Checked in.";
  if (result.outcome === "already_checked_in") {
    return at ? `This pass already checked in today at ${at}.` : "This pass already checked in today.";
  }
  switch (result.reason) {
    case "NOT_A_TICKET":
      return "That code isn't a SkateMeet ticket.";
    case "NOT_FOUND":
      return "No valid ticket matches this code. It may have been refunded.";
    case "WRONG_STORE":
      return "This ticket is for a different venue.";
    case "NOT_PAID":
      return "This ticket hasn't been paid for.";
    case "REFUNDED":
      return "This ticket was refunded.";
    case "ALREADY_USED": {
      const day = result.checkedInAt
        ? new Date(result.checkedInAt).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })
        : null;
      return day && at ? `This ticket was already used on ${day} at ${at}.` : "This ticket was already used.";
    }
    case "WRONG_DAY":
      return "This session ticket isn't for today.";
    case "NOT_YET_VALID":
      return "This pass hasn't started yet.";
    case "PASS_ENDED":
      return "This pass has ended.";
    default:
      return "This ticket can't be used.";
  }
}
