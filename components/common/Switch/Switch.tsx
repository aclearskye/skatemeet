import { Pressable, View } from "react-native";
import { styles } from "./Switch.styles";

type Props = {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
};

// Custom rather than RN's built-in Switch: the platform control always
// renders as a pill on every platform, and the design system requires a
// rectangular track/thumb (see docs/theme/sk8meet-theme-sheet.html "Switch").
//
// The thumb position is driven directly by `value` on every render (no
// Animated.Value) -- an earlier version animated it via Animated.timing
// with useNativeDriver, which can leave the thumb's transform stuck at
// whatever it was on mount (a known native-driver/web quirk) while the
// track's plain conditional style keeps updating correctly, desyncing the
// two. Direct, synchronous positioning guarantees they can never disagree.
export function Switch({ value, onValueChange, disabled }: Props) {
  return (
    <Pressable
      onPress={() => !disabled && onValueChange(!value)}
      disabled={disabled}
      style={[styles.track, value && styles.trackOn, disabled && styles.trackDisabled]}
      hitSlop={8}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
    >
      <View style={[styles.thumb, value && styles.thumbOn]} />
    </Pressable>
  );
}
