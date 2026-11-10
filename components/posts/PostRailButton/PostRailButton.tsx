import { Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C } from "@/lib/theme";
import { styles } from "./PostRailButton.styles";

type IconName = keyof typeof Ionicons.glyphMap;

type Props = {
  // Outline icon while off; filled icon while on (toggles only).
  icon: IconName;
  activeIcon?: IconName;
  isActive?: boolean;
  // Fill colour + icon colour on top of it, when active.
  accent?: string;
  onAccent?: string;
  // Outline + icon colour while not active (e.g. share is cyan).
  tint?: string;
  // Shown under the square (e.g. like count).
  count?: number;
  onPress: () => void;
  accessibilityLabel: string;
};

// One square button on the post viewer's right rail, in the brand's
// hard-edged style: an outline square and outline icon in its tint when off;
// solid accent with a filled icon when on.
export function PostRailButton({
  icon,
  activeIcon,
  isActive = false,
  accent = C.primary,
  onAccent = C.onPrimary,
  tint = C.text,
  count,
  onPress,
  accessibilityLabel,
}: Props) {
  const isToggle = activeIcon != null;
  return (
    <View style={styles.wrap}>
      <TouchableOpacity
        style={[styles.square, { borderColor: tint }, isActive && { backgroundColor: accent, borderColor: accent }]}
        onPress={onPress}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityState={isToggle ? { selected: isActive } : undefined}
        accessibilityLabel={accessibilityLabel}
      >
        <Ionicons
          name={isActive && activeIcon ? activeIcon : icon}
          size={20}
          color={isActive ? onAccent : tint}
        />
      </TouchableOpacity>
      {count != null && <Text style={styles.count}>{count}</Text>}
    </View>
  );
}
