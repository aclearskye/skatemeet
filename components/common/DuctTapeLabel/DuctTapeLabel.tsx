import { useMemo } from "react";
import { StyleProp, TouchableOpacity, View, ViewStyle } from "react-native";
import { randomTapeRotation } from "@/lib/theme";

type Props = {
  color: string;
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
};

// The one duct-tape chip: a solid accent color, tilted at a random angle.
// The angle is picked once per mount (useMemo with no deps), so it stays put
// across re-renders but comes out different every time the page remounts —
// meaning a row of same-color tape labels never all tilt identically, and a
// page refresh re-rolls every active label's angle.
export function DuctTapeLabel({ color, onPress, disabled, style, children }: Props) {
  const rotation = useMemo(() => randomTapeRotation(), []);
  // Tape color and tilt go last so a caller's base style (e.g. a shared chip
  // style with its own unselected backgroundColor) can't paint over them.
  const tapeStyle: StyleProp<ViewStyle> = [
    style,
    { backgroundColor: color, transform: [{ rotate: rotation }] },
  ];

  if (onPress) {
    return (
      <TouchableOpacity
        style={tapeStyle}
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.8}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={tapeStyle}>{children}</View>;
}
