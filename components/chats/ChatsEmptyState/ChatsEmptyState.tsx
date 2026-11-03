import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C } from "@/lib/theme";
import { DuctTapeLabel } from "@/components/common/DuctTapeLabel";
import { styles } from "./ChatsEmptyState.styles";

type Props = {
  onFindSkaters: () => void;
};

export function ChatsEmptyState({ onFindSkaters }: Props) {
  return (
    <View style={styles.container}>
      <Ionicons name="chatbubbles-outline" size={44} color={C.muted} />
      <Text style={styles.message}>Find some skaters and you can chat to them here</Text>
      <DuctTapeLabel color={C.primary} style={styles.cta} onPress={onFindSkaters}>
        <Ionicons name="search" size={14} color={C.onPrimary} />
        <Text style={styles.ctaText}>FIND SKATERS</Text>
      </DuctTapeLabel>
    </View>
  );
}
