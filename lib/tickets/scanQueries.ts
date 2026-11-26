import { supabase } from "@/lib/supabaseClient";
import type { CheckinSkater, ScanOutcome, ScanRefusal, ScanResult, ScannedTicket, StoreCheckin } from "./scanTypes";
import { toTicketsError, type TicketKind } from "./types";
import { toScanWaiver, type ScanWaiverRow } from "./waiverQueries";

type SkaterRow = { display_name: string; avatar_url: string | null; username: string | null; under_18: boolean };

export function toCheckinSkater(row: SkaterRow): CheckinSkater {
  return { displayName: row.display_name, avatarUrl: row.avatar_url, username: row.username, under18: row.under_18 };
}

type ScannedTicketRow = {
  name: string;
  kind: TicketKind;
  weekday: number | null;
  start_time: string | null;
  end_time: string | null;
  valid_from: string | null;
  valid_to: string | null;
};

export type ScanResultRow = {
  result: ScanOutcome;
  reason?: ScanRefusal | null;
  ticket?: ScannedTicketRow;
  skater?: SkaterRow;
  waiver?: ScanWaiverRow;
  checked_in_at?: string | null;
};

export function toScanResult(row: ScanResultRow): ScanResult {
  const ticket: ScannedTicket | null = row.ticket
    ? {
        name: row.ticket.name,
        kind: row.ticket.kind,
        weekday: row.ticket.weekday,
        startTime: row.ticket.start_time,
        endTime: row.ticket.end_time,
        validFrom: row.ticket.valid_from,
        validTo: row.ticket.valid_to,
      }
    : null;
  return {
    outcome: row.result,
    reason: row.reason ?? null,
    ticket,
    skater: row.skater ? toCheckinSkater(row.skater) : null,
    waiver: row.waiver ? toScanWaiver(row.waiver) : null,
    checkedInAt: row.checked_in_at ?? null,
  };
}

type CheckinRow = {
  checkin_id: string;
  checked_in_at: string;
  ticket_name: string;
  ticket_kind: TicketKind;
  skater: SkaterRow;
};

export const CHECKIN_PAGE_SIZE = 50;

// The store's check-ins, newest first. before: the last row's time, for the
// next page.
export async function fetchStoreCheckins(search: string, todayOnly: boolean, before: string | null): Promise<StoreCheckin[]> {
  const { data, error } = await supabase.rpc("get_store_checkins", {
    p_search: search,
    p_today_only: todayOnly,
    p_before: before,
  });
  if (error) throw toTicketsError(error);
  return (data as CheckinRow[]).map((row) => ({
    checkinId: row.checkin_id,
    checkedInAt: row.checked_in_at,
    ticketName: row.ticket_name,
    ticketKind: row.ticket_kind,
    skater: toCheckinSkater(row.skater),
  }));
}
