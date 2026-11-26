import { useMemo, useState } from "react";
import { ActivityIndicator, Image, Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCartActions } from "@/lib/commerce/hooks/useCartActions";
import { useStoreProduct } from "@/lib/commerce/hooks/useStoreProduct";
import { CommerceError, formatMoney, type ProductDetail, type ProductVariant, type StoreShop } from "@/lib/commerce/types";
import { C } from "@/lib/theme";
import { QuantityStepper } from "@/components/commerce/QuantityStepper";
import { styles } from "./ProductSheet.styles";

type Props = {
  storeOwnerId: string;
  productId: string | null;
  shop: StoreShop;
  onClose: () => void;
};

const BLOCKED_MESSAGES = {
  store: "This store isn't selling through SkateMeet right now.",
  account: "Buying is for Adult skater accounts. You can still browse.",
} as const;

// The variant matching every chosen option, if there is one.
function matchVariant(product: ProductDetail, chosen: Record<string, string>): ProductVariant | null {
  return product.variants.find((v) => product.options.every((o) => v.options[o.name] === chosen[o.name])) ?? null;
}

// One product from a store's Shopify or WooCommerce: pick a variant and a
// quantity, then add it to the cart.
export function ProductSheet({ storeOwnerId, productId, shop, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { data: product, isLoading, isError } = useStoreProduct(storeOwnerId, productId);

  return (
    <Modal visible={productId != null} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} hitSlop={12} accessibilityLabel="Close">
            <Ionicons name="close" size={24} color={C.text} />
          </TouchableOpacity>
        </View>
        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={C.primary} />
          </View>
        ) : isError || !product ? (
          <View style={styles.centered}>
            <Text style={styles.muted}>THIS PRODUCT ISN&apos;T AVAILABLE</Text>
          </View>
        ) : (
          <ProductBody key={product.id} storeOwnerId={storeOwnerId} product={product} shop={shop} onClose={onClose} />
        )}
      </View>
    </Modal>
  );
}

function ProductBody({
  storeOwnerId,
  product,
  shop,
  onClose,
}: {
  storeOwnerId: string;
  product: ProductDetail;
  shop: StoreShop;
  onClose: () => void;
}) {
  const router = useRouter();
  const { add } = useCartActions();
  const firstAvailable = product.variants.find((v) => v.available) ?? product.variants[0];
  const [chosen, setChosen] = useState<Record<string, string>>(firstAvailable?.options ?? {});
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  const variant = useMemo(() => matchVariant(product, chosen), [product, chosen]);
  const images = variant?.imageUrl && !product.images.includes(variant.imageUrl)
    ? [variant.imageUrl, ...product.images]
    : product.images;
  const blocked = shop.blockedReason;

  const handleAdd = () => {
    if (!variant) return;
    setMessage(null);
    add.mutate(
      { storeOwnerId, product, variant, quantity },
      {
        onSuccess: () => setMessage({ text: "Added to your cart.", isError: false }),
        onError: (err) =>
          setMessage({ text: err instanceof CommerceError ? err.message : "Couldn't add it. Try again.", isError: true }),
      }
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {images.length > 0 ? (
        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={styles.gallery}>
          {images.map((url) => (
            <Image key={url} source={{ uri: url }} style={styles.image} resizeMode="cover" />
          ))}
        </ScrollView>
      ) : null}

      <Text style={styles.title}>{product.title}</Text>
      <Text style={styles.price}>
        {variant ? (variant.price ? formatMoney(variant.price) : "") : "Not available in this combination"}
      </Text>

      {product.options.map((option) => (
        <View key={option.name} style={styles.option}>
          <Text style={styles.optionLabel}>{option.name.toUpperCase()}</Text>
          <View style={styles.chips}>
            {option.values.map((value) => {
              const selected = chosen[option.name] === value;
              return (
                <TouchableOpacity
                  key={value}
                  style={[styles.chip, selected && styles.chipSelected]}
                  onPress={() => setChosen((prev) => ({ ...prev, [option.name]: value }))}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{value}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ))}

      {blocked ? (
        <Text style={styles.blocked}>{BLOCKED_MESSAGES[blocked]}</Text>
      ) : (
        <View style={styles.buyRow}>
          <QuantityStepper value={quantity} onChange={setQuantity} />
          <TouchableOpacity
            style={[styles.addBtn, (!variant?.available || add.isPending) && styles.addBtnDisabled]}
            onPress={handleAdd}
            disabled={!variant?.available || add.isPending}
            activeOpacity={0.8}
          >
            {add.isPending ? (
              <ActivityIndicator color={C.onPrimary} />
            ) : (
              <Text style={styles.addText}>{variant?.available ? "ADD TO CART" : "SOLD OUT"}</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {message ? (
        <View style={styles.messageRow}>
          <Text style={[styles.message, message.isError && styles.messageError]}>{message.text}</Text>
          {!message.isError ? (
            <TouchableOpacity
              onPress={() => {
                onClose();
                router.push("/cart" as never);
              }}
            >
              <Text style={styles.link}>VIEW CART</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      {product.description ? <Text style={styles.description}>{product.description}</Text> : null}
      <Text style={styles.note}>Checkout happens on the store&apos;s own website, at the price it shows there.</Text>
    </ScrollView>
  );
}
