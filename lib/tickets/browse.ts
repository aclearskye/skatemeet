import { WEEKDAYS, type TicketType } from "./types";

// Browsing a store's tickets on its page: sessions by day of the week,
// passes on their own. Pure helpers, no I/O.

export type TicketTab = "tickets" | "passes";

// Monday first, as the week reads in the UK. Values are JS getDay()
// numbers (0 = Sunday), the same as ticket_types.weekday.
export const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

export function dayShortLabel(weekday: number): string {
  return WEEKDAYS[weekday].slice(0, 3).toUpperCase();
}

// "TICKETS & PASSES", "TICKETS" or "PASSES", for what's on sale.
export function ticketSectionLabel(hasSessions: boolean, hasPasses: boolean): string {
  if (hasSessions && hasPasses) return "TICKETS & PASSES";
  return hasPasses ? "PASSES" : "TICKETS";
}

// The day the filter starts on: today if there's a session today,
// otherwise the next day of the week that has one.
export function startingDay(sessions: Pick<TicketType, "weekday">[], today: Date = new Date()): number {
  const days = new Set(sessions.map((s) => s.weekday));
  for (let offset = 0; offset < 7; offset += 1) {
    const day = (today.getDay() + offset) % 7;
    if (days.has(day)) return day;
  }
  return today.getDay();
}
