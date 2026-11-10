import { C } from "@/lib/theme";

// The three community data points every spot (and DIY) collects, each a
// 1–5 rating from skaters who've checked in there. Kept in sync with the
// metric CHECK on spot_ratings
// (supabase/migrations/20261110170000_spot_rating_metrics.sql).
export const SPOT_METRICS = ["rating", "difficulty", "smoothness"] as const;

export type SpotMetric = (typeof SPOT_METRICS)[number];

export type MetricSummary = { average: number | null; count: number };

// Fixed colours, whatever the page accent: green (the palette's
// chartreuse), orange and blue (the palette's cyan).
export const SPOT_METRIC_INFO: Record<SpotMetric, { label: string; color: string }> = {
  rating: { label: "RATING", color: C.primary },
  difficulty: { label: "DIFFICULTY", color: C.secondary },
  smoothness: { label: "SMOOTHNESS", color: C.tertiary },
};

export const EMPTY_SUMMARY: MetricSummary = { average: null, count: 0 };
