-- Replaces vote-based review "verification" with check-in-gated eligibility,
-- and applies the same gate to photo uploads: only someone who has manually
-- checked in to a spot/store may review it or add a photo to it.
--
-- Follow-up to 20260921000000_fix_review_read_policy.sql, which fixed a
-- deadlock in the old model (unverified reviews were invisible to everyone
-- but their author, so nobody else could ever vote them to verification).
-- Rather than patch that model further, the trust mechanism itself changes:
-- proof-of-presence at submission time (a real check-in) replaces
-- after-the-fact community votes. Voting stays as a pure "helpful" ranking
-- signal, decoupled from trust -- there's nothing left for it to verify.

-- ── has_manual_checkin: shared eligibility check ───────────────────────────
-- Plain STABLE SQL, no DEFINER, mirroring is_admin()'s style -- relies on
-- check_ins' existing "check_ins_select_own" RLS policy, since every caller
-- here is only ever checking their own check-in history. checked_in_source
-- = 'manual' deliberately excludes the automatic check-in a spot's own
-- creator gets on submission (20260915000000_check_ins.sql) -- even the
-- creator must have physically checked in to review or add a photo.

CREATE FUNCTION has_manual_checkin(
  p_spot_id UUID, p_osm_spot_place_id TEXT, p_store_id UUID, p_osm_store_place_id TEXT
) RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM check_ins
    WHERE profile_id = auth.uid()
      AND checked_in_source = 'manual'
      AND entity_key = COALESCE(p_spot_id::TEXT, p_osm_spot_place_id, p_store_id::TEXT, p_osm_store_place_id)
  );
$$;

GRANT EXECUTE ON FUNCTION has_manual_checkin(UUID, TEXT, UUID, TEXT) TO authenticated;

-- ── Review creation moves to RPC ────────────────────────────────────────────
-- Was a raw client insert gated only by "auth.uid() = profile_id"
-- (spot_reviews_owner_insert / store_reviews_owner_insert, unchanged since
-- 20260511_spot_cards_and_favourites.sql / 20260510012442_store_cards_and_
-- favourites.sql). Moving to a SECURITY DEFINER RPC gives a clean
-- NOT_CHECKED_IN error instead of a generic RLS-violation message, matching
-- spot_verification_requests' "no INSERT policy -- creation only via RPC".

DROP POLICY "spot_reviews_owner_insert" ON spot_reviews;
DROP POLICY "store_reviews_owner_insert" ON store_reviews;

CREATE FUNCTION create_spot_review(
  p_spot_id UUID, p_osm_place_id TEXT, p_heading TEXT, p_rating NUMERIC, p_comment TEXT
) RETURNS spot_reviews LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_review spot_reviews;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT has_manual_checkin(p_spot_id, p_osm_place_id, NULL, NULL) THEN
    RAISE EXCEPTION 'NOT_CHECKED_IN';
  END IF;

  INSERT INTO spot_reviews (profile_id, spot_id, osm_place_id, heading, rating, comment)
  VALUES (auth.uid(), p_spot_id, p_osm_place_id, p_heading, p_rating, p_comment)
  RETURNING * INTO v_review;

  RETURN v_review;
END;
$$;

GRANT EXECUTE ON FUNCTION create_spot_review(UUID, TEXT, TEXT, NUMERIC, TEXT) TO authenticated;

CREATE FUNCTION create_store_review(
  p_store_id UUID, p_osm_place_id TEXT, p_heading TEXT, p_rating NUMERIC, p_comment TEXT
) RETURNS store_reviews LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_review store_reviews;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT has_manual_checkin(NULL, NULL, p_store_id, p_osm_place_id) THEN
    RAISE EXCEPTION 'NOT_CHECKED_IN';
  END IF;

  INSERT INTO store_reviews (profile_id, store_id, osm_place_id, heading, rating, comment)
  VALUES (auth.uid(), p_store_id, p_osm_place_id, p_heading, p_rating, p_comment)
  RETURNING * INTO v_review;

  RETURN v_review;
END;
$$;

GRANT EXECUTE ON FUNCTION create_store_review(UUID, TEXT, TEXT, NUMERIC, TEXT) TO authenticated;

-- ── Voting keeps counting, verification doesn't ────────────────────────────

CREATE OR REPLACE FUNCTION sync_spot_review_votes()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE spot_reviews SET upvote_count =
    (SELECT COUNT(*) FROM spot_review_votes WHERE review_id = COALESCE(NEW.review_id, OLD.review_id))
  WHERE review_id = COALESCE(NEW.review_id, OLD.review_id);
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION sync_store_review_votes()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE store_reviews SET upvote_count =
    (SELECT COUNT(*) FROM store_review_votes WHERE review_id = COALESCE(NEW.review_id, OLD.review_id))
  WHERE review_id = COALESCE(NEW.review_id, OLD.review_id);
  RETURN NULL;
END;
$$;

ALTER TABLE spot_reviews DROP COLUMN is_verified;
ALTER TABLE store_reviews DROP COLUMN is_verified;

-- ── Photo uploads get the same gate ─────────────────────────────────────────
-- add_spot_photo / add_store_photo (20260908113114_entity_photos.sql) were
-- already the sole write path (SECURITY DEFINER, no client INSERT policy on
-- spot_photos/store_photos at all) -- just adding the check here, no RLS
-- change needed.

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
  IF NOT has_manual_checkin(p_spot_id, p_osm_place_id, NULL, NULL) THEN
    RAISE EXCEPTION 'NOT_CHECKED_IN';
  END IF;
  INSERT INTO spot_photos (profile_id, media_url, spot_id, osm_place_id)
    VALUES (auth.uid(), p_media_url, p_spot_id, p_osm_place_id)
    RETURNING photo_id INTO v_photo_id;
  RETURN v_photo_id;
END;
$$;

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
  IF NOT has_manual_checkin(NULL, NULL, p_store_id, p_osm_place_id) THEN
    RAISE EXCEPTION 'NOT_CHECKED_IN';
  END IF;
  INSERT INTO store_photos (profile_id, media_url, store_id, osm_place_id)
    VALUES (auth.uid(), p_media_url, p_store_id, p_osm_place_id)
    RETURNING photo_id INTO v_photo_id;
  RETURN v_photo_id;
END;
$$;
