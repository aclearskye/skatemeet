export function computeAverageRating(
  rows: { rating: number }[]
): { average: number | null; count: number } {
  if (rows.length === 0) return { average: null, count: 0 };
  const sum = rows.reduce((acc, r) => acc + r.rating, 0);
  return { average: Math.round((sum / rows.length) * 10) / 10, count: rows.length };
}
