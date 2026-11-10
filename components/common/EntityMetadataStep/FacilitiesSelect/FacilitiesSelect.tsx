import { View } from "react-native";
import { FACILITIES, FACILITY_LABELS, Facility } from "@/lib/shared/types";
import { TapeChip } from "@/components/common/TapeChip";
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
        return (
          <TapeChip
            key={facility}
            text={FACILITY_LABELS[facility]}
            colors={{ bg: accent, fg: onAccent }}
            active={selected}
            onPress={() => toggle(facility)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: selected }}
          />
        );
      })}
    </View>
  );
}
