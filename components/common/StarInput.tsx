import { C } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, TouchableOpacity, View } from "react-native";

type Props = {
  value: number | null;
  onChange: (value: number | null) => void;
  size?: number;
  gap?: number;
  hitSlop?: number;
  accent: string;
};

export function StarInput({ value, onChange, size = 30, gap = 10, hitSlop = 8, accent }: Props) {
  return (
    <View style={[styles.row, { gap }]}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity
          key={star}
          onPress={() => onChange(value === star ? null : star)}
          hitSlop={hitSlop}
          activeOpacity={0.75}
        >
          <Ionicons
            name={value !== null && star <= value ? "star" : "star-outline"}
            size={size}
            color={value !== null && star <= value ? accent : C.border}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row" },
});
