import { parseTapeLabels, TAPE_LABEL_COLOR_KEYS, TAPE_LABEL_COLORS, type TapeColors, type TapeLabel, type TapeLabelColor } from "@/lib/shared/tapeLabels";

// How an owner customises its store page (store_public_details style
// columns, 20261123120000_store_page_customisation.sql). Only the owning
// Store account can set these; an unclaimed listing keeps the defaults.

export type StoreKind = "store" | "skatepark" | "store_and_park";
export type FeaturedSection = "tickets" | "shop";

export type StorePageStyle = {
  storeKind: StoreKind;
  tapeLabels: TapeLabel[];
  accent: TapeLabelColor;
  announcement: string | null;
  instagram: string | null;
  tiktok: string | null;
  youtube: string | null;
  featuredSection: FeaturedSection;
};

export const DEFAULT_STORE_PAGE_STYLE: StorePageStyle = {
  storeKind: "store",
  tapeLabels: [],
  accent: "secondary",
  announcement: null,
  instagram: null,
  tiktok: null,
  youtube: null,
  featuredSection: "tickets",
};

export const STORE_KINDS: StoreKind[] = ["store", "skatepark", "store_and_park"];

// The hero's type tape.
export const STORE_KIND_LABEL: Record<StoreKind, string> = {
  store: "SKATE STORE",
  skatepark: "SKATEPARK",
  store_and_park: "STORE + PARK",
};

export const MAX_ANNOUNCEMENT_LENGTH = 140;

export const SOCIAL_PATTERNS = {
  instagram: /^[A-Za-z0-9._]{1,30}$/,
  tiktok: /^[A-Za-z0-9._]{2,24}$/,
  youtube: /^[A-Za-z0-9._-]{3,30}$/,
} as const;

export type SocialNetwork = keyof typeof SOCIAL_PATTERNS;

export const SOCIAL_URL: Record<SocialNetwork, (handle: string) => string> = {
  instagram: (h) => `https://instagram.com/${h}`,
  tiktok: (h) => `https://www.tiktok.com/@${h}`,
  youtube: (h) => `https://www.youtube.com/@${h}`,
};

// Accepts "@handle", "handle" or a profile URL, and returns the bare handle.
export function normaliseHandle(raw: string): string {
  return raw
    .trim()
    .replace(/^https?:\/\/(www\.)?[^/]+\//i, "")
    .replace(/^@/, "")
    .replace(/[/?#].*$/, "");
}

export function accentColors(accent: TapeLabelColor | undefined): TapeColors {
  return TAPE_LABEL_COLORS[accent ?? "secondary"];
}

function pick<TValue extends string>(value: unknown, allowed: readonly TValue[], fallback: TValue): TValue {
  return typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as TValue) : fallback;
}

const text = (value: unknown): string | null => (typeof value === "string" && value !== "" ? value : null);

// Defensive read of the RPC's style block.
export function parseStorePageStyle(value: unknown): StorePageStyle {
  if (typeof value !== "object" || value === null) return DEFAULT_STORE_PAGE_STYLE;
  const row = value as Record<string, unknown>;
  return {
    storeKind: pick(row.store_kind, STORE_KINDS, "store"),
    tapeLabels: parseTapeLabels(row.tape_labels),
    accent: pick(row.accent, TAPE_LABEL_COLOR_KEYS, "secondary"),
    announcement: text(row.announcement),
    instagram: text(row.instagram),
    tiktok: text(row.tiktok),
    youtube: text(row.youtube),
    featuredSection: pick(row.featured_section, ["tickets", "shop"] as const, "tickets"),
  };
}
