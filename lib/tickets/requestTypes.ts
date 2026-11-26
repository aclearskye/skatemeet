import type { CheckinSkater } from "./scanTypes";

// Refund and swap requests (20261128120000_ticket_requests.sql). A ticket
// unused 30 days after purchase can be put up for a refund or a swap for
// another ticket at the same store at the same price; the store
// approves or declines.

export type TicketRequestKind = "refund" | "swap";
export type TicketRequestStatus = "pending" | "approved" | "declined" | "cancelled";

// The latest request on one of the skater's tickets.
export type MyTicketRequest = {
  requestId: string;
  kind: TicketRequestKind;
  status: TicketRequestStatus;
  swapName: string | null;
  createdAt: string;
};

// An open request, as the store sees it.
export type StoreTicketRequest = {
  requestId: string;
  kind: TicketRequestKind;
  createdAt: string;
  ticketName: string;
  priceMinor: number;
  currency: string;
  paidAt: string;
  swapName: string | null;
  swapPriceMinor: number | null;
  skater: CheckinSkater;
};

export type ResolveRequestAction = "refund" | "swap" | "decline";

// What happened when the skater asked: done straight away (the store
// auto-approves), or waiting for the store. auto_refund is the server's
// "refund it now" signal, turned into refunded once Stripe has done it.
export type RequestOutcome = "swapped" | "refunded" | "auto_refund" | "pending";

export const REQUEST_AFTER_DAYS = 30;
