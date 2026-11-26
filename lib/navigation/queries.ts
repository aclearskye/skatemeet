import AsyncStorage from "@react-native-async-storage/async-storage";
import { isTabShortcutKey, type TabShortcutKey } from "./types";

// Saved on the device, per account: it's a display preference.
export function tabShortcutsStorageKey(profileId: string): string {
  return `skatemeet.tabShortcuts.${profileId}`;
}

// The user's picked tabs, or null when they haven't customised the bar.
export async function fetchTabShortcuts(profileId: string): Promise<TabShortcutKey[] | null> {
  try {
    const raw = await AsyncStorage.getItem(tabShortcutsStorageKey(profileId));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isTabShortcutKey) : null;
  } catch {
    return null;
  }
}
