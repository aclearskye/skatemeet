import { Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCart } from "@/lib/commerce/hooks/useCart";
import { useCanUseCart } from "@/lib/commerce/hooks/useCanUseCart";
import { C } from "@/lib/theme";
import { styles } from "./CartButton.styles";

// Opens the Cart, with the item count. Hidden for accounts that can't buy
// (Children and Store accounts).
export function CartButton() {
  const router = useRouter();
  const canUseCart = useCanUseCart();
  const { itemCount } = useCart();

  if (!canUseCart) return null;

  return (
    <TouchableOpacity
      onPress={() => router.push("/cart" as never)}
      hitSlop={10}
      accessibilityLabel={itemCount > 0 ? `Cart, ${itemCount} items` : "Cart"}
    >
      <Ionicons name="cart-outline" size={24} color={C.text} />
      {itemCount > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{itemCount > 99 ? "99+" : itemCount}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}
