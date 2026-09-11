import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, TouchableOpacity } from "react-native";
import { styles } from "./AddPhotoIconButton.styles";

type Props = {
  onPress: () => void;
  isLoading: boolean;
  accent: string;
  disabled?: boolean;
};

export function AddPhotoIconButton({ onPress, isLoading, accent, disabled }: Props) {
  return (
    <TouchableOpacity
      style={[styles.btn, { borderColor: accent }, disabled && styles.btnDisabled]}
      onPress={onPress}
      disabled={isLoading || disabled}
      activeOpacity={0.75}
      hitSlop={8}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color={accent} />
      ) : (
        <Ionicons name="camera-outline" size={16} color={accent} />
      )}
    </TouchableOpacity>
  );
}
