import { Ionicons } from "@expo/vector-icons";
import { Text, TouchableOpacity } from "react-native";
import { C } from "@/lib/theme";
import { styles } from "./SearchLocationButton.styles";

type Props = {
  label: string;
  onPress: () => void;
};

// Shows where nearby search is looking ("CURRENT LOCATION" or a city) and
// opens the picker.
export function SearchLocationButton({ label, onPress }: Props) {
  return (
    <TouchableOpacity
      style={styles.button}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={`Search location: ${label}. Change location`}
    >
      <Ionicons name="location-sharp" size={14} color={C.primary} />
      <Text style={styles.label} numberOfLines={1}>
        {label.toUpperCase()}
      </Text>
      <Ionicons name="chevron-down" size={14} color={C.muted} />
    </TouchableOpacity>
  );
}
