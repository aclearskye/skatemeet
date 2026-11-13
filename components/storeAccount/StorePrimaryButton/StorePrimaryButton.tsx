import { ActivityIndicator, Text, TouchableOpacity } from "react-native";
import { C } from "@/lib/theme";
import { styles } from "./StorePrimaryButton.styles";

type Props = {
  label: string;
  onPress: () => void;
  isBusy?: boolean;
  disabled?: boolean;
  variant?: "primary" | "secondary";
};

export function StorePrimaryButton({ label, onPress, isBusy = false, disabled = false, variant = "primary" }: Props) {
  const isSecondary = variant === "secondary";
  const inactive = disabled || isBusy;

  return (
    <TouchableOpacity
      style={[styles.button, isSecondary && styles.secondary, inactive && styles.inactive]}
      onPress={onPress}
      disabled={inactive}
      activeOpacity={0.8}
    >
      {isBusy ? (
        <ActivityIndicator color={isSecondary ? C.text : C.onPrimary} />
      ) : (
        <Text style={[styles.label, isSecondary && styles.secondaryLabel]}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}
