import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SHOPIFY_DOMAIN, ShopifyProvider } from "./shopify.ts";
import { StorefrontError, type CheckoutLine, type StorefrontProvider } from "./types.ts";
import { WooCommerceProvider, normaliseWooSite, type WooCredential } from "./woocommerce.ts";

// Store commerce (docs/ACCOUNT_TYPES.md, "Store", Commerce). Called by the
// app with the user's JWT. Credentials never leave the server: they're
// read from Vault here and used to talk to the store's platform.
//
//   connect     Store owner: check a Shopify token or WooCommerce key, then save it.
//   products    Anyone signed in: a page of a store's products (live).
//   product     Anyone signed in: one product with its variants.
//   checkout    An Adult: hand one store's cart lines to that store's own
//               hosted checkout, and get its URL.

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

const str = (value: unknown, max = 500) => (typeof value === "string" ? value.trim().slice(0, max) : "");

async function providerFor(admin: SupabaseClient, ownerId: string): Promise<StorefrontProvider> {
  const { data, error } = await admin.rpc("_get_storefront", { p_profile_id: ownerId });
  if (error) throw error;
  const row = (data as { provider: string; shop_domain: string; secret: string }[] | null)?.[0];
  if (!row) throw new StorefrontError("SHOP_NOT_CONNECTED", 404);
  if (row.provider === "shopify") return new ShopifyProvider(row.shop_domain, row.secret);
  return new WooCommerceProvider(row.shop_domain, JSON.parse(row.secret) as WooCredential);
}

// The viewer's view of a store's shop (get_store_shop), or SHOP_NOT_CONNECTED.
async function shopFor(caller: SupabaseClient, ownerId: string) {
  const { data, error } = await caller.rpc("get_store_shop", { p_owner: ownerId });
  if (error) throw error;
  if (!data) throw new StorefrontError("SHOP_NOT_CONNECTED", 404);
  return data as { blocked_reason: "store" | "account" | null };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "NOT_AUTHENTICATED" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const caller = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: userData, error: userError } = await caller.auth.getUser();
    if (userError || !userData.user) return json({ error: "NOT_AUTHENTICATED" }, 401);
    const uid = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const action = body?.action;

    if (action === "connect") {
      const { data: profile } = await admin.from("profiles").select("account_type").eq("profile_id", uid).maybeSingle();
      if (profile?.account_type !== "store") throw new StorefrontError("NOT_STORE_ACCOUNT", 403);
      const { data: canEdit } = await admin.rpc("_store_can_edit_page", { p_profile_id: uid });
      if (!canEdit) throw new StorefrontError("STORE_NOT_APPROVED", 403);

      let provider: StorefrontProvider;
      let domain: string;
      let secret: string;
      if (body.provider === "shopify") {
        domain = str(body.domain, 255).toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
        if (!SHOPIFY_DOMAIN.test(domain)) throw new StorefrontError("INVALID_DOMAIN");
        secret = str(body.token, 200);
        if (!secret) throw new StorefrontError("INVALID_CREDENTIALS");
        provider = new ShopifyProvider(domain, secret);
      } else if (body.provider === "woocommerce") {
        domain = normaliseWooSite(str(body.domain, 255));
        const credential = { consumerKey: str(body.consumerKey, 200), consumerSecret: str(body.consumerSecret, 200) };
        if (!/^ck_\w+$/.test(credential.consumerKey) || !/^cs_\w+$/.test(credential.consumerSecret)) {
          throw new StorefrontError("INVALID_CREDENTIALS");
        }
        secret = JSON.stringify(credential);
        provider = new WooCommerceProvider(domain, credential);
      } else {
        throw new StorefrontError("INVALID_PROVIDER");
      }

      const shop = await provider.verify();
      const { error } = await admin.rpc("_save_storefront", {
        p_profile_id: uid,
        p_provider: body.provider,
        p_shop_domain: domain,
        p_shop_name: shop.name?.slice(0, 200) ?? null,
        p_currency: shop.currency && /^[A-Z]{3}$/.test(shop.currency) ? shop.currency : null,
        p_secret: secret,
      });
      if (error) throw error;
      return json({ connected: true, shopName: shop.name });
    }

    const ownerId = str(body.storeOwnerId, 64);
    if (!/^[0-9a-f-]{36}$/.test(ownerId)) throw new StorefrontError("SHOP_NOT_CONNECTED", 404);

    if (action === "products") {
      await shopFor(caller, ownerId);
      const provider = await providerFor(admin, ownerId);
      const cursor = body.cursor == null ? null : str(body.cursor, 500);
      return json(await provider.listProducts(str(body.query, 100), cursor));
    }

    if (action === "product") {
      await shopFor(caller, ownerId);
      const provider = await providerFor(admin, ownerId);
      return json(await provider.getProduct(str(body.productId, 200)));
    }

    if (action === "checkout") {
      const shop = await shopFor(caller, ownerId);
      if (shop.blocked_reason === "store") throw new StorefrontError("STORE_NOT_SELLING", 403);
      if (shop.blocked_reason === "account") throw new StorefrontError("CANNOT_BUY", 403);

      // The buyer's own cart rows (RLS), never lines sent by the client.
      const { data: items, error } = await caller
        .from("cart_items")
        .select("product_id, variant_id, quantity")
        .eq("store_owner_id", ownerId);
      if (error) throw error;
      if (!items?.length) throw new StorefrontError("CART_EMPTY");
      const lines: CheckoutLine[] = items.map((i) => ({
        productId: i.product_id,
        variantId: i.variant_id,
        quantity: i.quantity,
      }));

      const provider = await providerFor(admin, ownerId);
      const url = await provider.checkoutUrl(lines);
      if (!url.startsWith("https://")) throw new StorefrontError("CHECKOUT_FAILED", 502);
      return json({ url });
    }

    throw new StorefrontError("UNKNOWN_ACTION");
  } catch (err) {
    if (err instanceof StorefrontError) return json({ error: err.code }, err.status);
    console.error("storefront", err);
    return json({ error: "SHOP_UNAVAILABLE" }, 500);
  }
});
