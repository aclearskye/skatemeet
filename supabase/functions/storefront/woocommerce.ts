import {
  StorefrontError,
  plainText,
  type CheckoutLine,
  type Money,
  type ProductDetail,
  type ProductPage,
  type ShopInfo,
  type StorefrontProvider,
} from "./types.ts";

// WooCommerce. Products come from the public Store API (wc/store/v1). The
// read-only REST key (wc/v3) is only used to prove the owner controls the
// site. Checkout uses WooCommerce's shareable checkout links
// (/checkout-link/?products=ID:QTY,...), which need a recent WooCommerce;
// older sites fall back to the classic single-product add-to-cart link.
const PAGE_SIZE = 20;
const MAX_VARIATIONS = 40;

export type WooCredential = { consumerKey: string; consumerSecret: string };

// The site's https origin, or throws. The edge function fetches whatever
// this is, so private and local hosts are refused.
export function normaliseWooSite(input: string): string {
  let url: URL;
  try {
    url = new URL(input.trim().match(/^https?:\/\//i) ? input.trim() : `https://${input.trim()}`);
  } catch {
    throw new StorefrontError("INVALID_DOMAIN");
  }
  const host = url.hostname.toLowerCase();
  const isIp = /^[\d.]+$/.test(host) || host.includes(":");
  if (
    url.protocol !== "https:" ||
    isIp ||
    !host.includes(".") ||
    host === "localhost" ||
    /\.(local|localhost|internal|lan|home|arpa)$/.test(host) ||
    url.port !== ""
  ) {
    throw new StorefrontError("INVALID_DOMAIN");
  }
  // WordPress can live under a path (example.com/shop), so keep it.
  return `https://${host}${url.pathname.replace(/\/+$/, "")}`;
}

type StoreApiPrices = { price: string; currency_code: string; currency_minor_unit: number };
type StoreApiProduct = {
  id: number;
  name: string;
  type: string;
  description: string;
  short_description: string;
  images: { src: string }[];
  prices: StoreApiPrices;
  is_in_stock: boolean;
  is_purchasable: boolean;
  attributes: { name: string; has_variations: boolean; terms: { name: string; slug: string }[] }[];
  variations: { id: number; attributes: { name: string; value: string }[] }[];
};

function money(prices: StoreApiPrices | undefined): Money | null {
  if (!prices?.price) return null;
  return { amount: Number(prices.price) / 10 ** (prices.currency_minor_unit ?? 2), currency: prices.currency_code };
}

export class WooCommerceProvider implements StorefrontProvider {
  constructor(private site: string, private credential: WooCredential) {}

  private async storeApi<T>(path: string): Promise<{ body: T; res: Response }> {
    const res = await fetch(`${this.site}/wp-json/wc/store/v1${path}`, { headers: { Accept: "application/json" } });
    if (res.status === 404) throw new StorefrontError("PRODUCT_NOT_FOUND", 404);
    if (!res.ok) throw new StorefrontError("SHOP_UNAVAILABLE", 502);
    return { body: (await res.json()) as T, res };
  }

  async verify(): Promise<ShopInfo> {
    // A read-only key can read products; a wrong or missing key gets 401.
    const auth = btoa(`${this.credential.consumerKey}:${this.credential.consumerSecret}`);
    const res = await fetch(`${this.site}/wp-json/wc/v3/products?per_page=1`, {
      headers: { Authorization: `Basic ${auth}`, Accept: "application/json" },
    });
    if (res.status === 401 || res.status === 403) throw new StorefrontError("INVALID_CREDENTIALS");
    if (res.status === 404) throw new StorefrontError("SHOP_NOT_FOUND");
    if (!res.ok) throw new StorefrontError("SHOP_UNAVAILABLE", 502);

    // The public Store API must be on too, since that's what the app reads.
    const { body } = await this.storeApi<StoreApiProduct[]>("/products?per_page=1");
    let name: string | null = null;
    try {
      const root = await fetch(`${this.site}/wp-json/`);
      if (root.ok) name = ((await root.json()) as { name?: string }).name ?? null;
    } catch {
      // The site name is cosmetic.
    }
    return { name, currency: body[0]?.prices?.currency_code ?? null };
  }

  async listProducts(query: string, cursor: string | null): Promise<ProductPage> {
    const page = cursor ? Number(cursor) : 1;
    if (!Number.isInteger(page) || page < 1) throw new StorefrontError("INVALID_CURSOR");
    const params = new URLSearchParams({ per_page: String(PAGE_SIZE), page: String(page) });
    if (query) params.set("search", query);
    const { body, res } = await this.storeApi<StoreApiProduct[]>(`/products?${params}`);
    const totalPages = Number(res.headers.get("X-WP-TotalPages") ?? "1");
    return {
      products: body.map((p) => ({
        id: String(p.id),
        title: plainText(p.name),
        imageUrl: p.images[0]?.src ?? null,
        price: money(p.prices),
        available: p.is_in_stock && p.is_purchasable,
      })),
      nextCursor: page < totalPages ? String(page + 1) : null,
    };
  }

  async getProduct(productId: string): Promise<ProductDetail> {
    if (!/^\d+$/.test(productId)) throw new StorefrontError("PRODUCT_NOT_FOUND", 404);
    const { body: p } = await this.storeApi<StoreApiProduct>(`/products/${productId}`);
    const base = {
      id: String(p.id),
      title: plainText(p.name),
      description: plainText(p.description || p.short_description),
      images: p.images.map((i) => i.src),
    };

    if (p.type !== "variable" || p.variations.length === 0) {
      return {
        ...base,
        options: [],
        variants: [{
          id: String(p.id),
          title: "",
          available: p.is_in_stock && p.is_purchasable,
          price: money(p.prices),
          imageUrl: p.images[0]?.src ?? null,
          options: {},
        }],
      };
    }

    // Variations name their attribute values by slug ("large"); the options
    // list uses display names ("Large"). Map slugs back to names.
    const termName = (attribute: string, value: string) =>
      p.attributes
        .find((a) => a.name.toLowerCase() === attribute.toLowerCase())
        ?.terms.find((t) => t.slug === value || t.name === value)?.name ?? value;

    // Each variation is its own Store API product (its price and stock).
    const variations = await Promise.all(
      p.variations.slice(0, MAX_VARIATIONS).map(async (v) => {
        const { body: vp } = await this.storeApi<StoreApiProduct>(`/products/${v.id}`);
        const named = v.attributes.map((a) => [a.name, termName(a.name, a.value)] as const);
        const options = Object.fromEntries(named);
        return {
          id: String(v.id),
          title: named.map(([, value]) => value).join(" / "),
          available: vp.is_in_stock && vp.is_purchasable,
          price: money(vp.prices),
          imageUrl: vp.images[0]?.src ?? p.images[0]?.src ?? null,
          options,
        };
      })
    );
    const options = p.attributes
      .filter((a) => a.has_variations)
      .map((a) => ({ name: a.name, values: a.terms.map((t) => t.name) }));
    return { ...base, options, variants: variations };
  }

  async checkoutUrl(lines: CheckoutLine[]): Promise<string> {
    if (lines.some((l) => !/^\d+$/.test(l.variantId))) throw new StorefrontError("CHECKOUT_FAILED", 422);
    const products = lines.map((l) => `${l.variantId}:${l.quantity}`).join(",");
    const link = `${this.site}/checkout-link/?products=${encodeURIComponent(products)}`;
    // Older WooCommerce has no checkout links (the page 404s). Then only a
    // single item can be handed over, via the classic add-to-cart link.
    const probe = await fetch(link, { method: "GET", redirect: "manual" });
    if (probe.status !== 404) return link;
    if (lines.length === 1) {
      return `${this.site}/checkout/?add-to-cart=${lines[0].variantId}&quantity=${lines[0].quantity}`;
    }
    throw new StorefrontError("WOO_MULTI_ITEM_UNSUPPORTED", 422);
  }
}
