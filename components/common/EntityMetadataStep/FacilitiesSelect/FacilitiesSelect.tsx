import { FACILITIES, FACILITY_LABELS, Facility } from "@/lib/shared/types";
import { DuctTapeLabel } from "@/components/common/DuctTapeLabel";
import { Text, TouchableOpacity, View } from "react-native";
import { styles } from "./FacilitiesSelect.styles";

type Props = {
  value: Facility[];
  onChange: (value: Facility[]) => void;
  accent: string;
  onAccent: string;
};

export function FacilitiesSelect({ value, onChange, accent, onAccent }: Props) {
  function toggle(facility: Facility) {
    onChange(
      value.includes(facility) ? value.filter((f) => f !== facility) : [...value, facility]
    );
  }

  return (
    <View style={styles.grid} accessibilityLabel="Facilities">
      {FACILITIES.map((facility) => {
        const selected = value.includes(facility);
        const label = FACILITY_LABELS[facility].toUpperCase();
        if (selected) {
          return (
            <DuctTapeLabel
              key={facility}
              color={accent}
              style={[styles.chip, { borderColor: accent }]}
              onPress={() => toggle(facility)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: true }}
              accessibilityLabel={FACILITY_LABELS[facility]}
            >
              <Text style={[styles.chipText, { color: onAccent }]}>{label}</Text>
            </DuctTapeLabel>
          );
        }
        return (
          <TouchableOpacity
            key={facility}
            style={styles.chip}
            onPress={() => toggle(facility)}
            activeOpacity={0.75}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: false }}
            accessibilityLabel={FACILITY_LABELS[facility]}
          >
            <Text style={styles.chipText}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
