import { Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C } from "@/lib/theme";
import { styles } from "./QuantityStepper.styles";

type Props = {
  value: number;
  onChange: (value: number) => void;
  // The cart lets the minus button go to 0, which removes the item.
  min?: number;
  max?: number;
  disabled?: boolean;
};

export function QuantityStepper({ value, onChange, min = 1, max = 99, disabled = false }: Props) {
  return (
    <View style={styles.row}>
      <TouchableOpacity
        style={styles.btn}
        onPress={() => onChange(Math.max(min, value - 1))}
        disabled={disabled || value <= min}
        accessibilityLabel={value - 1 < 1 ? "Remove" : "Decrease quantity"}
      >
        <Ionicons name={value <= 1 && min === 0 ? "trash-outline" : "remove"} size={16} color={C.text} />
      </TouchableOpacity>
      <Text style={styles.value}>{value}</Text>
      <TouchableOpacity
        style={styles.btn}
        onPress={() => onChange(Math.min(max, value + 1))}
        disabled={disabled || value >= max}
        accessibilityLabel="Increase quantity"
      >
        <Ionicons name="add" size={16} color={C.text} />
      </TouchableOpacity>
    </View>
  );
}
