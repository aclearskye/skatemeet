import { Image, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNearbyStores } from "@/lib/storeAccounts/hooks/useNearbyStores";
import { useOpenStorePage } from "@/lib/storeAccounts/hooks/useOpenStorePage";
import { storeImageUrl } from "@/lib/storeAccounts/queries";
import type { NearbyStore } from "@/lib/storeAccounts/types";
import { C } from "@/lib/theme";
import { styles } from "./NearbyStoresRow.styles";

type Props = {
  coords: { lat: number; lng: number } | null;
};

function distanceLabel(meters: number): string {
  return meters < 1000 ? `${Math.round(meters / 10) * 10} M` : `${(meters / 1000).toFixed(meters < 10000 ? 1 : 0)} KM`;
}

// Claimed stores near the search point, at their fixed addresses. Renders
// nothing when there are none.
export function NearbyStoresRow({ coords }: Props) {
  const { data: stores = [] } = useNearbyStores(coords);
  const { openStorePage, isOpening } = useOpenStorePage();

  if (stores.length === 0) return null;

  const open = (store: NearbyStore) => {
    if (!isOpening) openStorePage({ storeId: store.storeId, osmPlaceId: store.osmPlaceId }).catch(() => {});
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>STORES NEARBY</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {stores.map((store) => (
          <TouchableOpacity key={store.profileId} style={styles.chip} onPress={() => open(store)} activeOpacity={0.8}>
            {store.logoPath ? (
              <Image source={{ uri: storeImageUrl(store.logoPath) }} style={styles.logo} />
            ) : (
              <View style={[styles.logo, styles.logoPlaceholder]}>
                <Ionicons name="storefront-outline" size={14} color={C.muted} />
              </View>
            )}
            <View>
              <Text style={styles.name} numberOfLines={1}>
                {store.name}
              </Text>
              <Text style={styles.distance}>{distanceLabel(store.meters)}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}
