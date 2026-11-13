import { Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ClaimedStoreSummary } from "@/lib/storeAccounts/types";
import { C } from "@/lib/theme";
import { styles } from "./ClaimedStoreSummaryCard.styles";

type Props = {
  store: ClaimedStoreSummary;
  onChange?: () => void;
};

export function ClaimedStoreSummaryCard({ store, onChange }: Props) {
  return (
    <View style={styles.card}>
      <Ionicons name="storefront-outline" size={22} color={C.primary} />
      <View style={styles.text}>
        <Text style={styles.name}>{store.name}</Text>
        {store.address ? <Text style={styles.meta}>{store.address}</Text> : null}
        {store.createdByMe ? <Text style={styles.meta}>New store, hidden until approved</Text> : null}
      </View>
      {onChange ? (
        <TouchableOpacity onPress={onChange} hitSlop={8}>
          <Text style={styles.change}>CHANGE</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
