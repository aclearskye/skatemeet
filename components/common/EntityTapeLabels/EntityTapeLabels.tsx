import type { ReactNode } from "react";
import { StyleProp, Text, View, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { difficultyTier } from "@/lib/spots/difficulty";
import { TAPE_LABEL_COLORS, TapeLabel, TapeColors } from "@/lib/shared/tapeLabels";
import { DuctTapeLabel } from "@/components/common/DuctTapeLabel";
import { styles } from "./EntityTapeLabels.styles";

type Props = {
  typeLabel: string;
  typeColors: TapeColors;
  difficulty?: number | null;
  labels?: TapeLabel[];
  // sm: map preview card. md: default. lg: detail-page hero on web.
  size?: "sm" | "md" | "lg";
  // When set, custom labels become pressable and show a remove icon
  // (used by the spot creation flow's preview).
  onRemoveLabel?: (index: number) => void;
  style?: StyleProp<ViewStyle>;
  // Rendered after every label, in the same wrapping row (e.g. VERIFIED).
  children?: ReactNode;
};

// The row of duct-tape labels on an entity: always type first, then the
// difficulty tier (spots only, when rated), then any user-defined labels.
export function EntityTapeLabels({
  typeLabel,
  typeColors,
  difficulty,
  labels = [],
  size = "md",
  onRemoveLabel,
  style,
  children,
}: Props) {
  const tier = difficultyTier(difficulty);
  const chipStyle = size === "sm" ? styles.chipSm : size === "lg" ? styles.chipLg : styles.chipMd;
  const textStyle = size === "sm" ? styles.textSm : size === "lg" ? styles.textLg : styles.textMd;

  return (
    <View style={[styles.row, style]}>
      <DuctTapeLabel
        color={typeColors.bg}
        style={chipStyle}
        accessibilityLabel={`Type: ${typeLabel}`}
      >
        <Text style={[textStyle, { color: typeColors.fg }]}>{typeLabel}</Text>
      </DuctTapeLabel>

      {tier && (
        <DuctTapeLabel
          color={tier.bg}
          style={chipStyle}
          accessibilityLabel={`Difficulty: ${tier.label}`}
        >
          <Text style={[textStyle, { color: tier.fg }]}>{tier.label}</Text>
        </DuctTapeLabel>
      )}

      {labels.map((label, index) => {
        const colors = TAPE_LABEL_COLORS[label.color];
        const text = label.text.toUpperCase();
        return (
          <DuctTapeLabel
            key={label.text}
            color={colors.bg}
            style={chipStyle}
            onPress={onRemoveLabel ? () => onRemoveLabel(index) : undefined}
            accessibilityLabel={`Label: ${label.text}`}
            accessibilityHint={onRemoveLabel ? "Double-tap to remove" : undefined}
          >
            <Text style={[textStyle, { color: colors.fg }]}>{text}</Text>
            {onRemoveLabel && <Ionicons name="close" size={12} color={colors.fg} />}
          </DuctTapeLabel>
        );
      })}
      {children}
    </View>
  );
}
