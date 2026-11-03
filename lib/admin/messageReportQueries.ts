import { supabase } from "@/lib/supabaseClient";
import type { MessageReportDetail, MessageReportItem } from "./types";

type MessageReportRow = {
  report_id: string;
  message_id: string | null;
  sender_id: string;
  sender_username: string;
  sender_banned: boolean;
  reason: string;
  details: string | null;
  created_at: string;
};

export async function fetchMessageReports(): Promise<MessageReportItem[]> {
  const { data, error } = await supabase.rpc("admin_list_message_reports");
  if (error) throw error;

  return (data as MessageReportRow[]).map((row) => ({
    reportId: row.report_id,
    messageId: row.message_id,
    senderId: row.sender_id,
    senderUsername: row.sender_username,
    senderBanned: row.sender_banned,
    reason: row.reason,
    details: row.details,
    createdAt: row.created_at,
  }));
}

type ContextRow = { sender_id: string; body: string | null; created_at: string };

// Logged server-side (admin_audit_log 'message_report_viewed') -- the only
// way an admin can read reported message content.
export async function openMessageReport(reportId: string): Promise<MessageReportDetail> {
  const { data, error } = await supabase.rpc("admin_log_message_report_view", { p_report_id: reportId });
  if (error) throw error;

  const row = (data as { body_snapshot: string | null; context_snapshot: ContextRow[] | null }[])[0];
  return {
    body: row?.body_snapshot ?? null,
    context: (row?.context_snapshot ?? []).map((c) => ({
      senderId: c.sender_id,
      body: c.body,
      createdAt: c.created_at,
    })),
  };
}
