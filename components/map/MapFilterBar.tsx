import { C, F } from "@/lib/theme";
import { FilterKey } from "@/utils/constants";
import { ScrollView, StyleSheet, Text, TouchableOpacity } from "react-native";

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
        return (
          <TouchableOpacity
            key={key}
            style={[styles.chip, active && { backgroundColor: accentBg, borderColor: accentBg }]}
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

const styles = StyleSheet.create({
  filtersRow: { flexDirection: "row", gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 2,
    borderColor: C.border,
    backgroundColor: C.bg,
  },
  chipText: {
    fontFamily: F.mono,
    fontSize: 10,
    letterSpacing: 1,
    color: C.muted,
    textTransform: "uppercase",
  },
});
