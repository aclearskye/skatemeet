import { Image, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { storeImageUrl } from "@/lib/storeAccounts/queries";
import { distanceLabel, type StoreListItem } from "@/lib/storeAccounts/types";
import { C } from "@/lib/theme";
import { styles } from "./StoreListRow.styles";

type Props = {
  store: StoreListItem;
  meters?: number;
  // An extra line under the address, e.g. when it was last visited.
  detail?: string;
  onPress: () => void;
};

// One store in a list: logo, name, address and (when known) distance.
export function StoreListRow({ store, meters, detail, onPress }: Props) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.8}>
      {store.logoPath ? (
        <Image source={{ uri: storeImageUrl(store.logoPath) }} style={styles.logo} />
      ) : (
        <View style={[styles.logo, styles.logoPlaceholder]}>
          <Ionicons name="storefront-outline" size={20} color={C.muted} />
        </View>
      )}
      <View style={styles.text}>
        <Text style={styles.name} numberOfLines={1}>
          {store.name}
        </Text>
        {store.address ? (
          <Text style={styles.address} numberOfLines={1}>
            {store.address}
          </Text>
        ) : null}
        {detail ? <Text style={styles.detail}>{detail}</Text> : null}
      </View>
      {meters != null ? <Text style={styles.distance}>{distanceLabel(meters)}</Text> : null}
      <Ionicons name="chevron-forward" size={16} color={C.muted} />
    </TouchableOpacity>
  );
}
