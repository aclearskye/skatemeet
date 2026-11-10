import type { ReactNode } from "react";
import { StyleProp, View, ViewStyle } from "react-native";
import { difficultyTier } from "@/lib/spots/difficulty";
import { smoothnessTier } from "@/lib/spots/smoothness";
import { TAPE_LABEL_COLORS, TapeLabel, TapeColors } from "@/lib/shared/tapeLabels";
import { TapeChip, TapeChipSize } from "@/components/common/TapeChip";
import { styles } from "./EntityTapeLabels.styles";

type Props = {
  typeLabel: string;
  typeColors: TapeColors;
  difficulty?: number | null;
  smoothness?: number | null;
  labels?: TapeLabel[];
  // sm: map preview card. md: default. lg: detail-page hero on web.
  size?: TapeChipSize;
  // When set, custom labels become pressable and show a remove mark
  // (used by the spot creation flow's preview).
  onRemoveLabel?: (index: number) => void;
  style?: StyleProp<ViewStyle>;
  // Rendered after every label, in the same wrapping row (e.g. VERIFIED).
  children?: ReactNode;
};

// The row of duct-tape labels on an entity: always type first, then the
// difficulty and smoothness tiers (spots only, once rated), then any
// user-defined labels.
export function EntityTapeLabels({
  typeLabel,
  typeColors,
  difficulty,
  smoothness,
  labels = [],
  size = "md",
  onRemoveLabel,
  style,
  children,
}: Props) {
  const tier = difficultyTier(difficulty);
  const smooth = smoothnessTier(smoothness);

  return (
    <View style={[styles.row, style]}>
      <TapeChip
        text={typeLabel}
        colors={typeColors}
        size={size}
        accessibilityLabel={`Type: ${typeLabel}`}
      />

      {tier && (
        <TapeChip
          text={tier.label}
          colors={tier}
          size={size}
          accessibilityLabel={`Difficulty: ${tier.label}`}
        />
      )}

      {smooth && (
        <TapeChip
          text={smooth.label}
          colors={smooth}
          size={size}
          accessibilityLabel={`Smoothness: ${smooth.label}`}
        />
      )}

      {labels.map((label, index) => (
        <TapeChip
          key={label.text}
          text={label.text}
          colors={TAPE_LABEL_COLORS[label.color]}
          size={size}
          removable={!!onRemoveLabel}
          onPress={onRemoveLabel ? () => onRemoveLabel(index) : undefined}
          accessibilityLabel={`Label: ${label.text}`}
          accessibilityHint={onRemoveLabel ? "Double-tap to remove" : undefined}
        />
      ))}
      {children}
    </View>
  );
}
