-- Details Cards: structured community info (heading + optional rating + comment)
CREATE TABLE IF NOT EXISTS store_cards (
  card_id      UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id   UUID    NOT NULL REFERENCES profiles(profile_id) ON DELETE CASCADE,
  shop_id      UUID    REFERENCES user_shops(shop_id) ON DELETE CASCADE,
  osm_place_id TEXT,   -- plain TEXT, no FK (skate-store kind has no DB row)
  heading      TEXT    NOT NULL,
  rating       NUMERIC(2,1) CHECK (rating >= 1.0 AND rating <= 5.0),
  comment      TEXT    NOT NULL,
  upvote_count INTEGER NOT NULL DEFAULT 0,
  is_verified  BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT store_cards_exactly_one_store CHECK (
    (shop_id IS NOT NULL AND osm_place_id IS NULL) OR
    (shop_id IS NULL AND osm_place_id IS NOT NULL)
  )
);
ALTER TABLE store_cards ENABLE ROW LEVEL SECURITY;
-- Authenticated users see verified cards OR their own unverified cards
CREATE POLICY "store_cards_read"
  ON store_cards FOR SELECT
  USING (is_verified = true OR auth.uid() = profile_id);
CREATE POLICY "store_cards_owner_insert"
  ON store_cards FOR INSERT WITH CHECK (auth.uid() = profile_id);
CREATE POLICY "store_cards_owner_delete"
  ON store_cards FOR DELETE USING (auth.uid() = profile_id);

CREATE INDEX IF NOT EXISTS store_cards_shop_id_idx      ON store_cards (shop_id);
CREATE INDEX IF NOT EXISTS store_cards_osm_place_id_idx ON store_cards (osm_place_id);

-- Card votes: upvote system (3 votes → verified)
CREATE TABLE IF NOT EXISTS store_card_votes (
  vote_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id    UUID NOT NULL REFERENCES store_cards(card_id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(profile_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (card_id, profile_id)
);
ALTER TABLE store_card_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "card_votes_read"   ON store_card_votes FOR SELECT USING (true);
CREATE POLICY "card_votes_insert" ON store_card_votes FOR INSERT WITH CHECK (auth.uid() = profile_id);
CREATE POLICY "card_votes_delete" ON store_card_votes FOR DELETE USING (auth.uid() = profile_id);

-- Trigger: auto-update upvote_count and is_verified after vote insert/delete
CREATE OR REPLACE FUNCTION sync_store_card_votes()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE store_cards
  SET
    upvote_count = (SELECT COUNT(*) FROM store_card_votes WHERE card_id = COALESCE(NEW.card_id, OLD.card_id)),
    is_verified  = (SELECT COUNT(*) >= 3 FROM store_card_votes WHERE card_id = COALESCE(NEW.card_id, OLD.card_id))
  WHERE card_id = COALESCE(NEW.card_id, OLD.card_id);
  RETURN NULL;
END;
$$;
CREATE TRIGGER after_card_vote_change
  AFTER INSERT OR DELETE ON store_card_votes
  FOR EACH ROW EXECUTE FUNCTION sync_store_card_votes();

-- Favourites: heart toggle per user per store
CREATE TABLE IF NOT EXISTS store_favourites (
  favourite_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id   UUID NOT NULL REFERENCES profiles(profile_id) ON DELETE CASCADE,
  shop_id      UUID REFERENCES user_shops(shop_id) ON DELETE CASCADE,
  osm_place_id TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT store_favourites_exactly_one_store CHECK (
    (shop_id IS NOT NULL AND osm_place_id IS NULL) OR
    (shop_id IS NULL AND osm_place_id IS NOT NULL)
  )
);
ALTER TABLE store_favourites ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX IF NOT EXISTS store_favourites_user_shop_unique
  ON store_favourites (profile_id, shop_id) WHERE shop_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS store_favourites_osm_shop_unique
  ON store_favourites (profile_id, osm_place_id) WHERE osm_place_id IS NOT NULL;
CREATE POLICY "store_favourites_owner_all"
  ON store_favourites FOR ALL USING (auth.uid() = profile_id);
