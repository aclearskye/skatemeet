// Store commerce (docs/ACCOUNT_TYPES.md, "Store", Commerce / Cart). Products
// are read live from a store's Shopify or WooCommerce through the
// storefront edge function; the cart is server-side (cart_items).

export type StorefrontProvider = "shopify" | "woocommerce";

export type Money = { amount: number; currency: string };

export type ProductSummary = {
  id: string;
  title: string;
  imageUrl: string | null;
  price: Money | null;
  available: boolean;
};

export type ProductPage = { products: ProductSummary[]; nextCursor: string | null };

export type ProductVariant = {
  id: string;
  title: string;
  available: boolean;
  price: Money | null;
  imageUrl: string | null;
  options: Record<string, string>;
};

export type ProductDetail = {
  id: string;
  title: string;
  description: string;
  images: string[];
  options: { name: string; values: string[] }[];
  variants: ProductVariant[];
};

// What a viewer's store page shows (get_store_shop). Null: no shop.
export type StoreShop = {
  provider: StorefrontProvider;
  currency: string | null;
  storeCanSell: boolean;
  viewerCanBuy: boolean;
  // Why buying is off: the store isn't selling (unpaid), or the viewer's
  // account can't buy (a Child or a Store account).
  blockedReason: "store" | "account" | null;
};

export type MyStorefront = {
  provider: StorefrontProvider;
  shopDomain: string;
  shopName: string | null;
  currency: string | null;
  connectedAt: string;
};

export type ConnectStorefrontPayload =
  | { provider: "shopify"; domain: string; token: string }
  | { provider: "woocommerce"; domain: string; consumerKey: string; consumerSecret: string };

export type CartItem = {
  cartItemId: string;
  productId: string;
  variantId: string;
  quantity: number;
  title: string;
  variantTitle: string | null;
  priceAmount: number | null;
  currency: string | null;
  imageUrl: string | null;
};

export type CartStoreGroup = {
  storeOwnerId: string;
  storeName: string;
  logoPath: string | null;
  storeId: string | null;
  osmPlaceId: string | null;
  canCheckout: boolean;
  items: CartItem[];
};

export type AddToCartPayload = {
  storeOwnerId: string;
  product: ProductDetail;
  variant: ProductVariant;
  quantity: number;
};

export function formatMoney(money: Money | null): string {
  if (!money) return "";
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: money.currency }).format(money.amount);
  } catch {
    return `${money.amount.toFixed(2)} ${money.currency}`;
  }
}

export class CommerceError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = "CommerceError";
  }
}

const ERROR_MESSAGES: Record<string, string> = {
  NOT_STORE_ACCOUNT: "Only a business account can connect a shop.",
  STORE_NOT_APPROVED: "Your store needs to be approved, and its subscription paid, to connect a shop.",
  INVALID_PROVIDER: "Pick Shopify or WooCommerce.",
  INVALID_DOMAIN: "Check the shop address.",
  INVALID_CREDENTIALS: "That token or key didn't work. Check it and try again.",
  SHOP_NOT_FOUND: "No shop was found at that address.",
  SHOP_UNAVAILABLE: "The shop isn't responding right now. Try again in a minute.",
  SHOP_NOT_CONNECTED: "This store's shop isn't available.",
  PRODUCT_NOT_FOUND: "That product isn't available any more.",
  CANNOT_BUY: "Your account can't buy from stores.",
  STORE_NOT_SELLING: "This store isn't selling through SkateMeet right now.",
  INVALID_QUANTITY: "Pick a quantity between 1 and 99.",
  CART_FULL: "Your cart is full. Check out or remove something first.",
  CART_EMPTY: "There's nothing in your cart for this store.",
  CHECKOUT_FAILED: "Checkout couldn't start. Some items may have sold out.",
  WOO_MULTI_ITEM_UNSUPPORTED: "This shop can only check out one item at a time. Remove the others first.",
};

export function toCommerceError(error: { message?: string }): CommerceError {
  const raw = error.message ?? "";
  const code = Object.keys(ERROR_MESSAGES).find((key) => raw.includes(key));
  return code
    ? new CommerceError(code, ERROR_MESSAGES[code])
    : new CommerceError("UNKNOWN", "Something went wrong. Try again.");
}
