import { Platform } from "react-native";
import { useMutation } from "@tanstack/react-query";
import { saveTextFile } from "@/lib/shared/saveFile";
import { waiversToCsv, waiverToHtml } from "@/lib/tickets/waiverExport";
import { exportStoreWaivers, fetchStoreWaiver } from "@/lib/tickets/waiverExportQueries";
import { TicketsError } from "@/lib/tickets/types";

type Vars =
  // A CSV of every waiver held between two dates (null: no limit).
  | { kind: "csv"; from: string | null; to: string | null }
  // A printable page for one waiver.
  | { kind: "print"; ticketId: string; storeName: string };

function slug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "waiver";
}

// Fills a window opened for printing and opens its print dialog (web).
function printHtmlOnWeb(win: Window, html: string) {
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
}

// The store keeps its own copies: a CSV for its records, or one waiver as
// a page to print or save as a PDF.
export function useWaiverExport() {
  return useMutation({
    mutationFn: async (vars: Vars) => {
      const today = new Date().toISOString().slice(0, 10);
      if (vars.kind === "csv") {
        const records = await exportStoreWaivers(vars.from, vars.to);
        if (records.length === 0) throw new TicketsError("UNKNOWN", "No signed waivers in that range.");
        await saveTextFile({
          fileName: `skatemeet-waivers-${today}.csv`,
          content: waiversToCsv(records),
          mimeType: "text/csv",
          dialogTitle: "Signed waivers",
        });
        return;
      }
      // On web the window opens before anything is awaited: browsers block
      // pop-ups that don't come straight from the tap.
      const win = Platform.OS === "web" ? window.open("", "_blank") : null;
      if (Platform.OS === "web" && !win) {
        throw new TicketsError("UNKNOWN", "Allow pop-ups for SkateMeet to print waivers.");
      }
      const record = await fetchStoreWaiver(vars.ticketId).catch((err) => {
        win?.close();
        throw err;
      });
      if (!record) {
        win?.close();
        throw new TicketsError("UNKNOWN", "That waiver has been deleted.");
      }
      const html = waiverToHtml(record, vars.storeName);
      if (win) {
        printHtmlOnWeb(win, html);
        return;
      }
      await saveTextFile({
        fileName: `waiver-${slug(record.fullName)}-${record.signedAt.slice(0, 10)}.html`,
        content: html,
        mimeType: "text/html",
        dialogTitle: "Signed waiver",
      });
    },
  });
}
