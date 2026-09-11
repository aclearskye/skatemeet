import { Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ReportResolution, ReviewReportItem } from "@/lib/admin/types";
import { C } from "@/lib/theme";
import { styles } from "./ReviewReportCard.styles";

type Props = {
  item: ReviewReportItem;
  onResolve: (reviewId: string, resolution: ReportResolution) => void;
  isBusy: boolean;
};

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function ReviewReportCard({ item, onResolve, isBusy }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.entityBadge}>{item.entityKind.toUpperCase()} REVIEW</Text>
        {item.rating !== null && (
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={12} color={C.primary} />
            <Text style={styles.rating}>{item.rating}</Text>
          </View>
        )}
      </View>

      <Text style={styles.heading} numberOfLines={1}>{item.heading}</Text>
      <Text style={styles.comment} numberOfLines={3}>{item.comment}</Text>

      <Text style={styles.meta}>
        {item.reportCount} REPORT{item.reportCount === 1 ? "" : "S"} · {item.reasons.join(", ").toUpperCase()} · SINCE {formatDate(item.oldestReportAt)}
      </Text>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.dismissBtn}
          onPress={() => onResolve(item.reviewId, "dismissed")}
          activeOpacity={0.75}
          disabled={isBusy}
        >
          <Text style={styles.dismissText}>DISMISS</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.removeBtn}
          onPress={() => onResolve(item.reviewId, "content_removed")}
          activeOpacity={0.85}
          disabled={isBusy}
        >
          <Text style={styles.removeText}>REMOVE REVIEW</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
