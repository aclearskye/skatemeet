import { supabase } from "@/lib/supabaseClient";
import { invokeStorefront } from "./storefrontClient";
import { toCommerceError, type AddToCartPayload, type ConnectStorefrontPayload } from "./types";

export async function connectStorefront(payload: ConnectStorefrontPayload): Promise<void> {
  await invokeStorefront({ action: "connect", ...payload });
}

export async function disconnectStorefront(): Promise<void> {
  const { error } = await supabase.rpc("disconnect_my_storefront");
  if (error) throw toCommerceError(error);
}

export async function addToCart({ storeOwnerId, product, variant, quantity }: AddToCartPayload): Promise<void> {
  const imageUrl = variant.imageUrl ?? product.images[0] ?? null;
  const { error } = await supabase.rpc("add_to_cart", {
    p_store_owner_id: storeOwnerId,
    p_product_id: product.id,
    p_variant_id: variant.id,
    p_quantity: quantity,
    p_title: product.title,
    p_variant_title: variant.title,
    p_price_amount: variant.price?.amount ?? null,
    p_currency: variant.price?.currency ?? null,
    p_image_url: imageUrl?.startsWith("https://") ? imageUrl : null,
  });
  if (error) throw toCommerceError(error);
}

// 0 removes the item.
export async function setCartItemQuantity(cartItemId: string, quantity: number): Promise<void> {
  const { error } = await supabase.rpc("set_cart_item_quantity", { p_cart_item_id: cartItemId, p_quantity: quantity });
  if (error) throw toCommerceError(error);
}

export async function clearStoreCart(storeOwnerId: string): Promise<void> {
  const { error } = await supabase.rpc("clear_store_cart", { p_store_owner_id: storeOwnerId });
  if (error) throw toCommerceError(error);
}

// The store's own hosted checkout URL for this store's cart lines.
export async function createCheckout(storeOwnerId: string): Promise<string> {
  const { url } = await invokeStorefront<{ url: string }>({ action: "checkout", storeOwnerId });
  return url;
}
