import { supabase } from "@/lib/supabaseClient";
import { AdminError } from "./mutations";

function toAdminError(error: { message: string }): AdminError {
  if (error.message.includes("NOT_ADMIN")) return new AdminError("NOT_ADMIN");
  if (error.message.includes("REPORT_NOT_PENDING")) return new AdminError("REQUEST_NOT_PENDING");
  return new AdminError("UNKNOWN");
}

export async function dismissMessageReport(reportId: string): Promise<void> {
  const { error } = await supabase.rpc("admin_dismiss_message_report", { p_report_id: reportId });
  if (error) throw toAdminError(error);
}

// Deletes the message for everyone and resolves every open report on it.
export async function removeMessage(messageId: string): Promise<void> {
  const { error } = await supabase.rpc("admin_remove_message", { p_message_id: messageId });
  if (error) throw toAdminError(error);
}
