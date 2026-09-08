import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, TouchableOpacity } from "react-native";
import { styles } from "./AddPhotoIconButton.styles";

type Props = {
  onPress: () => void;
  isLoading: boolean;
  accent: string;
};

export function AddPhotoIconButton({ onPress, isLoading, accent }: Props) {
  return (
    <TouchableOpacity
      style={[styles.btn, { borderColor: accent }]}
      onPress={onPress}
      disabled={isLoading}
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
