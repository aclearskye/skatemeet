import { PARKING_LABELS, PARKING_OPTIONS, ParkingType } from "@/lib/shared/types";
import { Text, TouchableOpacity, View } from "react-native";
import { styles } from "./ParkingSelect.styles";

type Props = {
  value: ParkingType | null;
  onChange: (value: ParkingType | null) => void;
  accent: string;
  onAccent: string;
  rotate: string;
};

export function ParkingSelect({ value, onChange, accent, onAccent, rotate }: Props) {
  return (
    <View style={styles.row}>
      {PARKING_OPTIONS.map((option) => {
        const selected = value === option;
        return (
          <TouchableOpacity
            key={option}
            style={[
              styles.chip,
              selected && {
                backgroundColor: accent,
                borderColor: accent,
                transform: [{ rotate }],
              },
            ]}
            onPress={() => onChange(selected ? null : option)}
            activeOpacity={0.75}
          >
            <Text style={[styles.chipText, selected && { color: onAccent }]}>
              {PARKING_LABELS[option].toUpperCase()}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
