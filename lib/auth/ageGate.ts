import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Raised from 16 (the GDPR Art. 8 consent ceiling) to 18 ahead of user
// media posts, so no minors are on the platform once uploads open. Existing
// accounts are re-gated by supabase/pending_migrations/age_gate_18_reset_confirmations.sql.
export const MIN_AGE = 18;

// user_bans.reason written by record_underage_self_report() when an
// existing account fails the re-check; app/banned.tsx keys its copy off it.
export const UNDERAGE_BAN_REASON = "underage";

// Underage attempts are remembered on this device only -- nothing goes to
// the server -- long enough to stop an instant retry with a different year.
const UNDERAGE_LOCK_MS = 24 * 60 * 60 * 1000;

const UNDERAGE_KEY = "age_gate_underage_at";
// Set when the gate passes during sign-up, before any profile row exists;
// onboarding consumes it to stamp age_confirmed_at so a new account isn't
// asked twice.
const PASSED_KEY = "age_gate_passed";

// SecureStore has no web implementation.
async function getItem(key: string): Promise<string | null> {
  return Platform.OS === "web" ? AsyncStorage.getItem(key) : SecureStore.getItemAsync(key);
}

async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") await AsyncStorage.setItem(key, value);
  else await SecureStore.setItemAsync(key, value);
}

async function removeItem(key: string): Promise<void> {
  if (Platform.OS === "web") await AsyncStorage.removeItem(key);
  else await SecureStore.deleteItemAsync(key);
}

export type DateOfBirth = { day: string; month: string; year: string };

// null when the parts don't form a real, past date.
export function ageFromDateOfBirth({ day, month, year }: DateOfBirth, now = new Date()): number | null {
  const d = Number(day);
  const m = Number(month);
  const y = Number(year);
  if (!Number.isInteger(d) || !Number.isInteger(m) || !Number.isInteger(y) || y < 1900) return null;

  const dob = new Date(y, m - 1, d);
  if (dob.getFullYear() !== y || dob.getMonth() !== m - 1 || dob.getDate() !== d || dob > now) return null;

  let age = now.getFullYear() - y;
  const hadBirthday = now.getMonth() > m - 1 || (now.getMonth() === m - 1 && now.getDate() >= d);
  if (!hadBirthday) age -= 1;
  return age;
}

export async function isUnderageLocked(): Promise<boolean> {
  try {
    const at = await getItem(UNDERAGE_KEY);
    return at != null && Date.now() - Number(at) < UNDERAGE_LOCK_MS;
  } catch {
    return false;
  }
}

export async function recordUnderageAttempt(): Promise<void> {
  try {
    await setItem(UNDERAGE_KEY, String(Date.now()));
  } catch {
    // Best effort -- the gate itself still refuses this attempt.
  }
}

export async function recordAgePassedOnDevice(): Promise<void> {
  try {
    await setItem(PASSED_KEY, "1");
  } catch {
    // Best effort -- the one-time age screen catches it after onboarding.
  }
}

// True once, then cleared.
export async function consumeAgePassedOnDevice(): Promise<boolean> {
  try {
    const passed = (await getItem(PASSED_KEY)) === "1";
    if (passed) await removeItem(PASSED_KEY);
    return passed;
  } catch {
    return false;
  }
}
