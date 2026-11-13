// ── Map timing ────────────────────────────────────────────────────────────────

export const SPOTS_DEBOUNCE_MS = 1750;
export const SCAN_MIN_MS = 1500;
export const SEARCH_DEBOUNCE_MS = 350;

// Below this, search still just filters markers on-screen; at/above it we
// switch to a name search across all entities and hide the map.
export const SEARCH_MIN_CHARS = 3;

// Beyond this delta (~55 km viewport), skip fetching to avoid loading the entire world
export const MAX_DELTA = 0.5;

// Span of the map's starting region around the user. Shared with the launch
// prefetch (lib/map/useMapPrefetch.ts) so it warms exactly the tiles the map
// asks for first.
export const MAP_INITIAL_DELTA = 0.05;

// A last-known GPS fix younger than this opens the map straight away instead
// of waiting on a fresh one (see useMapRegionData).
export const LAST_KNOWN_FIX_MAX_AGE_MS = 10 * 60_000;

// ── Data fetching ─────────────────────────────────────────────────────────────

export const BOUNDS_ROW_LIMIT = 150;

// Name search is paginated per table — this is the page size, not a hard cap.
// Keeping it small means a keystroke only pulls a light first page; scrolling
// to the end of the results list fetches another page on demand.
export const SEARCH_PAGE_SIZE = 20;

// The name-match search is global and ranked by upvotes, so a popular result
// on the other side of the country can crowd out an obscure but genuinely
// nearby one. This widens the candidate pool with everything matching the
// name within this radius of the user, regardless of upvotes, before sorting.
export const SEARCH_NEARBY_RADIUS_KM = 150;

// Map marker cache is tiled on a fixed lat/lng grid so panning back over an
// already-loaded area reuses cached tiles instead of refetching. Smaller =
// more, cheaper parallel requests and finer cache reuse; larger = fewer
// requests per viewport but coarser reuse and bigger per-tile payloads.
export const MAP_TILE_SIZE_DEG = 0.08;
export const MAP_TILE_STALE_MS = 5 * 60_000;
export const LIVE_COUNT_STALE_MS = 25_000;

// ── Map filters ───────────────────────────────────────────────────────────────

// "userSpots" has no entry in FILTER_DEFINITIONS (the always-visible duct-tape
// row) — it's only ever toggled from the search results screen, alongside the
// sort chips, so it's rendered there directly instead.
export type FilterKey = "spots" | "diys" | "stores" | "userSpots";

export const FILTER_DEFINITIONS: { key: FilterKey; label: string }[] = [
  { key: "spots", label: "Skate Spots" },
  { key: "diys", label: "DIYs" },
  { key: "stores", label: "Skate Stores" },
];

// ── Spot type display labels ──────────────────────────────────────────────────

export const TYPE_LABELS: Record<string, string> = {
  street: "STREET",
  diy: "D.I.Y.",
  park: "PARK",
  indoor: "INDOOR",
};

// ── Nearby skaters ────────────────────────────────────────────────────────────

// Matches c_page_size in search_nearby_skaters (20261114120000_nearby_skaters.sql).
export const NEARBY_PAGE_SIZE = 20;

// The live-location reporter skips a report unless this long has passed or
// the device has moved at least this far since the last one. The server
// rounds to a ~2 km cell anyway, so reporting more often gains nothing.
export const LIVE_LOCATION_REPORT_INTERVAL_MS = 15 * 60_000;
export const LIVE_LOCATION_REPORT_MIN_MOVE_KM = 1;

// City search in the search-location modal.
export const PLACE_SEARCH_MIN_CHARS = 2;
