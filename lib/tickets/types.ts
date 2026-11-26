// Store tickets (docs/ACCOUNT_TYPES.md, "Store", Tickets). A store sells
// entry through its own Stripe account (Connect). A SESSION is one entry on
// a weekday; a PASS is valid from one date to another.

export type TicketKind = "session" | "pass";

export type TicketType = {
  ticketTypeId: string;
  kind: TicketKind;
  name: string;
  description: string | null;
  priceMinor: number;
  currency: string;
  // Session only. 0 = Sunday ... 6 = Saturday.
  weekday: number | null;
  // "HH:MM", session only, both or neither.
  startTime: string | null;
  endTime: string | null;
  // "YYYY-MM-DD", pass only.
  validFrom: string | null;
  validTo: string | null;
  isActive: boolean;
};

// The store's own list (get_my_ticket_types).
export type OwnTicketType = TicketType & { soldCount: number };

// A ticket on a store page (get_store_tickets).
export type StoreTicketType = TicketType & { viewerCanBuy: boolean };

export type StoreTickets = {
  storeCanSell: boolean;
  // Why buying is off: the store isn't selling right now, or this account
  // can't buy here (a Store account, or a Child at a store without
  // under-18 sales).
  blockedReason: "store" | "account" | null;
  ticketTypes: StoreTicketType[];
};

export type MyTicketing = {
  chargesEnabled: boolean;
  detailsSubmitted: boolean;
  currency: string;
  allowUnder18: boolean;
  canSell: boolean;
};

export type MyTicket = {
  ticketId: string;
  // Null until the get_my_tickets migration that adds it is applied.
  ticketTypeId: string | null;
  status: "paid" | "refunded";
  name: string;
  kind: TicketKind;
  weekday: number | null;
  startTime: string | null;
  endTime: string | null;
  validFrom: string | null;
  validTo: string | null;
  priceMinor: number;
  currency: string;
  // What the QR code shows. Null once refunded.
  qrToken: string | null;
  paidAt: string;
  storeOwnerId: string;
  storeName: string;
  logoPath: string | null;
};

export type SaveTicketTypePayload = {
  ticketTypeId: string | null;
  kind: TicketKind;
  name: string;
  description: string;
  priceMinor: number;
  weekday: number | null;
  startTime: string | null;
  endTime: string | null;
  validFrom: string | null;
  validTo: string | null;
};

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function formatTicketPrice(priceMinor: number, currency: string): string {
  const amount = priceMinor / 100;
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

function formatDay(isoDate: string): string {
  // Dates are calendar days, so they're read as UTC to avoid a timezone
  // shifting them by one.
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

type Validity = Pick<TicketType, "kind" | "weekday" | "startTime" | "endTime" | "validFrom" | "validTo">;

// "Saturday, 14:00–21:00" or "1 Dec 2026 – 31 Dec 2026".
export function ticketValidityLabel(ticket: Validity): string {
  if (ticket.kind === "pass") {
    return ticket.validFrom && ticket.validTo ? `${formatDay(ticket.validFrom)} – ${formatDay(ticket.validTo)}` : "";
  }
  const day = ticket.weekday != null ? WEEKDAYS[ticket.weekday] : "";
  return ticket.startTime && ticket.endTime ? `${day}, ${ticket.startTime}–${ticket.endTime}` : day;
}

// A ticket the skater can still get in with: paid, has its QR code, and
// (for a pass) not past its last day.
export function isTicketUsable(ticket: MyTicket): boolean {
  return ticket.status === "paid" && ticket.qrToken != null && !isTicketExpired(ticket);
}

// A pass whose last day has gone. Session tickets don't expire: an unused
// one is good for a later session on the same weekday.
export function isTicketExpired(ticket: Validity, today: Date = new Date()): boolean {
  if (ticket.kind !== "pass" || !ticket.validTo) return false;
  const todayIso = today.toLocaleDateString("en-CA");
  return ticket.validTo < todayIso;
}

export class TicketsError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = "TicketsError";
  }
}

const ERROR_MESSAGES: Record<string, string> = {
  NOT_STORE_ACCOUNT: "Only a business account can sell tickets.",
  STORE_NOT_APPROVED: "Your store needs to be approved, and its subscription paid, to sell tickets.",
  TICKETING_NOT_CONNECTED: "Connect Stripe before adding tickets.",
  INVALID_TICKET: "Check the ticket details: name, price (at least 30p) and when it's valid.",
  TOO_MANY_TICKET_TYPES: "You've reached the limit of 50 tickets. Edit or reuse an existing one.",
  TICKET_TYPE_NOT_FOUND: "That ticket doesn't exist any more.",
  TICKET_NOT_ON_SALE: "That ticket isn't on sale any more.",
  STORE_NOT_SELLING: "This store isn't selling tickets through SkateMeet right now.",
  CANNOT_BUY_TICKET: "Your account can't buy this ticket.",
  ALREADY_HAS_TICKET: "You already have this ticket. Find it under Show QR code or My tickets.",
  TOO_MANY_PENDING: "You have several checkouts open. Finish or close one, then try again.",
  INVALID_RETURN_URL: "Something went wrong opening the payment page.",
  TICKETS_UNAVAILABLE: "Tickets aren't available right now. Try again in a minute.",
};

export function toTicketsError(error: { message?: string }): TicketsError {
  const raw = error.message ?? "";
  const code = Object.keys(ERROR_MESSAGES).find((key) => raw.includes(key));
  return code
    ? new TicketsError(code, ERROR_MESSAGES[code])
    : new TicketsError("UNKNOWN", "Something went wrong. Try again.");
}
