import { PARKING_LABELS, PARKING_OPTIONS, ParkingType } from "@/lib/shared/types";
import { DuctTapeLabel } from "@/components/common/DuctTapeLabel";
import { Text, TouchableOpacity, View } from "react-native";
import { styles } from "./ParkingSelect.styles";

type Props = {
  value: ParkingType | null;
  onChange: (value: ParkingType | null) => void;
  accent: string;
  onAccent: string;
};

export function ParkingSelect({ value, onChange, accent, onAccent }: Props) {
  return (
    <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel="Parking">
      {PARKING_OPTIONS.map((option) => {
        const selected = value === option;
        const label = PARKING_LABELS[option].toUpperCase();
        if (selected) {
          return (
            <DuctTapeLabel
              key={option}
              color={accent}
              style={[styles.chip, { borderColor: accent }]}
              onPress={() => onChange(null)}
              accessibilityRole="radio"
              accessibilityState={{ checked: true }}
              accessibilityLabel={PARKING_LABELS[option]}
              accessibilityHint="Double-tap to clear"
            >
              <Text style={[styles.chipText, { color: onAccent }]}>{label}</Text>
            </DuctTapeLabel>
          );
        }
        return (
          <TouchableOpacity
            key={option}
            style={styles.chip}
            onPress={() => onChange(option)}
            activeOpacity={0.75}
            accessibilityRole="radio"
            accessibilityState={{ checked: false }}
            accessibilityLabel={PARKING_LABELS[option]}
          >
            <Text style={styles.chipText}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
