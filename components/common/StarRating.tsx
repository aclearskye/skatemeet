import { C, F } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

type Props = {
  rating: number | null;
  count?: number;
  size?: number;
  accent: string;
};

export function StarRating({ rating, count, size = 20, accent }: Props) {
  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Ionicons
          key={i}
          name={rating != null && i <= Math.round(rating) ? "star" : "star-outline"}
          size={size}
          color={rating != null && i <= Math.round(rating) ? accent : C.borderVariant}
        />
      ))}
      {rating != null && (
        <Text style={[styles.value, { color: accent }]}>{rating.toFixed(1)}</Text>
      )}
      {count != null && (
        <Text style={styles.count}>({count} {count === 1 ? "RATING" : "RATINGS"})</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 4 },
  value: { fontFamily: F.mono, fontSize: 18 },
  count: { fontFamily: F.monoRegular, fontSize: 11, color: C.muted },
});
