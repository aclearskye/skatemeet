import AsyncStorage from "@react-native-async-storage/async-storage";

const LAST_LOCATION_KEY = "map_last_known_location";

export type CachedLocation = { latitude: number; longitude: number };

// Best-effort — a miss or a storage error just means the caller falls back
// to waiting for a fresh GPS fix like before, so failures are swallowed.
export async function getCachedLocation(): Promise<CachedLocation | null> {
  try {
    const raw = await AsyncStorage.getItem(LAST_LOCATION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.latitude !== "number" || typeof parsed?.longitude !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function setCachedLocation(location: CachedLocation): Promise<void> {
  try {
    await AsyncStorage.setItem(LAST_LOCATION_KEY, JSON.stringify(location));
  } catch {
    // Not critical — worst case, the next launch just starts without a hint.
  }
}
