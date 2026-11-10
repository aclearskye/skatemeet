import { Text, View } from "react-native";
import {
  SPOT_METRICS,
  SPOT_METRIC_INFO,
  type MetricSummary,
  type SpotMetric,
} from "@/lib/spots/ratingMetrics";
import { RatingBar } from "@/components/common/RatingBar";
import { styles } from "./SpotRatingsSection.styles";

type Props = {
  summaries: Record<SpotMetric, MetricSummary>;
  // The viewer's own rating per data point (null = not rated).
  mine: Record<SpotMetric, number | null>;
  onRate: (metric: SpotMetric, rating: number | null) => void;
  // Why the viewer can't rate yet (e.g. "CHECK IN TO RATE"); null = can rate.
  lockedReason: string | null;
};

// A spot's three community data points, one bar each in its own colour.
// Each bar shows the average and is also where the viewer sets theirs.
export function SpotRatingsSection({ summaries, mine, onRate, lockedReason }: Props) {
  return (
    <View style={styles.section}>
      {SPOT_METRICS.map((metric) => (
        <RatingBar
          key={metric}
          label={SPOT_METRIC_INFO[metric].label}
          value={summaries[metric].average}
          count={summaries[metric].count}
          accent={SPOT_METRIC_INFO[metric].color}
          onChange={(rating) => onRate(metric, rating)}
          userValue={mine[metric]}
          disabled={lockedReason != null}
        />
      ))}
      <Text style={styles.hint}>
        {lockedReason ?? "TAP A BAR TO RATE · YOURS IS OUTLINED · TAP IT AGAIN TO CLEAR"}
      </Text>
    </View>
  );
}
