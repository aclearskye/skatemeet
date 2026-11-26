import { useState } from "react";
import { ActivityIndicator, Image, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useCartActions } from "@/lib/commerce/hooks/useCartActions";
import { CommerceError, formatMoney, type CartStoreGroup } from "@/lib/commerce/types";
import { useOpenStorePage } from "@/lib/storeAccounts/hooks/useOpenStorePage";
import { storeImageUrl } from "@/lib/storeAccounts/queries";
import { C } from "@/lib/theme";
import { QuantityStepper } from "@/components/commerce/QuantityStepper";
import { styles } from "./CartStoreGroupCard.styles";

type Props = {
  group: CartStoreGroup;
};

// The subtotal from the prices shown when each item was added, when they
// share one currency. The store's checkout shows the real total.
function estimatedSubtotal(group: CartStoreGroup): string | null {
  const currencies = new Set(group.items.map((i) => i.currency));
  if (currencies.size !== 1 || group.items.some((i) => i.priceAmount == null)) return null;
  const amount = group.items.reduce((sum, i) => sum + (i.priceAmount ?? 0) * i.quantity, 0);
  return formatMoney({ amount, currency: group.items[0].currency! });
}

// One store's part of the cart, checked out on its own at that store.
export function CartStoreGroupCard({ group }: Props) {
  const { setQuantity, clearStore, checkout } = useCartActions();
  const { openStorePage } = useOpenStorePage();
  const [error, setError] = useState<string | null>(null);
  const [checkedOut, setCheckedOut] = useState(false);
  const subtotal = estimatedSubtotal(group);

  const handleCheckout = () => {
    setError(null);
    checkout.mutate(group.storeOwnerId, {
      onSuccess: () => setCheckedOut(true),
      onError: (err) => setError(err instanceof CommerceError ? err.message : "Checkout couldn't start. Try again."),
    });
  };

  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.storeRow}
        onPress={() => openStorePage({ storeId: group.storeId, osmPlaceId: group.osmPlaceId }).catch(() => {})}
        activeOpacity={0.8}
      >
        {group.logoPath ? (
          <Image source={{ uri: storeImageUrl(group.logoPath) }} style={styles.logo} />
        ) : (
          <View style={[styles.logo, styles.logoPlaceholder]}>
            <Ionicons name="storefront-outline" size={16} color={C.muted} />
          </View>
        )}
        <Text style={styles.storeName} numberOfLines={1}>
          {group.storeName}
        </Text>
        <Ionicons name="chevron-forward" size={16} color={C.muted} />
      </TouchableOpacity>

      {group.items.map((item) => (
        <View key={item.cartItemId} style={styles.item}>
          {item.imageUrl ? (
            <Image source={{ uri: item.imageUrl }} style={styles.itemImage} />
          ) : (
            <View style={[styles.itemImage, styles.logoPlaceholder]}>
              <Ionicons name="pricetag-outline" size={16} color={C.muted} />
            </View>
          )}
          <View style={styles.itemText}>
            <Text style={styles.itemTitle} numberOfLines={2}>
              {item.title}
            </Text>
            {item.variantTitle ? <Text style={styles.itemMeta}>{item.variantTitle}</Text> : null}
            {item.priceAmount != null && item.currency ? (
              <Text style={styles.itemPrice}>{formatMoney({ amount: item.priceAmount, currency: item.currency })}</Text>
            ) : null}
          </View>
          <QuantityStepper
            value={item.quantity}
            min={0}
            onChange={(quantity) => setQuantity.mutate({ cartItemId: item.cartItemId, quantity })}
            disabled={setQuantity.isPending}
          />
        </View>
      ))}

      {subtotal ? <Text style={styles.subtotal}>About {subtotal}. The store&apos;s checkout shows the final total.</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {group.canCheckout ? (
        <TouchableOpacity
          style={[styles.checkoutBtn, checkout.isPending && styles.disabled]}
          onPress={handleCheckout}
          disabled={checkout.isPending}
          activeOpacity={0.8}
        >
          {checkout.isPending ? (
            <ActivityIndicator color={C.onPrimary} />
          ) : (
            <Text style={styles.checkoutText} numberOfLines={1}>
              CHECKOUT AT {group.storeName.toUpperCase()}
            </Text>
          )}
        </TouchableOpacity>
      ) : (
        <Text style={styles.error}>This store isn&apos;t selling through SkateMeet right now.</Text>
      )}

      {checkedOut ? (
        <View style={styles.doneRow}>
          <Text style={styles.doneText}>Finished checking out?</Text>
          <TouchableOpacity onPress={() => clearStore.mutate(group.storeOwnerId)} disabled={clearStore.isPending}>
            <Text style={styles.link}>CLEAR THESE ITEMS</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}
