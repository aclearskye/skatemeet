import AsyncStorage from "@react-native-async-storage/async-storage";
import { DEV_SETTINGS_STORAGE_KEY, DevAccountSettings, parseDevSettings } from "@/lib/devTools/types";

// Device-local only: the shared password and hand-added logins never leave
// this device's storage.
export async function loadDevSettings(): Promise<DevAccountSettings> {
  return parseDevSettings(await AsyncStorage.getItem(DEV_SETTINGS_STORAGE_KEY));
}
