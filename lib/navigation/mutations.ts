import AsyncStorage from "@react-native-async-storage/async-storage";
import { tabShortcutsStorageKey } from "./queries";
import type { TabShortcutKey } from "./types";

// Saves the picked tabs; null goes back to the default bar.
export async function saveTabShortcuts(profileId: string, keys: TabShortcutKey[] | null): Promise<void> {
  const storageKey = tabShortcutsStorageKey(profileId);
  if (keys == null) await AsyncStorage.removeItem(storageKey);
  else await AsyncStorage.setItem(storageKey, JSON.stringify(keys));
}
