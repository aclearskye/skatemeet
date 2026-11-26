import { StorefrontError, plainText, type CheckoutLine, type ProductDetail, type ProductPage, type ShopInfo, type StorefrontProvider } from "./types.ts";

// Shopify Storefront API (GraphQL). The token is a per-store Storefront API
// access token, created in the shop's admin and pasted in by the owner.
const API_VERSION = Deno.env.get("SHOPIFY_API_VERSION") ?? "2026-04";
const PAGE_SIZE = 20;

export const SHOPIFY_DOMAIN = /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/;

type Gql<T> = { data?: T; errors?: { message: string }[] };

export class ShopifyProvider implements StorefrontProvider {
  constructor(private domain: string, private token: string) {
    if (!SHOPIFY_DOMAIN.test(domain)) throw new StorefrontError("INVALID_DOMAIN");
  }

  private async gql<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
    const res = await fetch(`https://${this.domain}/api/${API_VERSION}/graphql.json`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Shopify-Storefront-Access-Token": this.token },
      body: JSON.stringify({ query, variables }),
    });
    if (res.status === 401 || res.status === 403) throw new StorefrontError("INVALID_CREDENTIALS");
    if (res.status === 404) throw new StorefrontError("SHOP_NOT_FOUND");
    if (!res.ok) throw new StorefrontError("SHOP_UNAVAILABLE", 502);
    const body = (await res.json()) as Gql<T>;
    if (body.errors?.length || !body.data) {
      console.error("shopify", body.errors);
      throw new StorefrontError("SHOP_UNAVAILABLE", 502);
    }
    return body.data;
  }

  async verify(): Promise<ShopInfo> {
    const data = await this.gql<{ shop: { name: string; paymentSettings: { currencyCode: string } } }>(
      `{ shop { name paymentSettings { currencyCode } } }`
    );
    return { name: data.shop.name, currency: data.shop.paymentSettings.currencyCode };
  }

  async listProducts(query: string, cursor: string | null): Promise<ProductPage> {
    type Node = {
      id: string;
      title: string;
      availableForSale: boolean;
      featuredImage: { url: string } | null;
      priceRange: { minVariantPrice: { amount: string; currencyCode: string } };
    };
    const data = await this.gql<{
      products: { nodes: Node[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } };
    }>(
      `query Products($first: Int!, $after: String, $query: String) {
        products(first: $first, after: $after, query: $query, sortKey: RELEVANCE) {
          nodes {
            id title availableForSale
            featuredImage { url }
            priceRange { minVariantPrice { amount currencyCode } }
          }
          pageInfo { hasNextPage endCursor }
        }
      }`,
      { first: PAGE_SIZE, after: cursor, query: query || null }
    );
    return {
      products: data.products.nodes.map((n) => ({
        id: n.id,
        title: n.title,
        imageUrl: n.featuredImage?.url ?? null,
        price: { amount: Number(n.priceRange.minVariantPrice.amount), currency: n.priceRange.minVariantPrice.currencyCode },
        available: n.availableForSale,
      })),
      nextCursor: data.products.pageInfo.hasNextPage ? data.products.pageInfo.endCursor : null,
    };
  }

  async getProduct(productId: string): Promise<ProductDetail> {
    if (!productId.startsWith("gid://shopify/Product/")) throw new StorefrontError("PRODUCT_NOT_FOUND", 404);
    type Variant = {
      id: string;
      title: string;
      availableForSale: boolean;
      price: { amount: string; currencyCode: string };
      image: { url: string } | null;
      selectedOptions: { name: string; value: string }[];
    };
    const data = await this.gql<{
      product: {
        id: string;
        title: string;
        descriptionHtml: string;
        images: { nodes: { url: string }[] };
        options: { name: string; optionValues: { name: string }[] }[];
        variants: { nodes: Variant[] };
      } | null;
    }>(
      `query Product($id: ID!) {
        product(id: $id) {
          id title descriptionHtml
          images(first: 10) { nodes { url } }
          options { name optionValues { name } }
          variants(first: 100) {
            nodes { id title availableForSale price { amount currencyCode } image { url } selectedOptions { name value } }
          }
        }
      }`,
      { id: productId }
    );
    const p = data.product;
    if (!p) throw new StorefrontError("PRODUCT_NOT_FOUND", 404);
    // Shopify gives a lone "Title / Default Title" option to products without variants.
    const options = p.options
      .filter((o) => !(o.name === "Title" && o.optionValues.length === 1 && o.optionValues[0].name === "Default Title"))
      .map((o) => ({ name: o.name, values: o.optionValues.map((v) => v.name) }));
    return {
      id: p.id,
      title: p.title,
      description: plainText(p.descriptionHtml),
      images: p.images.nodes.map((i) => i.url),
      options,
      variants: p.variants.nodes.map((v) => ({
        id: v.id,
        title: v.title === "Default Title" ? "" : v.title,
        available: v.availableForSale,
        price: { amount: Number(v.price.amount), currency: v.price.currencyCode },
        imageUrl: v.image?.url ?? null,
        options: Object.fromEntries(v.selectedOptions.map((o) => [o.name, o.value])),
      })),
    };
  }

  async checkoutUrl(lines: CheckoutLine[]): Promise<string> {
    const data = await this.gql<{
      cartCreate: { cart: { checkoutUrl: string } | null; userErrors: { message: string }[] };
    }>(
      `mutation Cart($lines: [CartLineInput!]!) {
        cartCreate(input: { lines: $lines }) {
          cart { checkoutUrl }
          userErrors { message }
        }
      }`,
      { lines: lines.map((l) => ({ merchandiseId: l.variantId, quantity: l.quantity })) }
    );
    if (!data.cartCreate.cart || data.cartCreate.userErrors.length) {
      console.error("shopify cartCreate", data.cartCreate.userErrors);
      throw new StorefrontError("CHECKOUT_FAILED", 422);
    }
    return data.cartCreate.cart.checkoutUrl;
  }
}
