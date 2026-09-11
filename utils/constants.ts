// ── Map timing ────────────────────────────────────────────────────────────────

export const SPOTS_DEBOUNCE_MS = 1750;
export const SCAN_MIN_MS = 1500;
export const SEARCH_DEBOUNCE_MS = 350;

// Below this, search still just filters markers on-screen; at/above it we
// switch to a name search across all entities and hide the map.
export const SEARCH_MIN_CHARS = 3;

// Beyond this delta (~55 km viewport), skip fetching to avoid loading the entire world
export const MAX_DELTA = 0.5;

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
