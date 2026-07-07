// ── Map timing ────────────────────────────────────────────────────────────────

export const SPOTS_DEBOUNCE_MS = 1750;
export const SCAN_MIN_MS = 1500;
export const SEARCH_DEBOUNCE_MS = 350;

// Beyond this delta (~55 km viewport), skip fetching to avoid loading the entire world
export const MAX_DELTA = 0.5;

// ── Data fetching ─────────────────────────────────────────────────────────────

export const BOUNDS_ROW_LIMIT = 150;

// ── Map filters ───────────────────────────────────────────────────────────────

export type FilterKey = "spots" | "diys" | "stores";

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
