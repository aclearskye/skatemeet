import AsyncStorage from "@react-native-async-storage/async-storage";
import { isSearchLocation, type SearchLocation } from "@/lib/nearby/types";

// Per account, so a second account signed in on the same device doesn't
// inherit someone else's chosen city. Only stored on the device.
function storageKey(profileId: string): string {
  return `nearby_search_location:${profileId}`;
}

// Best-effort: a miss or a storage error just means "current location".
export async function getSavedSearchLocation(profileId: string): Promise<SearchLocation | null> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(profileId));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isSearchLocation(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function saveSearchLocation(profileId: string, location: SearchLocation): Promise<void> {
  try {
    await AsyncStorage.setItem(storageKey(profileId), JSON.stringify(location));
  } catch {
    // Not critical: the next launch just starts from current location.
  }
}
