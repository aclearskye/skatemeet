import { C } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { TouchableOpacity, View } from "react-native";
import { styles } from "./IconBadgeButton.styles";

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  hasBadge: boolean;
  onPress?: () => void;
  size?: number;
  color?: string;
};

export function IconBadgeButton({ icon, hasBadge, onPress, size = 22, color = C.muted }: Props) {
  return (
    <TouchableOpacity style={styles.btn} onPress={onPress} activeOpacity={0.7} hitSlop={8}>
      <Ionicons name={icon} size={size} color={color} />
      {hasBadge && <View style={styles.badge} />}
    </TouchableOpacity>
  );
}
