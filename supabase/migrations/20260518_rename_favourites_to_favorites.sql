-- Standardise spelling: favourites -> favorites (mirrors Phase 1E's TS-layer rename)
--
-- spot_favourites was never actually renamed despite lib/spots/skateSpots.ts already
-- querying "spot_favorites" (US spelling) since Phase 1E -- favoriting a spot has been
-- broken (querying a nonexistent table) until this migration. store_favourites was
-- correctly still UK-spelled to match its code, but is renamed here too for consistency.

-- ── spot_favourites → spot_favorites ───────────────────────────────────────────

ALTER TABLE spot_favourites RENAME TO spot_favorites;
ALTER TABLE spot_favorites RENAME COLUMN favourite_id TO favorite_id;

ALTER INDEX spot_favourites_pkey RENAME TO spot_favorites_pkey;
ALTER INDEX spot_favourites_user_spot_unique RENAME TO spot_favorites_user_spot_unique;
ALTER INDEX spot_favourites_osm_spot_unique RENAME TO spot_favorites_osm_spot_unique;

ALTER TABLE spot_favorites RENAME CONSTRAINT spot_favourites_exactly_one_spot TO spot_favorites_exactly_one_spot;
ALTER TABLE spot_favorites RENAME CONSTRAINT spot_favourites_profile_id_fkey TO spot_favorites_profile_id_fkey;
ALTER TABLE spot_favorites RENAME CONSTRAINT spot_favourites_spot_id_fkey TO spot_favorites_spot_id_fkey;

ALTER POLICY spot_favourites_owner_all ON spot_favorites RENAME TO spot_favorites_owner_all;

-- ── store_favourites → store_favorites ─────────────────────────────────────────

ALTER TABLE store_favourites RENAME TO store_favorites;
ALTER TABLE store_favorites RENAME COLUMN favourite_id TO favorite_id;

ALTER INDEX store_favourites_pkey RENAME TO store_favorites_pkey;
ALTER INDEX store_favourites_user_store_unique RENAME TO store_favorites_user_store_unique;
ALTER INDEX store_favourites_osm_store_unique RENAME TO store_favorites_osm_store_unique;

ALTER TABLE store_favorites RENAME CONSTRAINT store_favourites_exactly_one_store TO store_favorites_exactly_one_store;
ALTER TABLE store_favorites RENAME CONSTRAINT store_favourites_profile_id_fkey TO store_favorites_profile_id_fkey;
ALTER TABLE store_favorites RENAME CONSTRAINT store_favourites_shop_id_fkey TO store_favorites_shop_id_fkey;

ALTER POLICY store_favourites_owner_all ON store_favorites RENAME TO store_favorites_owner_all;
