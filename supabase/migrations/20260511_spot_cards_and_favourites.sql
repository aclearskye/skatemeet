-- Details Cards: structured community info (heading + optional rating + comment)
CREATE TABLE IF NOT EXISTS spot_cards (
  card_id      UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id   UUID    NOT NULL REFERENCES profiles(profile_id) ON DELETE CASCADE,
  spot_id      UUID    REFERENCES user_spots(spot_id) ON DELETE CASCADE,
  osm_place_id TEXT,   -- plain TEXT, no FK
  heading      TEXT    NOT NULL,
  rating       NUMERIC(2,1) CHECK (rating >= 1.0 AND rating <= 5.0),
  comment      TEXT    NOT NULL,
  upvote_count INTEGER NOT NULL DEFAULT 0,
  is_verified  BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT spot_cards_exactly_one_spot CHECK (
    (spot_id IS NOT NULL AND osm_place_id IS NULL) OR
    (spot_id IS NULL AND osm_place_id IS NOT NULL)
  )
);
ALTER TABLE spot_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "spot_cards_read"
  ON spot_cards FOR SELECT
  USING (is_verified = true OR auth.uid() = profile_id);
CREATE POLICY "spot_cards_owner_insert"
  ON spot_cards FOR INSERT WITH CHECK (auth.uid() = profile_id);
CREATE POLICY "spot_cards_owner_delete"
  ON spot_cards FOR DELETE USING (auth.uid() = profile_id);

CREATE INDEX IF NOT EXISTS spot_cards_spot_id_idx      ON spot_cards (spot_id);
CREATE INDEX IF NOT EXISTS spot_cards_osm_place_id_idx ON spot_cards (osm_place_id);

-- Card votes: upvote system (3 votes → verified)
CREATE TABLE IF NOT EXISTS spot_card_votes (
  vote_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id    UUID NOT NULL REFERENCES spot_cards(card_id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(profile_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (card_id, profile_id)
);
ALTER TABLE spot_card_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "spot_card_votes_read"   ON spot_card_votes FOR SELECT USING (true);
CREATE POLICY "spot_card_votes_insert" ON spot_card_votes FOR INSERT WITH CHECK (auth.uid() = profile_id);
CREATE POLICY "spot_card_votes_delete" ON spot_card_votes FOR DELETE USING (auth.uid() = profile_id);

-- Trigger: auto-update upvote_count and is_verified on spot_cards after vote insert/delete
CREATE OR REPLACE FUNCTION sync_spot_card_votes()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE spot_cards
  SET
    upvote_count = (SELECT COUNT(*) FROM spot_card_votes WHERE card_id = COALESCE(NEW.card_id, OLD.card_id)),
    is_verified  = (SELECT COUNT(*) >= 3 FROM spot_card_votes WHERE card_id = COALESCE(NEW.card_id, OLD.card_id))
  WHERE card_id = COALESCE(NEW.card_id, OLD.card_id);
  RETURN NULL;
END;
$$;
CREATE TRIGGER after_spot_card_vote_change
  AFTER INSERT OR DELETE ON spot_card_votes
  FOR EACH ROW EXECUTE FUNCTION sync_spot_card_votes();

-- Favourites: heart toggle per user per spot
CREATE TABLE IF NOT EXISTS spot_favourites (
  favourite_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id   UUID NOT NULL REFERENCES profiles(profile_id) ON DELETE CASCADE,
  spot_id      UUID REFERENCES user_spots(spot_id) ON DELETE CASCADE,
  osm_place_id TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT spot_favourites_exactly_one_spot CHECK (
    (spot_id IS NOT NULL AND osm_place_id IS NULL) OR
    (spot_id IS NULL AND osm_place_id IS NOT NULL)
  )
);
ALTER TABLE spot_favourites ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX IF NOT EXISTS spot_favourites_user_spot_unique
  ON spot_favourites (profile_id, spot_id) WHERE spot_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS spot_favourites_osm_spot_unique
  ON spot_favourites (profile_id, osm_place_id) WHERE osm_place_id IS NOT NULL;
CREATE POLICY "spot_favourites_owner_all"
  ON spot_favourites FOR ALL USING (auth.uid() = profile_id);
