-- Community-contributed photos for spots and stores (user-created and OSM-sourced).
-- Every upload is a row (not just an overwritten photo_url) so a later pass can add
-- a viewer modal with upvote/downvote/report on individual photos. The cover photo
-- shown on cards/heroes is derived as the highest-voted, non-hidden photo and kept
-- denormalised onto user_spots.photo_url / user_stores.photo_url (existing columns)
-- or osm_spots.cover_photo_url / osm_stores.cover_photo_url (new), mirroring the
-- upvote_count denormalisation pattern from 20260512_spot_vote_counts.sql.
--
-- NOTE: this migration ships no vote/report *casting* path yet (no RPC, no RLS
-- policy allows a direct client write to the vote/report tables) — those land with
-- the viewer modal. Until then every new photo is trivially its own top score, so it
-- becomes the cover immediately with no moderation of any kind in place.

-- ── 1. Photo tables ──────────────────────────────────────────────────────────

CREATE TABLE spot_photos (
  photo_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id     UUID NOT NULL REFERENCES profiles(profile_id) ON DELETE CASCADE,
  media_url      TEXT NOT NULL,
  spot_id        UUID REFERENCES user_spots(spot_id) ON DELETE CASCADE,
  osm_place_id   TEXT,
  upvote_count   INTEGER NOT NULL DEFAULT 0,
  downvote_count INTEGER NOT NULL DEFAULT 0,
  report_count   INTEGER NOT NULL DEFAULT 0,
  is_hidden      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT spot_photos_exactly_one_spot CHECK (
    (spot_id IS NOT NULL AND osm_place_id IS NULL) OR
    (spot_id IS NULL AND osm_place_id IS NOT NULL)
  )
);
CREATE INDEX spot_photos_spot_id_idx ON spot_photos(spot_id);
CREATE INDEX spot_photos_osm_place_id_idx ON spot_photos(osm_place_id);

CREATE TABLE store_photos (
  photo_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id     UUID NOT NULL REFERENCES profiles(profile_id) ON DELETE CASCADE,
  media_url      TEXT NOT NULL,
  store_id       UUID REFERENCES user_stores(store_id) ON DELETE CASCADE,
  osm_place_id   TEXT,
  upvote_count   INTEGER NOT NULL DEFAULT 0,
  downvote_count INTEGER NOT NULL DEFAULT 0,
  report_count   INTEGER NOT NULL DEFAULT 0,
  is_hidden      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT store_photos_exactly_one_store CHECK (
    (store_id IS NOT NULL AND osm_place_id IS NULL) OR
    (store_id IS NULL AND osm_place_id IS NOT NULL)
  )
);
CREATE INDEX store_photos_store_id_idx ON store_photos(store_id);
CREATE INDEX store_photos_osm_place_id_idx ON store_photos(osm_place_id);

-- ── 2. Vote & report tables (no casting path yet — schema only) ─────────────

