import { supabase } from "@/lib/supabaseClient";
import type { SpotChatReportDetail, SpotChatReportItem, SpotChatReportSource } from "./types";

type SpotChatReportRow = {
  report_id: string;
  source: SpotChatReportSource;
  message_id: string | null;
  message_held: boolean;
  spot_name: string;
  sender_id: string;
  sender_username: string;
  sender_display_name: string | null;
  sender_banned: boolean;
  reason: string;
  details: string | null;
  hit_count: number;
  is_urgent: boolean;
  created_at: string;
  last_hit_at: string;
};

export async function fetchSpotChatReports(): Promise<SpotChatReportItem[]> {
  const { data, error } = await supabase.rpc("admin_list_spot_chat_reports");
  if (error) throw error;

  return (data as SpotChatReportRow[]).map((row) => ({
    reportId: row.report_id,
    source: row.source,
    messageId: row.message_id,
    messageHeld: row.message_held,
    spotName: row.spot_name,
    senderId: row.sender_id,
    senderUsername: row.sender_username,
    senderDisplayName: row.sender_display_name,
    senderBanned: row.sender_banned,
    reason: row.reason,
    details: row.details,
    hitCount: row.hit_count,
    isUrgent: row.is_urgent,
    createdAt: row.created_at,
    lastHitAt: row.last_hit_at,
  }));
}

type ContextRow = { sender_id: string; sender_username: string | null; body: string | null; created_at: string };

// Logged server-side (admin_audit_log 'spot_chat_report_viewed') -- the
// only way an admin can read the reported text.
export async function openSpotChatReport(reportId: string): Promise<SpotChatReportDetail> {
  const { data, error } = await supabase.rpc("admin_open_spot_chat_report", { p_report_id: reportId });
  if (error) throw error;

  const row = (data as { body_snapshot: string | null; context: ContextRow[] | null }[])[0];
  return {
    body: row?.body_snapshot ?? null,
    context: (row?.context ?? []).map((c) => ({
      senderId: c.sender_id,
      senderUsername: c.sender_username,
      body: c.body,
      createdAt: c.created_at,
    })),
  };
}
