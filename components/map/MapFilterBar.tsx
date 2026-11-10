import { ScrollView } from "react-native";
import { C } from "@/lib/theme";
import type { TapeColors } from "@/lib/shared/tapeLabels";
import { FilterKey } from "@/utils/constants";
import { TapeChip } from "@/components/common/TapeChip";
import { styles } from "./MapFilterBar.styles";

type Props = {
  filters: { key: FilterKey; label: string }[];
  activeFilters: Set<FilterKey>;
  onToggle: (key: FilterKey) => void;
};

const FILTER_COLORS: Record<FilterKey, TapeColors> = {
  spots: { bg: C.primary, fg: C.onPrimary },
  userSpots: { bg: C.primary, fg: C.onPrimary },
  stores: { bg: C.secondary, fg: C.onSecondary },
  diys: { bg: C.tertiary, fg: C.onTertiary },
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
        return (
          <TapeChip
            key={key}
            text={label}
            colors={FILTER_COLORS[key]}
            active={active}
            onPress={() => onToggle(key)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: active }}
          />
        );
      })}
    </ScrollView>
  );
}
