import { supabase } from "@/lib/supabaseClient";
import { invokeStorefront } from "./storefrontClient";
import {
  toCommerceError,
  type CartStoreGroup,
  type MyStorefront,
  type ProductDetail,
  type ProductPage,
  type StoreShop,
  type StorefrontProvider,
} from "./types";

export function fetchStoreProducts(storeOwnerId: string, query: string, cursor: string | null): Promise<ProductPage> {
  return invokeStorefront<ProductPage>({ action: "products", storeOwnerId, query, cursor });
}

export function fetchStoreProduct(storeOwnerId: string, productId: string): Promise<ProductDetail> {
  return invokeStorefront<ProductDetail>({ action: "product", storeOwnerId, productId });
}

type StoreShopRow = {
  provider: StorefrontProvider;
  currency: string | null;
  store_can_sell: boolean;
  viewer_can_buy: boolean;
  blocked_reason: "store" | "account" | null;
};

export async function fetchStoreShop(storeOwnerId: string): Promise<StoreShop | null> {
  const { data, error } = await supabase.rpc("get_store_shop", { p_owner: storeOwnerId });
  if (error) throw toCommerceError(error);
  const row = data as StoreShopRow | null;
  if (!row) return null;
  return {
    provider: row.provider,
    currency: row.currency,
    storeCanSell: row.store_can_sell,
    viewerCanBuy: row.viewer_can_buy,
    blockedReason: row.blocked_reason,
  };
}

type MyStorefrontRow = {
  provider: StorefrontProvider;
  shop_domain: string;
  shop_name: string | null;
  currency: string | null;
  connected_at: string;
};

export async function fetchMyStorefront(): Promise<MyStorefront | null> {
  const { data, error } = await supabase.rpc("get_my_storefront");
  if (error) throw toCommerceError(error);
  const row = data as MyStorefrontRow | null;
  if (!row) return null;
  return {
    provider: row.provider,
    shopDomain: row.shop_domain,
    shopName: row.shop_name,
    currency: row.currency,
    connectedAt: row.connected_at,
  };
}

type CartGroupRow = {
  store_owner_id: string;
  store_name: string;
  logo_path: string | null;
  store_id: string | null;
  osm_place_id: string | null;
  can_checkout: boolean;
  items: {
    cart_item_id: string;
    product_id: string;
    variant_id: string;
    quantity: number;
    title: string;
    variant_title: string | null;
    price_amount: number | null;
    currency: string | null;
    image_url: string | null;
  }[];
};

export async function fetchMyCart(): Promise<CartStoreGroup[]> {
  const { data, error } = await supabase.rpc("get_my_cart");
  if (error) throw toCommerceError(error);
  return (data as CartGroupRow[]).map((g) => ({
    storeOwnerId: g.store_owner_id,
    storeName: g.store_name,
    logoPath: g.logo_path,
    storeId: g.store_id,
    osmPlaceId: g.osm_place_id,
    canCheckout: g.can_checkout,
    items: g.items.map((i) => ({
      cartItemId: i.cart_item_id,
      productId: i.product_id,
      variantId: i.variant_id,
      quantity: i.quantity,
      title: i.title,
      variantTitle: i.variant_title,
      priceAmount: i.price_amount == null ? null : Number(i.price_amount),
      currency: i.currency,
      imageUrl: i.image_url,
    })),
  }));
}
