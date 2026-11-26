import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { TapeColors } from "@/lib/shared/tapeLabels";
import { DuctTapeLabel } from "@/components/common/DuctTapeLabel";
import { styles } from "./StoreAnnouncement.styles";

type Props = {
  text: string;
  accent: TapeColors;
};

// The owner's pinned notice, taped across the top of the store page
// ("Closed Saturday for a comp").
export function StoreAnnouncement({ text, accent }: Props) {
  return (
    <DuctTapeLabel color={accent.bg} maxTilt={0.8} style={styles.tape} accessibilityLabel={`Notice: ${text}`}>
      <View style={styles.row}>
        <Ionicons name="megaphone-outline" size={16} color={accent.fg} />
        <Text style={[styles.text, { color: accent.fg }]}>{text}</Text>
      </View>
    </DuctTapeLabel>
  );
}
