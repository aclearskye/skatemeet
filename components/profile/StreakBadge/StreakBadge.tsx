import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { C } from "@/lib/theme";
import { styles } from "./StreakBadge.styles";

type Props = {
  currentStreak: number;
};

export function StreakBadge({ currentStreak }: Props) {
  if (currentStreak < 1) return null;

  return (
    <View style={styles.badge}>
      <Ionicons name="flame" size={12} color={C.secondary} />
      <Text style={styles.text}>{currentStreak}</Text>
    </View>
  );
}
