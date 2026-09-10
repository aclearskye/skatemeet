import { C, TAPE } from "@/lib/theme";
import { FilterKey } from "@/utils/constants";
import { ScrollView, Text, TouchableOpacity } from "react-native";
import { styles } from "./MapFilterBar.styles";

type Props = {
  filters: { key: FilterKey; label: string }[];
  activeFilters: Set<FilterKey>;
  onToggle: (key: FilterKey) => void;
};

export function MapFilterBar({ filters, activeFilters, onToggle }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filtersRow}
    >
      {filters.map(({ key, label }) => {
        const active = activeFilters.has(key);
        const accentBg = key === "stores" ? C.secondary : key === "diys" ? C.tertiary : C.primary;
        const accentText =
          key === "stores" ? C.onSecondary : key === "diys" ? C.onTertiary : C.onPrimary;
        const accentRotate =
          key === "stores"
            ? TAPE.rotateSecondary
            : key === "diys"
              ? TAPE.rotateTertiary
              : TAPE.rotatePrimary;
        return (
          <TouchableOpacity
            key={key}
            style={[
              styles.chip,
              active && {
                backgroundColor: accentBg,
                borderColor: accentBg,
                transform: [{ rotate: accentRotate }],
              },
            ]}
            onPress={() => onToggle(key)}
            activeOpacity={0.75}
          >
            <Text style={[styles.chipText, active && { color: accentText }]}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}
