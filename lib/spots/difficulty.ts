import { C } from "@/lib/theme";
import type { TapeColors } from "@/lib/shared/tapeLabels";

// A spot's 1–5 community difficulty (an average, so fractional), bucketed into the three duct-tape tiers
// shown on the map preview card and detail screens.

export type DifficultyTier = TapeColors & {
  key: "easy" | "tricky" | "impossible";
  label: string;
};

const TIERS: Record<DifficultyTier["key"], DifficultyTier> = {
  easy: { key: "easy", label: "EASY", bg: C.primary, fg: C.onPrimary },
  tricky: { key: "tricky", label: "TRICKY", bg: C.tapeOrange, fg: C.onTapeOrange },
  impossible: { key: "impossible", label: "IMPOSSIBLE", bg: C.tapeRed, fg: C.onTapeRed },
};

// Rounded to the nearest whole rating, then 1–2 = easy, 3 = tricky,
// 4–5 = impossible. null/0 = not rated, no tier.
export function difficultyTier(difficulty: number | null | undefined): DifficultyTier | null {
  if (difficulty == null || difficulty < 1) return null;
  const rounded = Math.round(difficulty);
  if (rounded <= 2) return TIERS.easy;
  if (rounded === 3) return TIERS.tricky;
  return TIERS.impossible;
}
