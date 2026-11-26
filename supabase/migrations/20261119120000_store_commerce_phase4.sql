-- Store commerce, Phases 4-5 (docs/ACCOUNT_TYPES.md, "Store", Commerce /
-- Cart): Shopify and WooCommerce.
--
--   * An approved store connects ONE platform. The credential (a Shopify
--     Storefront token, or a read-only WooCommerce REST key) is checked by
--     the storefront edge function, then kept encrypted in Supabase Vault.
--     Only the service role can read it back.
--   * Products are read live from the platform (nothing is copied here).
--   * The cart is server-side, one row per variant, grouped by store.
--     Only signed-in Adults can use it (Children browse only, Store accounts
--     can't buy). Its prices are a display snapshot: the platform's own
--     checkout always charges its current price.
--   * Checkout is one store at a time, on that store's own hosted checkout.
--     An unpaid store can't be bought from (_store_is_paid).

-- ── 1. Storefront connections ──────────────────────────────────────────────

CREATE TABLE store_storefronts (
  profile_id    UUID PRIMARY KEY REFERENCES profiles(profile_id) ON DELETE CASCADE,
  provider      TEXT NOT NULL CHECK (provider IN ('shopify', 'woocommerce')),
  -- Shopify: "<shop>.myshopify.com". WooCommerce: the site's https origin.
  shop_domain   TEXT NOT NULL CHECK (char_length(shop_domain) <= 255),
  shop_name     TEXT CHECK (char_length(shop_name) <= 200),
  currency      TEXT CHECK (currency ~ '^[A-Z]{3}$'),
  -- vault.secrets id. Deleted with the row (see the trigger below).
  secret_id     UUID NOT NULL,
  connected_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE store_storefronts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON store_storefronts FROM anon, authenticated;

CREATE FUNCTION _delete_storefront_secret() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM vault.secrets WHERE id = OLD.secret_id;
  RETURN OLD;
END;
$$;

CREATE TRIGGER store_storefronts_delete_secret
  AFTER DELETE ON store_storefronts
  FOR EACH ROW EXECUTE FUNCTION _delete_storefront_secret();

-- Called by the storefront edge function (service role) after it has
-- checked the credential against the platform.
CREATE FUNCTION _save_storefront(
  p_profile_id UUID, p_provider TEXT, p_shop_domain TEXT, p_shop_name TEXT, p_currency TEXT, p_secret TEXT
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_existing UUID;
BEGIN
  SELECT secret_id INTO v_existing FROM store_storefronts WHERE profile_id = p_profile_id;
  IF v_existing IS NOT NULL THEN
    PERFORM vault.update_secret(v_existing, p_secret);
    UPDATE store_storefronts SET
      provider = p_provider, shop_domain = p_shop_domain, shop_name = p_shop_name,
      currency = p_currency, updated_at = now(), connected_at = now()
    WHERE profile_id = p_profile_id;
  ELSE
    INSERT INTO store_storefronts (profile_id, provider, shop_domain, shop_name, currency, secret_id)
    VALUES (p_profile_id, p_provider, p_shop_domain, p_shop_name, p_currency,
            vault.create_secret(p_secret, 'storefront:' || p_profile_id::TEXT, 'Store storefront credential'));
  END IF;
END;
$$;

-- The connection with its decrypted credential. Service role only.
CREATE FUNCTION _get_storefront(p_profile_id UUID)
RETURNS TABLE (provider TEXT, shop_domain TEXT, currency TEXT, secret TEXT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.provider, s.shop_domain, s.currency, d.decrypted_secret
  FROM store_storefronts s
  JOIN vault.decrypted_secrets d ON d.id = s.secret_id
  WHERE s.profile_id = p_profile_id;
$$;

-- The owner's view of its own connection (never the credential).
CREATE FUNCTION get_my_storefront() RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := _assert_store_caller();
BEGIN
  RETURN (
    SELECT jsonb_build_object(
      'provider', provider, 'shop_domain', shop_domain, 'shop_name', shop_name,
      'currency', currency, 'connected_at', connected_at)
    FROM store_storefronts WHERE profile_id = v_uid
  );
END;
$$;

CREATE FUNCTION disconnect_my_storefront() RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := _assert_store_caller();
BEGIN
  DELETE FROM store_storefronts WHERE profile_id = v_uid;
  -- Items from a shop that's gone can't be checked out.
  DELETE FROM cart_items WHERE store_owner_id = v_uid;
END;
$$;

-- ── 2. Who can buy, and from whom ──────────────────────────────────────────

-- Signed-in Adults only. Children browse; Store accounts can't buy.
CREATE FUNCTION _can_buy(p_profile_id UUID) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _is_adult(p_profile_id) AND NOT _is_banned(p_profile_id);
$$;

-- An approved, paid, unbanned store with a connected platform.
CREATE FUNCTION _store_can_sell(p_owner UUID) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _store_is_paid(p_owner) AND NOT _is_banned(p_owner)
     AND EXISTS (SELECT 1 FROM store_storefronts WHERE profile_id = p_owner);
$$;

-- What a viewer's store page shows. Browsing needs a connected shop and
-- an approved store; buying needs both sides to qualify.
CREATE FUNCTION get_store_shop(p_owner UUID) RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_shop store_storefronts%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;
  SELECT * INTO v_shop FROM store_storefronts WHERE profile_id = p_owner;
  IF v_shop.profile_id IS NULL OR NOT _is_approved_store(p_owner) OR _is_banned(p_owner)
     OR is_blocked_between(v_uid, p_owner) THEN
    RETURN NULL;
  END IF;
  RETURN jsonb_build_object(
    'provider', v_shop.provider,
    'currency', v_shop.currency,
    'store_can_sell', _store_can_sell(p_owner),
    'viewer_can_buy', _can_buy(v_uid),
    -- Why buying is off, for the UI: 'store' (not selling right now),
    -- 'account' (a Child or a Store account), or NULL.
    'blocked_reason', CASE
      WHEN NOT _store_can_sell(p_owner) THEN 'store'
      WHEN NOT _can_buy(v_uid) THEN 'account'
    END
  );
END;
$$;

-- ── 3. The cart ────────────────────────────────────────────────────────────

CREATE TABLE cart_items (
  cart_item_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id     UUID NOT NULL REFERENCES profiles(profile_id) ON DELETE CASCADE,
  store_owner_id UUID NOT NULL REFERENCES profiles(profile_id) ON DELETE CASCADE,
  product_id     TEXT NOT NULL CHECK (char_length(product_id) <= 200),
  variant_id     TEXT NOT NULL CHECK (char_length(variant_id) <= 200),
  quantity       INT NOT NULL CHECK (quantity BETWEEN 1 AND 99),
  -- Display snapshot from when it was added. Checkout re-prices.
  title          TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 300),
  variant_title  TEXT CHECK (char_length(variant_title) <= 300),
  price_amount   NUMERIC(12, 2) CHECK (price_amount >= 0),
  currency       TEXT CHECK (currency ~ '^[A-Z]{3}$'),
  image_url      TEXT CHECK (char_length(image_url) <= 2000 AND image_url ~ '^https://'),
  added_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (profile_id, store_owner_id, variant_id)
);
CREATE INDEX cart_items_profile_idx ON cart_items (profile_id, store_owner_id);

ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON cart_items FROM anon, authenticated;
GRANT SELECT ON cart_items TO authenticated;
CREATE POLICY cart_items_own ON cart_items FOR SELECT USING (profile_id = (SELECT auth.uid()));

CREATE FUNCTION add_to_cart(
  p_store_owner_id UUID, p_product_id TEXT, p_variant_id TEXT, p_quantity INT,
  p_title TEXT, p_variant_title TEXT, p_price_amount NUMERIC, p_currency TEXT, p_image_url TEXT
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;
  IF NOT _can_buy(v_uid) THEN
    RAISE EXCEPTION 'CANNOT_BUY';
  END IF;
  IF NOT _store_can_sell(p_store_owner_id) OR is_blocked_between(v_uid, p_store_owner_id) THEN
    RAISE EXCEPTION 'STORE_NOT_SELLING';
  END IF;
  IF p_quantity IS NULL OR p_quantity NOT BETWEEN 1 AND 99 THEN
    RAISE EXCEPTION 'INVALID_QUANTITY';
  END IF;
  -- A runaway cart is a bug, not a shopping trip.
  IF (SELECT count(*) FROM cart_items WHERE profile_id = v_uid) >= 100 THEN
    RAISE EXCEPTION 'CART_FULL';
  END IF;

  INSERT INTO cart_items (profile_id, store_owner_id, product_id, variant_id, quantity,
                          title, variant_title, price_amount, currency, image_url)
  VALUES (v_uid, p_store_owner_id, p_product_id, p_variant_id, p_quantity,
          btrim(p_title), NULLIF(btrim(p_variant_title), ''), p_price_amount, upper(p_currency), p_image_url)
  ON CONFLICT (profile_id, store_owner_id, variant_id) DO UPDATE SET
    quantity = least(cart_items.quantity + EXCLUDED.quantity, 99),
    title = EXCLUDED.title,
    variant_title = EXCLUDED.variant_title,
    price_amount = EXCLUDED.price_amount,
    currency = EXCLUDED.currency,
    image_url = EXCLUDED.image_url,
    added_at = now();
END;
$$;

-- 0 removes the item.
CREATE FUNCTION set_cart_item_quantity(p_cart_item_id UUID, p_quantity INT) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;
  IF p_quantity IS NULL OR p_quantity NOT BETWEEN 0 AND 99 THEN
    RAISE EXCEPTION 'INVALID_QUANTITY';
  END IF;
  IF p_quantity = 0 THEN
    DELETE FROM cart_items WHERE cart_item_id = p_cart_item_id AND profile_id = auth.uid();
  ELSE
    UPDATE cart_items SET quantity = p_quantity
    WHERE cart_item_id = p_cart_item_id AND profile_id = auth.uid();
  END IF;
END;
$$;

CREATE FUNCTION clear_store_cart(p_store_owner_id UUID) RETURNS VOID
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  DELETE FROM cart_items WHERE profile_id = auth.uid() AND store_owner_id = p_store_owner_id;
$$;

-- The Cart page: every item, grouped by store, with whether each store can
-- be checked out right now.
CREATE FUNCTION get_my_cart() RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;
  RETURN coalesce((
    SELECT jsonb_agg(g ORDER BY g->>'last_added_at' DESC)
    FROM (
      SELECT jsonb_build_object(
        'store_owner_id', ci.store_owner_id,
        'store_name', coalesce(d.name, p.display_name, 'Store'),
        'logo_path', d.logo_path,
        'store_id', c.store_id,
        'osm_place_id', c.osm_place_id,
        'can_checkout', _store_can_sell(ci.store_owner_id) AND _can_buy(v_uid)
                        AND NOT is_blocked_between(v_uid, ci.store_owner_id),
        'last_added_at', max(ci.added_at),
        'items', jsonb_agg(jsonb_build_object(
          'cart_item_id', ci.cart_item_id, 'product_id', ci.product_id, 'variant_id', ci.variant_id,
          'quantity', ci.quantity, 'title', ci.title, 'variant_title', ci.variant_title,
          'price_amount', ci.price_amount, 'currency', ci.currency, 'image_url', ci.image_url
        ) ORDER BY ci.added_at)
      ) AS g
      FROM cart_items ci
      JOIN profiles p ON p.profile_id = ci.store_owner_id
      LEFT JOIN store_public_details d ON d.profile_id = ci.store_owner_id
      LEFT JOIN store_claims c ON c.profile_id = ci.store_owner_id AND c.status = 'approved'
      WHERE ci.profile_id = v_uid
      GROUP BY ci.store_owner_id, d.name, p.display_name, d.logo_path, c.store_id, c.osm_place_id
    ) groups
  ), '[]'::JSONB);
END;
$$;

-- ── 4. Data export ─────────────────────────────────────────────────────────

DO $do$
DECLARE
  v_def TEXT := pg_get_functiondef('export_my_data()'::REGPROCEDURE);
BEGIN
  v_def := replace(v_def,
    $old$'store_billing', _export_rows('store_billing', 'profile_id', v_uid),$old$,
    $new$'store_billing', _export_rows('store_billing', 'profile_id', v_uid),
    'cart_items', _export_rows('cart_items', 'profile_id', v_uid),$new$);
  IF position('''cart_items''' IN v_def) = 0 THEN
    RAISE EXCEPTION 'export_my_data rewrite did not apply';
  END IF;
  EXECUTE v_def;
END;
$do$;

-- ── 5. Function access ─────────────────────────────────────────────────────

REVOKE EXECUTE ON FUNCTION
  _delete_storefront_secret(),
  _save_storefront(UUID, TEXT, TEXT, TEXT, TEXT, TEXT),
  _get_storefront(UUID),
  _can_buy(UUID), _store_can_sell(UUID),
  get_my_storefront(), disconnect_my_storefront(), get_store_shop(UUID),
  add_to_cart(UUID, TEXT, TEXT, INT, TEXT, TEXT, NUMERIC, TEXT, TEXT),
  set_cart_item_quantity(UUID, INT), clear_store_cart(UUID), get_my_cart()
FROM PUBLIC, anon, authenticated;

-- The edge function's own calls.
GRANT EXECUTE ON FUNCTION
  _save_storefront(UUID, TEXT, TEXT, TEXT, TEXT, TEXT), _get_storefront(UUID),
  _can_buy(UUID), _store_can_sell(UUID), _store_can_edit_page(UUID)
TO service_role;

GRANT EXECUTE ON FUNCTION
  get_my_storefront(), disconnect_my_storefront(), get_store_shop(UUID),
  add_to_cart(UUID, TEXT, TEXT, INT, TEXT, TEXT, NUMERIC, TEXT, TEXT),
  set_cart_item_quantity(UUID, INT), clear_store_cart(UUID), get_my_cart()
TO authenticated;
