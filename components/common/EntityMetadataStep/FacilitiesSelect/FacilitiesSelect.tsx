import { FACILITIES, FACILITY_LABELS, Facility } from "@/lib/shared/types";
import { Text, TouchableOpacity, View } from "react-native";
import { styles } from "./FacilitiesSelect.styles";

type Props = {
  value: Facility[];
  onChange: (value: Facility[]) => void;
  accent: string;
  onAccent: string;
  rotate: string;
};

export function FacilitiesSelect({ value, onChange, accent, onAccent, rotate }: Props) {
  function toggle(facility: Facility) {
    onChange(
      value.includes(facility) ? value.filter((f) => f !== facility) : [...value, facility]
    );
  }

  return (
    <View style={styles.grid}>
      {FACILITIES.map((facility) => {
        const selected = value.includes(facility);
        return (
          <TouchableOpacity
            key={facility}
            style={[
              styles.chip,
              selected && {
                backgroundColor: accent,
                borderColor: accent,
                transform: [{ rotate }],
              },
            ]}
            onPress={() => toggle(facility)}
            activeOpacity={0.75}
          >
            <Text style={[styles.chipText, selected && { color: onAccent }]}>
              {FACILITY_LABELS[facility].toUpperCase()}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
