import { C } from "@/lib/theme";
import type { TapeColors } from "@/lib/shared/tapeLabels";

// A spot's 1–5 community smoothness (an average, so fractional; 5 = glass),
// bucketed into the three duct-tape tiers shown on the map preview card
// and detail screens.

export type SmoothnessTier = TapeColors & {
  key: "smooth" | "rough" | "crusty";
  label: string;
};

const TIERS: Record<SmoothnessTier["key"], SmoothnessTier> = {
  smooth: { key: "smooth", label: "SMOOTH", bg: C.tertiary, fg: C.onTertiary },
  rough: { key: "rough", label: "ROUGH", bg: C.tape, fg: C.onTape },
  crusty: { key: "crusty", label: "CRUSTY", bg: C.tapeOrange, fg: C.onTapeOrange },
};

// Rounded to the nearest whole rating, then 4–5 = smooth, 3 = rough,
// 1–2 = crusty. null/0 = not rated, no tier.
export function smoothnessTier(smoothness: number | null | undefined): SmoothnessTier | null {
  if (smoothness == null || smoothness < 1) return null;
  const rounded = Math.round(smoothness);
  if (rounded >= 4) return TIERS.smooth;
  if (rounded === 3) return TIERS.rough;
  return TIERS.crusty;
}
