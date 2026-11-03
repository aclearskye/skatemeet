import { DuctTapeLabel } from "@/components/common/DuctTapeLabel";
import { C } from "@/lib/theme";
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
        if (active) {
          return (
            <DuctTapeLabel
              key={key}
              color={accentBg}
              style={[styles.chip, { borderColor: accentBg }]}
              onPress={() => onToggle(key)}
            >
              <Text style={[styles.chipText, { color: accentText }]}>{label}</Text>
            </DuctTapeLabel>
          );
        }
        return (
          <TouchableOpacity
            key={key}
            style={styles.chip}
            onPress={() => onToggle(key)}
            activeOpacity={0.75}
          >
            <Text style={styles.chipText}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}
