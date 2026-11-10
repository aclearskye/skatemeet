import {
  AccessibilityRole,
  AccessibilityState,
  StyleProp,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { TapeColors } from "@/lib/shared/tapeLabels";
import { DuctTapeLabel } from "@/components/common/DuctTapeLabel";
import { styles } from "./TapeChip.styles";

export type TapeChipSize = "sm" | "md" | "lg";

type Props = {
  text: string;
  colors: TapeColors;
  // sm: map preview card. md: default. lg: profile badges, web hero.
  size?: TapeChipSize;
  // false renders the untaped outline chip: an unpicked option in a
  // toggle group, or a "no" value. Defaults to true.
  active?: boolean;
  onPress?: () => void;
  disabled?: boolean;
  // Label editors only: a close mark to show the tape can be removed.
  removable?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityRole?: AccessibilityRole;
  accessibilityState?: AccessibilityState;
  accessibilityLabel?: string;
  accessibilityHint?: string;
};

const CHIP = { sm: styles.chipSm, md: styles.chipMd, lg: styles.chipLg };
const TEXT = { sm: styles.textSm, md: styles.textMd, lg: styles.textLg };

// The one text duct-tape label used across the app: mono caps on a solid
// tape, sized from a fixed scale, no icons. Everything that shows a word on
// tape (entity type, difficulty, labels, facilities, filters, toggles)
// renders through this so they all match.
export function TapeChip({
  text,
  colors,
  size = "md",
  active = true,
  onPress,
  disabled,
  removable,
  style,
  accessibilityRole,
  accessibilityState,
  accessibilityLabel,
  accessibilityHint,
}: Props) {
  const label = text.toUpperCase();

  if (!active) {
    const inner = <Text style={[TEXT[size], styles.textInactive]}>{label}</Text>;
    const a11y = {
      accessibilityState,
      accessibilityLabel: accessibilityLabel ?? text,
      accessibilityHint,
    };
    if (onPress) {
      return (
        <TouchableOpacity
          style={[CHIP[size], styles.inactive, style]}
          onPress={onPress}
          disabled={disabled}
          activeOpacity={0.75}
          accessibilityRole={accessibilityRole ?? "button"}
          {...a11y}
        >
          {inner}
        </TouchableOpacity>
      );
    }
    return (
      <View style={[CHIP[size], styles.inactive, style]} accessible accessibilityRole="text" {...a11y}>
        {inner}
      </View>
    );
  }

  return (
    <DuctTapeLabel
      color={colors.bg}
      style={[CHIP[size], { borderColor: colors.bg }, style]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole={accessibilityRole}
      accessibilityState={accessibilityState}
      accessibilityLabel={accessibilityLabel ?? text}
      accessibilityHint={accessibilityHint}
    >
      <Text style={[TEXT[size], { color: colors.fg }]}>{label}</Text>
      {removable && <Ionicons name="close" size={12} color={colors.fg} />}
    </DuctTapeLabel>
  );
}
