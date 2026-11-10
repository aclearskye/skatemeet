import { View } from "react-native";
import { PARKING_LABELS, PARKING_OPTIONS, ParkingType } from "@/lib/shared/types";
import { TapeChip } from "@/components/common/TapeChip";
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
        return (
          <TapeChip
            key={option}
            text={PARKING_LABELS[option]}
            colors={{ bg: accent, fg: onAccent }}
            active={selected}
            onPress={() => onChange(selected ? null : option)}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            accessibilityHint={selected ? "Double-tap to clear" : undefined}
          />
        );
      })}
    </View>
  );
}
