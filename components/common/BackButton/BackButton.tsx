import { TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { C } from "@/lib/theme";
import { styles } from "./BackButton.styles";

type Props = {
  // Defaults to going back, or to the feed when there's nothing to go back
  // to (a web page opened directly, or a notification deep link).
  onPress?: () => void;
};

// The header back arrow, for screens that would otherwise rely on the
// back-swipe gesture (which web and Android don't have).
export function BackButton({ onPress }: Props) {
  const router = useRouter();
  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  };

  return (
    <TouchableOpacity onPress={onPress ?? goBack} hitSlop={12} style={styles.btn} accessibilityLabel="Go back">
      <Ionicons name="arrow-back" size={22} color={C.text} />
    </TouchableOpacity>
  );
}
