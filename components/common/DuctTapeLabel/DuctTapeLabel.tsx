import { useMemo } from "react";
import {
  AccessibilityRole,
  AccessibilityState,
  StyleProp,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { randomTapeRotation } from "@/lib/theme";

type Props = {
  color: string;
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  // Max tilt in degrees either way (default 2). Lower it for wide strips
  // like a full-width button, where 2deg looks like it's falling off.
  maxTilt?: number;
  // Defaults to "button" when pressable. Pass "tab", "radio", "checkbox"
  // etc. when the label is one option in a group, with the matching state.
  accessibilityRole?: AccessibilityRole;
  accessibilityState?: AccessibilityState;
  // Defaults to the children's text. Set it when the visible text alone
  // lacks context (e.g. "Parking: street").
  accessibilityLabel?: string;
  accessibilityHint?: string;
  children: React.ReactNode;
};

// The one duct-tape chip: a solid accent color, tilted at a random angle.
// The angle is picked once per mount (useMemo with no deps), so it stays put
// across re-renders but comes out different every time the page remounts —
// meaning a row of same-color tape labels never all tilt identically, and a
// page refresh re-rolls every active label's angle.
//
// Either way it's one accessible element, so a screen reader reads the
// icon + text inside as a single label instead of stepping through them.
export function DuctTapeLabel({
  color,
  onPress,
  disabled,
  style,
  maxTilt,
  accessibilityRole,
  accessibilityState,
  accessibilityLabel,
  accessibilityHint,
  children,
}: Props) {
  // maxTilt is read once on mount, like the angle itself.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const rotation = useMemo(() => randomTapeRotation(maxTilt), []);
  // Tape color and tilt go last so a caller's base style (e.g. a shared chip
  // style with its own unselected backgroundColor) can't paint over them.
  const tapeStyle: StyleProp<ViewStyle> = [
    style,
    { backgroundColor: color, transform: [{ rotate: rotation }] },
  ];
  const a11y = { accessibilityLabel, accessibilityHint };

  if (onPress) {
    return (
      <TouchableOpacity
        style={tapeStyle}
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.8}
        accessible
        accessibilityRole={accessibilityRole ?? "button"}
        accessibilityState={{ ...accessibilityState, disabled: !!disabled }}
        {...a11y}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View
      style={tapeStyle}
      accessible
      accessibilityRole={accessibilityRole ?? "text"}
      accessibilityState={accessibilityState}
      {...a11y}
    >
      {children}
    </View>
  );
}
