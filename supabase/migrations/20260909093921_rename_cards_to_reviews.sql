-- Rename "community cards" to "reviews" ahead of the reviews feature rewrite
-- (author-delete, anyone-report, upvote-ranked top-3 + "see more" modal).
-- Mirrors the rename style of 20260517_rename_shops_to_stores.sql /
-- 20260518_rename_favourites_to_favorites.sql.
--
-- NOTE on the store side: the 20260517 store rename only renamed
-- store_cards.shop_id -> store_id (the column), not the index or FK
-- constraint backing it (store_cards_shop_id_idx / store_cards_shop_id_fkey
-- still carry the pre-rename "shop_id" name) — this migration is what
-- finally cleans that up while touching the same objects.

-- ── Spot side ────────────────────────────────────────────────────────────

ALTER TABLE spot_cards RENAME TO spot_reviews;
ALTER TABLE spot_reviews RENAME COLUMN card_id TO review_id;

ALTER INDEX spot_cards_pkey RENAME TO spot_reviews_pkey;
ALTER INDEX spot_cards_spot_id_idx RENAME TO spot_reviews_spot_id_idx;
ALTER INDEX spot_cards_osm_place_id_idx RENAME TO spot_reviews_osm_place_id_idx;

ALTER TABLE spot_reviews RENAME CONSTRAINT spot_cards_exactly_one_spot TO spot_reviews_exactly_one_spot;
ALTER TABLE spot_reviews RENAME CONSTRAINT spot_cards_profile_id_fkey TO spot_reviews_profile_id_fkey;
ALTER TABLE spot_reviews RENAME CONSTRAINT spot_cards_spot_id_fkey TO spot_reviews_spot_id_fkey;

ALTER POLICY spot_cards_read ON spot_reviews RENAME TO spot_reviews_read;
ALTER POLICY spot_cards_owner_insert ON spot_reviews RENAME TO spot_reviews_owner_insert;
ALTER POLICY spot_cards_owner_delete ON spot_reviews RENAME TO spot_reviews_owner_delete;
-- spot_reviews_owner_delete already has no is_verified gate (auth.uid() = profile_id
-- only), which is exactly "deletable by its author regardless of verification" —
-- no new RPC needed for review deletion.

ALTER TABLE spot_card_votes RENAME TO spot_review_votes;
ALTER TABLE spot_review_votes RENAME COLUMN card_id TO review_id;

ALTER INDEX spot_card_votes_pkey RENAME TO spot_review_votes_pkey;
ALTER TABLE spot_review_votes RENAME CONSTRAINT spot_card_votes_card_id_fkey TO spot_review_votes_review_id_fkey;
ALTER TABLE spot_review_votes RENAME CONSTRAINT spot_card_votes_profile_id_fkey TO spot_review_votes_profile_id_fkey;
ALTER TABLE spot_review_votes RENAME CONSTRAINT spot_card_votes_card_id_profile_id_key TO spot_review_votes_review_id_profile_id_key;

ALTER POLICY spot_card_votes_read ON spot_review_votes RENAME TO spot_review_votes_read;
ALTER POLICY spot_card_votes_insert ON spot_review_votes RENAME TO spot_review_votes_insert;
ALTER POLICY spot_card_votes_delete ON spot_review_votes RENAME TO spot_review_votes_delete;

DROP TRIGGER after_spot_card_vote_change ON spot_review_votes;
DROP FUNCTION sync_spot_card_votes();

CREATE FUNCTION sync_spot_review_votes()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE spot_reviews
  SET
    upvote_count = (SELECT COUNT(*) FROM spot_review_votes WHERE review_id = COALESCE(NEW.review_id, OLD.review_id)),
    is_verified  = (SELECT COUNT(*) >= 3 FROM spot_review_votes WHERE review_id = COALESCE(NEW.review_id, OLD.review_id))
  WHERE review_id = COALESCE(NEW.review_id, OLD.review_id);
  RETURN NULL;
END;
$$;

CREATE TRIGGER after_spot_review_vote_change
  AFTER INSERT OR DELETE ON spot_review_votes
  FOR EACH ROW EXECUTE FUNCTION sync_spot_review_votes();

-- ── Store side ───────────────────────────────────────────────────────────

ALTER TABLE store_cards RENAME TO store_reviews;
ALTER TABLE store_reviews RENAME COLUMN card_id TO review_id;

ALTER INDEX store_cards_pkey RENAME TO store_reviews_pkey;
ALTER INDEX store_cards_shop_id_idx RENAME TO store_reviews_store_id_idx;
ALTER INDEX store_cards_osm_place_id_idx RENAME TO store_reviews_osm_place_id_idx;

ALTER TABLE store_reviews RENAME CONSTRAINT store_cards_exactly_one_store TO store_reviews_exactly_one_store;
ALTER TABLE store_reviews RENAME CONSTRAINT store_cards_profile_id_fkey TO store_reviews_profile_id_fkey;
ALTER TABLE store_reviews RENAME CONSTRAINT store_cards_shop_id_fkey TO store_reviews_store_id_fkey;

ALTER POLICY store_cards_read ON store_reviews RENAME TO store_reviews_read;
ALTER POLICY store_cards_owner_insert ON store_reviews RENAME TO store_reviews_owner_insert;
ALTER POLICY store_cards_owner_delete ON store_reviews RENAME TO store_reviews_owner_delete;

ALTER TABLE store_card_votes RENAME TO store_review_votes;
ALTER TABLE store_review_votes RENAME COLUMN card_id TO review_id;

ALTER INDEX store_card_votes_pkey RENAME TO store_review_votes_pkey;
ALTER TABLE store_review_votes RENAME CONSTRAINT store_card_votes_card_id_fkey TO store_review_votes_review_id_fkey;
ALTER TABLE store_review_votes RENAME CONSTRAINT store_card_votes_profile_id_fkey TO store_review_votes_profile_id_fkey;
ALTER TABLE store_review_votes RENAME CONSTRAINT store_card_votes_card_id_profile_id_key TO store_review_votes_review_id_profile_id_key;

-- store_card_votes policies/trigger were never store_-prefixed — normalized here.
ALTER POLICY card_votes_read ON store_review_votes RENAME TO store_review_votes_read;
ALTER POLICY card_votes_insert ON store_review_votes RENAME TO store_review_votes_insert;
ALTER POLICY card_votes_delete ON store_review_votes RENAME TO store_review_votes_delete;

DROP TRIGGER after_card_vote_change ON store_review_votes;
DROP FUNCTION sync_store_card_votes();

CREATE FUNCTION sync_store_review_votes()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE store_reviews
  SET
    upvote_count = (SELECT COUNT(*) FROM store_review_votes WHERE review_id = COALESCE(NEW.review_id, OLD.review_id)),
    is_verified  = (SELECT COUNT(*) >= 3 FROM store_review_votes WHERE review_id = COALESCE(NEW.review_id, OLD.review_id))
  WHERE review_id = COALESCE(NEW.review_id, OLD.review_id);
  RETURN NULL;
END;
$$;

CREATE TRIGGER after_store_review_vote_change
  AFTER INSERT OR DELETE ON store_review_votes
  FOR EACH ROW EXECUTE FUNCTION sync_store_review_votes();
