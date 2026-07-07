-- Rename all shop/shops terminology to store/stores for consistency

-- ── 1. Rename tables ──────────────────────────────────────────────────────────

ALTER TABLE osm_shops  RENAME TO osm_stores;
ALTER TABLE user_shops RENAME TO user_stores;

-- ── 2. Rename primary key column: user_stores.shop_id → store_id ─────────────

ALTER TABLE user_stores RENAME COLUMN shop_id TO store_id;

-- ── 3. store_cards: rename shop_id → store_id ────────────────────────────────

ALTER TABLE store_cards RENAME COLUMN shop_id TO store_id;

ALTER TABLE store_cards DROP CONSTRAINT store_cards_exactly_one_store;
ALTER TABLE store_cards ADD CONSTRAINT store_cards_exactly_one_store CHECK (
  (store_id IS NOT NULL AND osm_place_id IS NULL) OR
  (store_id IS NULL AND osm_place_id IS NOT NULL)
);

-- ── 4. store_favourites: rename shop_id → store_id ───────────────────────────

ALTER TABLE store_favourites RENAME COLUMN shop_id TO store_id;

ALTER TABLE store_favourites DROP CONSTRAINT store_favourites_exactly_one_store;
ALTER TABLE store_favourites ADD CONSTRAINT store_favourites_exactly_one_store CHECK (
  (store_id IS NOT NULL AND osm_place_id IS NULL) OR
  (store_id IS NULL AND osm_place_id IS NOT NULL)
);

DROP INDEX IF EXISTS store_favourites_user_shop_unique;
DROP INDEX IF EXISTS store_favourites_osm_shop_unique;
CREATE UNIQUE INDEX store_favourites_user_store_unique
  ON store_favourites (profile_id, store_id) WHERE store_id IS NOT NULL;
CREATE UNIQUE INDEX store_favourites_osm_store_unique
  ON store_favourites (profile_id, osm_place_id) WHERE osm_place_id IS NOT NULL;

-- ── 5. store_votes: rename shop_id → store_id ────────────────────────────────

ALTER TABLE store_votes RENAME COLUMN shop_id TO store_id;

ALTER TABLE store_votes DROP CONSTRAINT store_votes_exactly_one_shop;
ALTER TABLE store_votes ADD CONSTRAINT store_votes_exactly_one_store CHECK (
  (store_id IS NOT NULL AND osm_place_id IS NULL) OR
  (store_id IS NULL AND osm_place_id IS NOT NULL)
);

DROP INDEX IF EXISTS store_votes_user_shop_unique;
DROP INDEX IF EXISTS store_votes_osm_shop_unique;
CREATE UNIQUE INDEX store_votes_user_store_unique
  ON store_votes (store_id, profile_id) WHERE store_id IS NOT NULL;
CREATE UNIQUE INDEX store_votes_osm_store_unique
  ON store_votes (osm_place_id, profile_id) WHERE osm_place_id IS NOT NULL;

-- ── 6. clips: rename shop_id → store_id ──────────────────────────────────────

ALTER TABLE clips RENAME COLUMN shop_id TO store_id;

-- ── 7. Update trigger function to use new column/table names ──────────────────

CREATE OR REPLACE FUNCTION sync_store_upvote_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  target_store_id UUID;
  target_place_id TEXT;
BEGIN
  target_store_id := COALESCE(NEW.store_id, OLD.store_id);
  target_place_id := COALESCE(NEW.osm_place_id, OLD.osm_place_id);

  IF target_store_id IS NOT NULL THEN
    UPDATE user_stores
    SET upvote_count = (SELECT COUNT(*) FROM store_votes WHERE store_id = target_store_id)
    WHERE store_id = target_store_id;
  ELSIF target_place_id IS NOT NULL THEN
    UPDATE osm_stores
    SET upvote_count = (SELECT COUNT(*) FROM store_votes WHERE osm_place_id = target_place_id)
    WHERE place_id = target_place_id;
  END IF;

  RETURN NULL;
END;
$$;
