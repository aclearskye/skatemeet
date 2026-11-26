import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCanUseCart } from "@/lib/commerce/hooks/useCanUseCart";
import { useCart } from "@/lib/commerce/hooks/useCart";
import { C, F } from "@/lib/theme";
import { CartStoreGroupCard } from "@/components/commerce/CartStoreGroupCard";
import { BackButton } from "@/components/common/BackButton";

// Everything the user has added across stores, grouped by store. Each store
// is checked out separately, on its own Shopify or WooCommerce checkout.
export default function CartScreen() {
  const insets = useSafeAreaInsets();
  const canUseCart = useCanUseCart();
  const { data: groups = [], isLoading, isError } = useCart();

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <BackButton />
        <View style={styles.headerText}>
          <Text style={styles.heading}>CART</Text>
          <Text style={styles.subheading}>{"// check out one store at a time"}</Text>
        </View>
      </View>

      {!canUseCart ? (
        <View style={styles.centered}>
          <Text style={styles.muted}>BUYING IS FOR ADULT SKATER ACCOUNTS</Text>
        </View>
      ) : isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={C.primary} />
        </View>
      ) : isError ? (
        <View style={styles.centered}>
          <Text style={styles.muted}>COULDN&apos;T LOAD YOUR CART</Text>
        </View>
      ) : groups.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.muted}>YOUR CART IS EMPTY</Text>
          <Text style={styles.hint}>Add products from a store&apos;s page.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}>
          {groups.map((group) => (
            <CartStoreGroupCard key={group.storeOwnerId} group={group} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: C.border,
  },
  headerText: { flex: 1, gap: 2 },
  heading: { fontFamily: F.heading, fontSize: 20, color: C.text, letterSpacing: 2 },
  subheading: { fontFamily: F.monoRegular, fontSize: 13, color: C.muted, letterSpacing: 0.5 },
  list: { padding: 16, gap: 16 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", gap: 8, paddingHorizontal: 24 },
  muted: { fontFamily: F.mono, fontSize: 11, color: C.muted, letterSpacing: 2, textAlign: "center" },
  hint: { fontFamily: F.body, fontSize: 13, color: C.muted },
});
