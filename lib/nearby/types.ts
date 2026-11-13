import type { Coordinates } from "@/lib/map/types";

// Where nearby search looks: the device's own location, or a place the user
// picked (a city they skate in often, or one they're heading to).
export type SearchLocation =
  | { kind: "current" }
  | { kind: "custom"; label: string; coords: Coordinates };

// How the device's own location lookup went. A custom location is always
// "ready".
export type SearchLocationStatus = "locating" | "ready" | "denied" | "unavailable";

export type NearbySearchErrorCode = "RATE_LIMITED" | "NOT_ELIGIBLE" | "UNKNOWN";

const KNOWN_CODES: NearbySearchErrorCode[] = ["RATE_LIMITED", "NOT_ELIGIBLE"];

// search_nearby_skaters raises its codes as the exception message.
export function nearbySearchErrorCode(error: unknown): NearbySearchErrorCode {
  const message = typeof error === "object" && error != null && "message" in error ? String(error.message) : "";
  return KNOWN_CODES.find((code) => message.includes(code)) ?? "UNKNOWN";
}

// Rounds to ~1 km before anything is sent or cached. The server doesn't need
// the searcher's exact position, and GPS jitter shouldn't count as a new
// search point.
export function roundSearchCoords(coords: Coordinates): Coordinates {
  return { lat: Number(coords.lat.toFixed(2)), lng: Number(coords.lng.toFixed(2)) };
}

export function isSearchLocation(value: unknown): value is SearchLocation {
  if (typeof value !== "object" || value == null || !("kind" in value)) return false;
  if (value.kind === "current") return true;
  if (value.kind !== "custom" || !("label" in value) || !("coords" in value)) return false;
  const coords = value.coords as Partial<Coordinates> | null;
  return typeof value.label === "string" && typeof coords?.lat === "number" && typeof coords?.lng === "number";
}

// What the nearby list should show, worked out from the location lookup and
// the search query.
export type NearbyListStatus =
  | "locating"
  | "noLocation"
  | "loading"
  | "error"
  | "rateLimited"
  | "notEligible"
  | "empty"
  | "ready";

export function nearbyListStatus(input: {
  locationStatus: SearchLocationStatus;
  hasCoords: boolean;
  isLoading: boolean;
  errorCode: NearbySearchErrorCode | null;
  resultCount: number;
}): NearbyListStatus {
  if (!input.hasCoords) return input.locationStatus === "locating" ? "locating" : "noLocation";
  if (input.errorCode === "RATE_LIMITED") return "rateLimited";
  if (input.errorCode === "NOT_ELIGIBLE") return "notEligible";
  if (input.errorCode) return "error";
  if (input.isLoading) return "loading";
  return input.resultCount === 0 ? "empty" : "ready";
}

// "Barcelona, Catalonia, Spain" -> "Barcelona", for headings.
export function shortPlaceName(label: string): string {
  return label.split(",")[0].trim();
}
