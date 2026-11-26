// The store's copy of its signed waivers (20261129120000_waiver_export.sql):
// a CSV of many, or a printable page for one. Pure: no I/O here.

export type StoreWaiverRecord = {
  ticketId: string;
  signedAt: string;
  fullName: string;
  dateOfBirth: string;
  emergencyName: string;
  emergencyPhone: string;
  signedName: string;
  waiverVersion: number;
  // Only in exports and the single-waiver view, not the list.
  waiverText: string | null;
  ticketName: string;
  ticketStatus: string;
  accountName: string | null;
  under18: boolean;
};

export type StoreWaiverRow = {
  ticket_id: string;
  signed_at: string;
  full_name: string;
  date_of_birth: string;
  emergency_name: string;
  emergency_phone: string;
  signed_name: string;
  waiver_version: number;
  waiver_text: string | null;
  ticket_name: string;
  ticket_status: string;
  account_name: string | null;
  under_18: boolean;
};

export function toStoreWaiverRecord(row: StoreWaiverRow): StoreWaiverRecord {
  return {
    ticketId: row.ticket_id,
    signedAt: row.signed_at,
    fullName: row.full_name,
    dateOfBirth: row.date_of_birth,
    emergencyName: row.emergency_name,
    emergencyPhone: row.emergency_phone,
    signedName: row.signed_name,
    waiverVersion: row.waiver_version,
    waiverText: row.waiver_text,
    ticketName: row.ticket_name,
    ticketStatus: row.ticket_status,
    accountName: row.account_name,
    under18: row.under_18,
  };
}

// RFC 4180: quote every field, double any quotes. A leading =, +, - or @
// is prefixed with ' so a spreadsheet never runs it as a formula.
function csvField(value: string | number | boolean | null): string {
  let text = value == null ? "" : String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

const CSV_COLUMNS: [string, (r: StoreWaiverRecord) => string | number | boolean | null][] = [
  ["Signed at (UTC)", (r) => r.signedAt],
  ["Full name", (r) => r.fullName],
  ["Date of birth", (r) => r.dateOfBirth],
  ["Under 18", (r) => (r.under18 ? "Yes" : "No")],
  ["Emergency contact", (r) => r.emergencyName],
  ["Emergency phone", (r) => r.emergencyPhone],
  ["Signed as", (r) => r.signedName],
  ["Ticket", (r) => r.ticketName],
  ["Ticket status", (r) => r.ticketStatus],
  ["SkateMeet account", (r) => r.accountName],
  ["Waiver version", (r) => r.waiverVersion],
  ["Waiver text", (r) => r.waiverText],
  ["Ticket ID", (r) => r.ticketId],
];

export function waiversToCsv(records: StoreWaiverRecord[]): string {
  const header = CSV_COLUMNS.map(([name]) => csvField(name)).join(",");
  const rows = records.map((record) => CSV_COLUMNS.map(([, get]) => csvField(get(record))).join(","));
  // CRLF and a BOM so Excel reads it as UTF-8.
  return `﻿${[header, ...rows].join("\r\n")}\r\n`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// A self-contained page for one signed waiver: print it, or save it as a
// PDF from the browser or share sheet.
export function waiverToHtml(record: StoreWaiverRecord, storeName: string): string {
  const signed = new Date(record.signedAt).toLocaleString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const rows: [string, string][] = [
    ["Full name", record.fullName],
    ["Date of birth", `${record.dateOfBirth}${record.under18 ? " (under 18)" : ""}`],
    ["Emergency contact", `${record.emergencyName}, ${record.emergencyPhone}`],
    ["Ticket", record.ticketName],
    ["Signed", signed],
    ["Signature (typed)", record.signedName],
    ["Waiver version", String(record.waiverVersion)],
    ["Ticket ID", record.ticketId],
  ];
  const table = rows.map(([k, v]) => `<tr><th>${escapeHtml(k)}</th><td>${escapeHtml(v)}</td></tr>`).join("");
  const text = escapeHtml(record.waiverText ?? "").replace(/\n/g, "<br>");
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(`Waiver: ${record.fullName}`)}</title>
<style>
body{font-family:-apple-system,Helvetica,Arial,sans-serif;color:#111;margin:32px;line-height:1.5}
h1{font-size:20px;margin:0 0 4px}p.sub{color:#555;margin:0 0 24px}
table{border-collapse:collapse;width:100%;margin-bottom:24px}th,td{text-align:left;padding:6px 8px;border-bottom:1px solid #ddd;vertical-align:top}
th{width:34%;color:#555;font-weight:600}.text{border:1px solid #ddd;padding:16px;font-size:14px}
footer{margin-top:24px;color:#777;font-size:12px}
</style></head><body>
<h1>${escapeHtml(storeName)}: signed waiver</h1>
<p class="sub">Signed in SkateMeet by ticking "I agree" and typing a full name.</p>
<table>${table}</table>
<h2 style="font-size:16px">Waiver text (version ${record.waiverVersion})</h2>
<div class="text">${text}</div>
<footer>Exported ${escapeHtml(new Date().toLocaleString())}.</footer>
</body></html>`;
}
