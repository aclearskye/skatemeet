-- Community votes for skate shops (both osm_shops and user_shops)

-- ── 1. store_votes table ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS store_votes (
  vote_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id      UUID REFERENCES user_shops(shop_id) ON DELETE CASCADE,
  osm_place_id TEXT,
  profile_id   UUID NOT NULL REFERENCES profiles(profile_id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT store_votes_exactly_one_shop CHECK (
    (shop_id IS NOT NULL AND osm_place_id IS NULL) OR
    (shop_id IS NULL AND osm_place_id IS NOT NULL)
  )
);

ALTER TABLE store_votes ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX IF NOT EXISTS store_votes_user_shop_unique
  ON store_votes (shop_id, profile_id) WHERE shop_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS store_votes_osm_shop_unique
  ON store_votes (osm_place_id, profile_id) WHERE osm_place_id IS NOT NULL;
CREATE POLICY "store_votes_read"   ON store_votes FOR SELECT USING (true);
CREATE POLICY "store_votes_insert" ON store_votes FOR INSERT WITH CHECK (auth.uid() = profile_id);
CREATE POLICY "store_votes_delete" ON store_votes FOR DELETE USING (auth.uid() = profile_id);

-- ── 2. upvote_count columns ───────────────────────────────────────────────────

ALTER TABLE osm_shops  ADD COLUMN IF NOT EXISTS upvote_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE user_shops ADD COLUMN IF NOT EXISTS upvote_count INTEGER NOT NULL DEFAULT 0;

-- ── 3. Trigger: sync both tables after vote insert/delete ─────────────────────

CREATE OR REPLACE FUNCTION sync_store_upvote_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  target_shop_id   UUID;
  target_place_id  TEXT;
BEGIN
  target_shop_id  := COALESCE(NEW.shop_id,      OLD.shop_id);
  target_place_id := COALESCE(NEW.osm_place_id, OLD.osm_place_id);

  IF target_shop_id IS NOT NULL THEN
    UPDATE user_shops
    SET upvote_count = (SELECT COUNT(*) FROM store_votes WHERE shop_id = target_shop_id)
    WHERE shop_id = target_shop_id;
  ELSIF target_place_id IS NOT NULL THEN
    UPDATE osm_shops
    SET upvote_count = (SELECT COUNT(*) FROM store_votes WHERE osm_place_id = target_place_id)
    WHERE place_id = target_place_id;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS after_store_vote_change ON store_votes;
CREATE TRIGGER after_store_vote_change
  AFTER INSERT OR DELETE ON store_votes
  FOR EACH ROW EXECUTE FUNCTION sync_store_upvote_count();
