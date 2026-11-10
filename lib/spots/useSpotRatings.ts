import { Alert } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthContext } from "@/lib/context/use-auth-context";
import { queryKeys } from "@/utils/queryKeys";
import { EMPTY_SUMMARY, SPOT_METRICS, type MetricSummary, type SpotMetric } from "./ratingMetrics";
import { rateSpot } from "./spotRatingMutations";
import { fetchMySpotRatings, fetchSpotRatings } from "./spotRatingQueries";

type Summaries = Record<SpotMetric, MetricSummary>;
type Mine = Record<SpotMetric, number | null>;

const EMPTY_SUMMARIES = Object.fromEntries(
  SPOT_METRICS.map((m) => [m, EMPTY_SUMMARY])
) as Summaries;
const EMPTY_MINE = Object.fromEntries(SPOT_METRICS.map((m) => [m, null])) as Mine;

// Swaps one skater's rating in an average without refetching, for the
// optimistic update. prev/next are that skater's old and new rating.
function applyRating(summary: MetricSummary, prev: number | null, next: number | null): MetricSummary {
  let total = (summary.average ?? 0) * summary.count;
  let count = summary.count;
  if (prev != null) {
    total -= prev;
    count -= 1;
  }
  if (next != null) {
    total += next;
    count += 1;
  }
  if (count <= 0) return EMPTY_SUMMARY;
  return { average: Math.round((total / count) * 10) / 10, count };
}

type RateVars = { metric: SpotMetric; rating: number | null };

// A spot's three community data points (rating, difficulty, smoothness),
// the viewer's own rating for each, and rate() to set or clear one
// (optimistically).
export function useSpotRatings(spotId: string | null, osmPlaceId: string | null) {
  const { session } = useAuthContext();
  const profileId = session?.user.id ?? null;
  const queryClient = useQueryClient();
  const hasSpot = spotId != null || osmPlaceId != null;

  const summaryKey = queryKeys.spotRatings(spotId, osmPlaceId);
  const mineKey = queryKeys.mySpotRatings(spotId, osmPlaceId, profileId ?? "");

  const { data: summaries = EMPTY_SUMMARIES } = useQuery({
    queryKey: summaryKey,
    queryFn: () => fetchSpotRatings(spotId, osmPlaceId),
    enabled: hasSpot,
  });

  const { data: mine = EMPTY_MINE } = useQuery({
    queryKey: mineKey,
    queryFn: () => fetchMySpotRatings(spotId, osmPlaceId, profileId!),
    enabled: hasSpot && !!profileId,
  });

  const mutation = useMutation({
    mutationFn: ({ metric, rating }: RateVars) => rateSpot(spotId, osmPlaceId, metric, rating),
    onMutate: async ({ metric, rating }) => {
      await queryClient.cancelQueries({ queryKey: summaryKey });
      const prevSummaries = queryClient.getQueryData<Summaries>(summaryKey) ?? EMPTY_SUMMARIES;
      const prevMine = queryClient.getQueryData<Mine>(mineKey) ?? EMPTY_MINE;
      queryClient.setQueryData<Summaries>(summaryKey, {
        ...prevSummaries,
        [metric]: applyRating(prevSummaries[metric], prevMine[metric], rating),
      });
      queryClient.setQueryData<Mine>(mineKey, { ...prevMine, [metric]: rating });
      return { prevSummaries, prevMine };
    },
    onError: (error: Error, _vars, context) => {
      if (context) {
        queryClient.setQueryData(summaryKey, context.prevSummaries);
        queryClient.setQueryData(mineKey, context.prevMine);
      }
      Alert.alert("Couldn't save your rating", error.message);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: summaryKey });
      // Map cards show the difficulty and smoothness tapes from the cache.
      queryClient.invalidateQueries({ queryKey: queryKeys.mapUserMarkersBase });
    },
  });

  return {
    summaries,
    mine,
    rate: (metric: SpotMetric, rating: number | null) => mutation.mutate({ metric, rating }),
  };
}
