import { C } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, TouchableOpacity } from "react-native";
import { styles } from "./MapToolButton.styles";

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  loading?: boolean;
};

export function MapToolButton({ icon, onPress, loading }: Props) {
  return (
    <TouchableOpacity style={styles.btn} onPress={onPress} activeOpacity={0.85} disabled={loading}>
      {loading ? (
        <ActivityIndicator size="small" color={C.primary} />
      ) : (
        <Ionicons name={icon} size={22} color={C.text} />
      )}
    </TouchableOpacity>
  );
}