CREATE TABLE spot_photo_votes (
  photo_id   UUID NOT NULL REFERENCES spot_photos(photo_id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(profile_id) ON DELETE CASCADE,
  vote_value SMALLINT NOT NULL CHECK (vote_value IN (-1, 1)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (photo_id, profile_id)
);

CREATE TABLE spot_photo_reports (
  report_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id   UUID NOT NULL REFERENCES spot_photos(photo_id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(profile_id) ON DELETE CASCADE,
  reason     TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (photo_id, profile_id)
);

CREATE TABLE store_photo_votes (
  photo_id   UUID NOT NULL REFERENCES store_photos(photo_id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(profile_id) ON DELETE CASCADE,
  vote_value SMALLINT NOT NULL CHECK (vote_value IN (-1, 1)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (photo_id, profile_id)
);

CREATE TABLE store_photo_reports (
  report_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id   UUID NOT NULL REFERENCES store_photos(photo_id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(profile_id) ON DELETE CASCADE,
  reason     TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (photo_id, profile_id)
);

-- ── 3. RLS ────────────────────────────────────────────────────────────────
-- Photos are publicly readable (needed by the future gallery modal). Every write
-- (this migration's photo insert, and the future vote/report casting) goes through
-- a SECURITY DEFINER function, so the vote/report tables get no client-facing
-- policies at all — the owning role bypasses RLS by default.

ALTER TABLE spot_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "spot_photos_select" ON spot_photos FOR SELECT USING (true);

ALTER TABLE store_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "store_photos_select" ON store_photos FOR SELECT USING (true);

ALTER TABLE spot_photo_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE spot_photo_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_photo_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_photo_reports ENABLE ROW LEVEL SECURITY;

-- ── 4. Cover-photo columns for OSM entities ─────────────────────────────────
-- user_spots.photo_url / user_stores.photo_url already exist and are reused as
-- the cover field for user-created entities.

ALTER TABLE osm_spots ADD COLUMN IF NOT EXISTS cover_photo_url TEXT;
ALTER TABLE osm_stores ADD COLUMN IF NOT EXISTS cover_photo_url TEXT;

-- ── 5. Vote/report count denormalisation triggers ───────────────────────────

CREATE OR REPLACE FUNCTION sync_spot_photo_vote_counts()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE target_photo_id UUID;
BEGIN
  target_photo_id := COALESCE(NEW.photo_id, OLD.photo_id);
  UPDATE spot_photos SET
    upvote_count = (SELECT COUNT(*) FROM spot_photo_votes WHERE photo_id = target_photo_id AND vote_value = 1),
    downvote_count = (SELECT COUNT(*) FROM spot_photo_votes WHERE photo_id = target_photo_id AND vote_value = -1)
  WHERE photo_id = target_photo_id;
  RETURN NULL;
END;
$$;

CREATE TRIGGER after_spot_photo_vote_sync
  AFTER INSERT OR UPDATE OR DELETE ON spot_photo_votes
  FOR EACH ROW EXECUTE FUNCTION sync_spot_photo_vote_counts();

CREATE OR REPLACE FUNCTION sync_spot_photo_report_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE target_photo_id UUID; v_count INTEGER;
BEGIN
  target_photo_id := COALESCE(NEW.photo_id, OLD.photo_id);
  SELECT COUNT(*) INTO v_count FROM spot_photo_reports WHERE photo_id = target_photo_id;
  UPDATE spot_photos SET report_count = v_count, is_hidden = (v_count >= 3) WHERE photo_id = target_photo_id;
  RETURN NULL;
END;
$$;

CREATE TRIGGER after_spot_photo_report_sync
  AFTER INSERT OR DELETE ON spot_photo_reports
  FOR EACH ROW EXECUTE FUNCTION sync_spot_photo_report_count();

CREATE OR REPLACE FUNCTION sync_store_photo_vote_counts()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE target_photo_id UUID;
BEGIN
  target_photo_id := COALESCE(NEW.photo_id, OLD.photo_id);
  UPDATE store_photos SET
    upvote_count = (SELECT COUNT(*) FROM store_photo_votes WHERE photo_id = target_photo_id AND vote_value = 1),
    downvote_count = (SELECT COUNT(*) FROM store_photo_votes WHERE photo_id = target_photo_id AND vote_value = -1)
  WHERE photo_id = target_photo_id;
  RETURN NULL;
END;
$$;

CREATE TRIGGER after_store_photo_vote_sync
  AFTER INSERT OR UPDATE OR DELETE ON store_photo_votes
  FOR EACH ROW EXECUTE FUNCTION sync_store_photo_vote_counts();

CREATE OR REPLACE FUNCTION sync_store_photo_report_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE target_photo_id UUID; v_count INTEGER;
BEGIN
  target_photo_id := COALESCE(NEW.photo_id, OLD.photo_id);
  SELECT COUNT(*) INTO v_count FROM store_photo_reports WHERE photo_id = target_photo_id;
  UPDATE store_photos SET report_count = v_count, is_hidden = (v_count >= 3) WHERE photo_id = target_photo_id;
  RETURN NULL;
END;
$$;

CREATE TRIGGER after_store_photo_report_sync
  AFTER INSERT OR DELETE ON store_photo_reports
  FOR EACH ROW EXECUTE FUNCTION sync_store_photo_report_count();

-- ── 6. Cover-photo derivation triggers ──────────────────────────────────────
-- Fires on insert (this pass) and whenever vote/report syncing above updates the
-- watched columns (future pass), so no extra wiring is needed once voting ships.

CREATE OR REPLACE FUNCTION sync_spot_cover_photo()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  target_spot_id UUID;
  target_place_id TEXT;
  best_url TEXT;
BEGIN
  target_spot_id := COALESCE(NEW.spot_id, OLD.spot_id);
  target_place_id := COALESCE(NEW.osm_place_id, OLD.osm_place_id);

  IF target_spot_id IS NOT NULL THEN
    SELECT media_url INTO best_url FROM spot_photos
      WHERE spot_id = target_spot_id AND is_hidden = FALSE
      ORDER BY (upvote_count - downvote_count) DESC, created_at DESC LIMIT 1;
    UPDATE user_spots SET photo_url = best_url WHERE spot_id = target_spot_id;
  ELSIF target_place_id IS NOT NULL THEN
    SELECT media_url INTO best_url FROM spot_photos
      WHERE osm_place_id = target_place_id AND is_hidden = FALSE
      ORDER BY (upvote_count - downvote_count) DESC, created_at DESC LIMIT 1;
    UPDATE osm_spots SET cover_photo_url = best_url WHERE place_id = target_place_id;
  END IF;

  RETURN NULL;
END;
$$;

CREATE TRIGGER after_spot_photo_cover_sync
  AFTER INSERT OR DELETE OR UPDATE OF is_hidden, upvote_count, downvote_count ON spot_photos
  FOR EACH ROW EXECUTE FUNCTION sync_spot_cover_photo();

CREATE OR REPLACE FUNCTION sync_store_cover_photo()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  target_store_id UUID;
  target_place_id TEXT;
  best_url TEXT;
BEGIN
  target_store_id := COALESCE(NEW.store_id, OLD.store_id);
  target_place_id := COALESCE(NEW.osm_place_id, OLD.osm_place_id);

  IF target_store_id IS NOT NULL THEN
    SELECT media_url INTO best_url FROM store_photos
      WHERE store_id = target_store_id AND is_hidden = FALSE
      ORDER BY (upvote_count - downvote_count) DESC, created_at DESC LIMIT 1;
    UPDATE user_stores SET photo_url = best_url WHERE store_id = target_store_id;
  ELSIF target_place_id IS NOT NULL THEN
    SELECT media_url INTO best_url FROM store_photos
      WHERE osm_place_id = target_place_id AND is_hidden = FALSE
      ORDER BY (upvote_count - downvote_count) DESC, created_at DESC LIMIT 1;
    UPDATE osm_stores SET cover_photo_url = best_url WHERE place_id = target_place_id;
  END IF;

  RETURN NULL;
END;
$$;

CREATE TRIGGER after_store_photo_cover_sync
  AFTER INSERT OR DELETE OR UPDATE OF is_hidden, upvote_count, downvote_count ON store_photos
  FOR EACH ROW EXECUTE FUNCTION sync_store_cover_photo();

-- ── 7. Insert RPCs (this pass's only write path) ────────────────────────────
-- SECURITY DEFINER so any signed-in user can attach a photo to any spot/store
-- (user-created or OSM-sourced) without a broader UPDATE policy on user_spots/
-- user_stores.

CREATE OR REPLACE FUNCTION add_spot_photo(p_spot_id UUID, p_osm_place_id TEXT, p_media_url TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_photo_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF (p_spot_id IS NULL) = (p_osm_place_id IS NULL) THEN
    RAISE EXCEPTION 'Exactly one of p_spot_id or p_osm_place_id must be provided';
  END IF;
  INSERT INTO spot_photos (profile_id, media_url, spot_id, osm_place_id)
    VALUES (auth.uid(), p_media_url, p_spot_id, p_osm_place_id)
    RETURNING photo_id INTO v_photo_id;
  RETURN v_photo_id;
END;
$$;

GRANT EXECUTE ON FUNCTION add_spot_photo(UUID, TEXT, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION add_store_photo(p_store_id UUID, p_osm_place_id TEXT, p_media_url TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_photo_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF (p_store_id IS NULL) = (p_osm_place_id IS NULL) THEN
    RAISE EXCEPTION 'Exactly one of p_store_id or p_osm_place_id must be provided';
  END IF;
  INSERT INTO store_photos (profile_id, media_url, store_id, osm_place_id)
    VALUES (auth.uid(), p_media_url, p_store_id, p_osm_place_id)
    RETURNING photo_id INTO v_photo_id;
  RETURN v_photo_id;
END;
$$;

GRANT EXECUTE ON FUNCTION add_store_photo(UUID, TEXT, TEXT) TO authenticated;
