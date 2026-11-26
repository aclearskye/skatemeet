// The platform-neutral shapes the app sees. Each provider maps its own API
// onto these, so the app and the cart never care which platform a store uses.

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
  // Option name -> value, e.g. { Size: "8.25" }.
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

export type CheckoutLine = { productId: string; variantId: string; quantity: number };

export type ShopInfo = { name: string | null; currency: string | null };

export class StorefrontError extends Error {
  constructor(public code: string, public status = 400) {
    super(code);
  }
}

export interface StorefrontProvider {
  // Checks the credential against the shop. Throws INVALID_CREDENTIALS.
  verify(): Promise<ShopInfo>;
  listProducts(query: string, cursor: string | null): Promise<ProductPage>;
  getProduct(productId: string): Promise<ProductDetail>;
  // The shop's own hosted checkout, pre-filled with these lines.
  checkoutUrl(lines: CheckoutLine[]): Promise<string>;
}

// HTML descriptions to plain text for the app.
export function plainText(html: string | null | undefined): string {
  return (html ?? "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
