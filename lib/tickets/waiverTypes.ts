// Store waivers (20261127120000_ticket_waivers.sql). A store writes its
// waiver text (each save a new version); a skater signs it before paying.

export type StoreWaiver = {
  version: number;
  body: string;
  updatedAt: string;
};

// The buyer's saved details for this store's current waiver version (only
// when they ticked "save my details" last time they signed it).
export type WaiverPrefill = {
  fullName: string;
  dateOfBirth: string;
  emergencyName: string;
  emergencyPhone: string;
};

// What a buyer sees before paying. Null from the server: no waiver needed.
export type TicketWaiverForm = {
  version: number;
  body: string;
  prefill: WaiverPrefill | null;
};

// Sent with the checkout request; snake_case because the server stores it
// as-is (_attach_ticket_waiver).
export type WaiverSignature = {
  version: number;
  full_name: string;
  date_of_birth: string;
  emergency_name: string;
  emergency_phone: string;
  signed_name: string;
  agreed: true;
  // Save the details (not the signature) for this store's next waiver.
  save_details: boolean;
};

// The signed waiver staff see at the scan.
export type ScanWaiver =
  | {
      signed: true;
      version: number;
      fullName: string;
      dateOfBirth: string;
      emergencyName: string;
      emergencyPhone: string;
      signedName: string;
      signedAt: string;
    }
  // required: the store has a waiver, so this skater should have signed one.
  | { signed: false; required: boolean };

export const MIN_WAIVER_LENGTH = 20;
export const MAX_WAIVER_LENGTH = 20000;

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
export const PHONE_REGEX = /^\+?[0-9 ()-]{6,30}$/;

// A real calendar date in the past, as YYYY-MM-DD.
export function isValidBirthDate(value: string): boolean {
  if (!DATE_REGEX.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) return false;
  return value > "1900-01-01" && date.getTime() < Date.now();
}

// Whole years old today, for staff.
export function ageFrom(dateOfBirth: string, today: Date = new Date()): number {
  const [y, m, d] = dateOfBirth.split("-").map(Number);
  let age = today.getFullYear() - y;
  if (today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < d)) age -= 1;
  return age;
}
