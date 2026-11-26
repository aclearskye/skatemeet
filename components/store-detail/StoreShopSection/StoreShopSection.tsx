import { useState } from "react";
import { ActivityIndicator, Image, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useStoreProducts } from "@/lib/commerce/hooks/useStoreProducts";
import { useDebouncedValue } from "@/lib/shared/hooks/useDebouncedValue";
import { useStoreShop } from "@/lib/commerce/hooks/useStoreShop";
import { formatMoney } from "@/lib/commerce/types";
import { C } from "@/lib/theme";
import { ProductSheet } from "@/components/commerce/ProductSheet";
import { styles } from "./StoreShopSection.styles";

type Props = {
  storeOwnerId: string;
};

const SEARCH_DELAY_MS = 350;

// A claimed store's products, live from its Shopify or WooCommerce. Renders
// nothing when the store hasn't connected a shop.
export function StoreShopSection({ storeOwnerId }: Props) {
  const { data: shop } = useStoreShop(storeOwnerId);
  const [search, setSearch] = useState("");
  const query = useDebouncedValue(search.trim(), SEARCH_DELAY_MS);
  const [openProductId, setOpenProductId] = useState<string | null>(null);
  const products = useStoreProducts(storeOwnerId, query, shop != null);

  if (!shop) return null;

  const items = products.data?.pages.flatMap((page) => page.products) ?? [];

  return (
    <View style={styles.section}>
      <Text style={styles.label}>SHOP</Text>
      {shop.blockedReason === "store" ? (
        <Text style={styles.notice}>This store isn&apos;t selling through SkateMeet right now. You can still browse.</Text>
      ) : null}

      <View style={styles.search}>
        <Ionicons name="search-outline" size={16} color={C.muted} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search this shop"
          placeholderTextColor={C.muted}
          returnKeyType="search"
        />
      </View>

      {products.isLoading ? (
        <ActivityIndicator color={C.primary} style={styles.loading} />
      ) : products.isError ? (
        <Text style={styles.notice}>Couldn&apos;t load this shop&apos;s products.</Text>
      ) : items.length === 0 ? (
        <Text style={styles.notice}>{query ? "No products match that search." : "No products yet."}</Text>
      ) : (
        <View style={styles.grid}>
          {items.map((product) => (
            <TouchableOpacity
              key={product.id}
              style={styles.card}
              onPress={() => setOpenProductId(product.id)}
              activeOpacity={0.8}
            >
              {product.imageUrl ? (
                <Image source={{ uri: product.imageUrl }} style={styles.image} resizeMode="cover" />
              ) : (
                <View style={[styles.image, styles.imagePlaceholder]}>
                  <Ionicons name="pricetag-outline" size={22} color={C.muted} />
                </View>
              )}
              <Text style={styles.title} numberOfLines={2}>
                {product.title}
              </Text>
              <Text style={[styles.price, !product.available && styles.soldOut]}>
                {product.available ? formatMoney(product.price) : "SOLD OUT"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {products.hasNextPage ? (
        <TouchableOpacity
          style={styles.more}
          onPress={() => products.fetchNextPage()}
          disabled={products.isFetchingNextPage}
        >
          {products.isFetchingNextPage ? (
            <ActivityIndicator color={C.primary} />
          ) : (
            <Text style={styles.moreText}>LOAD MORE</Text>
          )}
        </TouchableOpacity>
      ) : null}

      <ProductSheet
        storeOwnerId={storeOwnerId}
        productId={openProductId}
        shop={shop}
        onClose={() => setOpenProductId(null)}
      />
    </View>
  );
}
