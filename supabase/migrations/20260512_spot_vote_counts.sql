-- Add denormalised upvote_count to osm_spots, kept in sync by trigger
-- (user_spots already has this column and trigger from an earlier migration)

ALTER TABLE osm_spots ADD COLUMN IF NOT EXISTS upvote_count INTEGER NOT NULL DEFAULT 0;

-- Backfill counts from existing votes
UPDATE osm_spots
SET upvote_count = (
  SELECT COUNT(*) FROM spot_votes WHERE osm_place_id = osm_spots.place_id
);

-- Trigger function: recount after any vote insert/delete on an osm spot
CREATE OR REPLACE FUNCTION sync_osm_spot_upvote_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  target_place_id TEXT;
BEGIN
  target_place_id := COALESCE(NEW.osm_place_id, OLD.osm_place_id);
  IF target_place_id IS NULL THEN
    RETURN NULL;
  END IF;
  UPDATE osm_spots
  SET upvote_count = (SELECT COUNT(*) FROM spot_votes WHERE osm_place_id = target_place_id)
  WHERE place_id = target_place_id;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS after_spot_vote_osm_upvote_sync ON spot_votes;
CREATE TRIGGER after_spot_vote_osm_upvote_sync
  AFTER INSERT OR DELETE ON spot_votes
  FOR EACH ROW EXECUTE FUNCTION sync_osm_spot_upvote_count();
