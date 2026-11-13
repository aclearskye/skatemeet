import { Ionicons } from "@expo/vector-icons";
import { Text, TouchableOpacity } from "react-native";
import { C } from "@/lib/theme";
import { styles } from "./DiscoverabilityToggle.styles";

type Props = {
  isDiscoverable: boolean;
  isPrivate: boolean;
  onToggle: (next: boolean) => void;
};

// Whether the user appears in other skaters' nearby search. A private
// account is never listed, so the toggle is disabled and says why.
export function DiscoverabilityToggle({ isDiscoverable, isPrivate, onToggle }: Props) {
  const isOn = isDiscoverable && !isPrivate;
  const label = isPrivate ? "PRIVATE" : isOn ? "DISCOVERABLE" : "HIDDEN";

  return (
    <TouchableOpacity
      style={[styles.toggle, isOn ? styles.toggleOn : styles.toggleOff]}
      onPress={() => onToggle(!isDiscoverable)}
      disabled={isPrivate}
      activeOpacity={0.8}
      accessibilityRole="switch"
      accessibilityState={{ checked: isOn, disabled: isPrivate }}
      accessibilityLabel={
        isPrivate
          ? "Private accounts aren't shown in nearby search"
          : "Show me to skaters searching nearby"
      }
    >
      <Ionicons
        name={isOn ? "eye" : "eye-off"}
        size={14}
        color={isOn ? C.onPrimary : C.muted}
      />
      <Text style={[styles.label, isOn ? styles.labelOn : styles.labelOff]}>{label}</Text>
    </TouchableOpacity>
  );
}
