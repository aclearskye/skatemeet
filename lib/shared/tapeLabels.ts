import { C } from "@/lib/theme";

// User-defined one-word duct-tape labels, on spots and on profiles. Kept in
// sync with spot_labels_valid() in
// supabase/migrations/20261106140000_spot_labels.sql, which both the
// user_spots and profiles CHECK constraints use.

export const TAPE_LABEL_COLOR_KEYS = ["primary", "secondary", "tertiary", "gold", "tape"] as const;

export type TapeLabelColor = (typeof TAPE_LABEL_COLOR_KEYS)[number];

export type TapeLabel = {
  text: string;
  color: TapeLabelColor;
};

export type TapeColors = { bg: string; fg: string };

// Stored as a key (not a hex value) so a palette change recolours every
// existing label.
export const TAPE_LABEL_COLORS: Record<TapeLabelColor, TapeColors & { name: string }> = {
  primary: { bg: C.primary, fg: C.onPrimary, name: "Chartreuse" },
  secondary: { bg: C.secondary, fg: C.onSecondary, name: "Orange" },
  tertiary: { bg: C.tertiary, fg: C.onTertiary, name: "Cyan" },
  gold: { bg: C.gold, fg: C.onGold, name: "Gold" },
  tape: { bg: C.tape, fg: C.onTape, name: "Bone" },
};

export const MAX_TAPE_LABELS = 5;
export const MAX_TAPE_LABEL_LENGTH = 20;

// One word; hyphens allowed between parts ("kinked-rail"), never leading,
// trailing or doubled.
export const TAPE_LABEL_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// Applied on every keystroke: lowercase, spaces become hyphens, anything
// else outside [a-z0-9-] is dropped, and runs of hyphens collapse to one.
export function sanitizeLabelInput(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, MAX_TAPE_LABEL_LENGTH);
}

// Final clean-up before adding: trims stray edge hyphens left mid-typing.
export function finalizeLabelText(raw: string): string {
  return sanitizeLabelInput(raw).replace(/^-+|-+$/g, "");
}

export function isValidLabelText(text: string): boolean {
  return text.length > 0 && text.length <= MAX_TAPE_LABEL_LENGTH && TAPE_LABEL_PATTERN.test(text);
}

function isTapeLabelColor(value: unknown): value is TapeLabelColor {
  return typeof value === "string" && (TAPE_LABEL_COLOR_KEYS as readonly string[]).includes(value);
}

// Defensive read of the JSONB column (or a route-param snapshot of it):
// drops anything malformed rather than crashing the card.
export function parseTapeLabels(value: unknown): TapeLabel[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (v): v is TapeLabel =>
      typeof v === "object" &&
      v !== null &&
      typeof (v as { text?: unknown }).text === "string" &&
      isTapeLabelColor((v as { color?: unknown }).color)
  );
}
