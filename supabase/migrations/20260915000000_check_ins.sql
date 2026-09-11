-- Check-in feature (Phase 1 — see CHECKIN_FEATURE_PLAN.md at repo root).
-- Live "skaters here now" counts, streaks, and XP for showing up at a spot
-- or store. Deliberately one unified table rather than split
-- spot_check_ins/store_check_ins like favorites/votes are: a user can only
-- physically be in one place at a time, and that invariant (plus the
-- streak/XP ledger) needs a single table to enforce.
--
-- Phase 2 (entity_verification_requests, spot_review_tokens, the admin
-- review flow) is a separate, later migration — nothing here depends on it.

-- ── check_ins: the ledger ───────────────────────────────────────────────────

CREATE TABLE check_ins (
  check_in_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id          UUID NOT NULL REFERENCES profiles(profile_id) ON DELETE CASCADE,
  spot_id             UUID REFERENCES user_spots(spot_id) ON DELETE CASCADE,
  osm_spot_place_id   TEXT REFERENCES osm_spots(place_id) ON DELETE CASCADE,
  store_id            UUID REFERENCES user_stores(store_id) ON DELETE CASCADE,
  osm_store_place_id  TEXT REFERENCES osm_stores(place_id) ON DELETE CASCADE,
  -- Generated, not just a convenience: every lookup (live count, lifetime
  -- visited count, XP dedup key) needs "which entity" as a single value
  -- rather than four nullable columns.
  entity_key          TEXT GENERATED ALWAYS AS (
                         COALESCE(spot_id::TEXT, osm_spot_place_id, store_id::TEXT, osm_store_place_id)
                       ) STORED,
  checked_in_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  checked_in_source     TEXT NOT NULL DEFAULT 'manual', -- 'manual' | 'entity_created'
  checked_out_at        TIMESTAMPTZ,
  checked_out_reason    TEXT, -- 'manual' | 'auto_distance' | 'auto_expired' | 'replaced'
  CHECK (num_nonnulls(spot_id, osm_spot_place_id, store_id, osm_store_place_id) = 1),
  CHECK (checked_in_source IN ('manual', 'entity_created')),
  CHECK (checked_out_reason IS NULL OR checked_out_reason IN ('manual', 'auto_distance', 'auto_expired', 'replaced'))
);

-- A user can only have one open check-in at a time — physically true, and
-- what makes "replace the old one when checking in somewhere new" coherent.
CREATE UNIQUE INDEX check_ins_one_active_per_profile
  ON check_ins (profile_id) WHERE checked_out_at IS NULL;

CREATE INDEX check_ins_profile_idx ON check_ins (profile_id);
CREATE INDEX check_ins_entity_active_idx ON check_ins (entity_key) WHERE checked_out_at IS NULL;

ALTER TABLE check_ins ENABLE ROW LEVEL SECURITY;

-- Private ledger, same posture as xp_events: exact timestamps/locations of
-- where someone's been are visible only to them. No INSERT/UPDATE/DELETE
-- policy at all — every write goes through the SECURITY DEFINER functions
-- below. Public-facing counts are separate read-only functions further down,
-- mirroring xp_events (private) vs. user_xp (public aggregate).
CREATE POLICY "check_ins_select_own" ON check_ins
  FOR SELECT USING (auth.uid() = profile_id);

-- ── user_streaks: daily check-in streak, one row per profile ───────────────

CREATE TABLE user_streaks (
  profile_id         UUID PRIMARY KEY REFERENCES profiles(profile_id) ON DELETE CASCADE,
  current_streak     INTEGER NOT NULL DEFAULT 0 CHECK (current_streak >= 0),
  longest_streak     INTEGER NOT NULL DEFAULT 0 CHECK (longest_streak >= 0),
  last_checkin_date  DATE,
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE user_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_streaks_select_own" ON user_streaks
  FOR SELECT USING (auth.uid() = profile_id);

-- ── Internal helpers (no GRANT EXECUTE TO authenticated — reachable only
-- from the SECURITY DEFINER functions below, same posture as award_xp not
-- being directly callable by clients) ───────────────────────────────────────

CREATE OR REPLACE FUNCTION _haversine_meters(
  lat1 DOUBLE PRECISION, lng1 DOUBLE PRECISION, lat2 DOUBLE PRECISION, lng2 DOUBLE PRECISION
) RETURNS DOUBLE PRECISION LANGUAGE sql IMMUTABLE AS $$
  SELECT 2 * 6371000 * asin(sqrt(
    sin(radians(lat2 - lat1) / 2) ^ 2 +
    cos(radians(lat1)) * cos(radians(lat2)) * sin(radians(lng2 - lng1) / 2) ^ 2
  ));
$$;

-- Resolves an entity reference (exactly one of the four args expected to be
-- non-null, same convention as check_ins itself) to its stored coordinates
-- and whether it's a "park"-type entity (bigger footprint -> bigger check-in
-- radius). Returns zero rows if the entity doesn't exist.
CREATE OR REPLACE FUNCTION _entity_location(
  p_spot_id UUID, p_osm_spot_place_id TEXT, p_store_id UUID, p_osm_store_place_id TEXT
) RETURNS TABLE(lat DOUBLE PRECISION, lng DOUBLE PRECISION, is_park BOOLEAN)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_spot_id IS NOT NULL THEN
    RETURN QUERY SELECT s.latitude, s.longitude, (s.type = 'park') FROM user_spots s WHERE s.spot_id = p_spot_id;
  ELSIF p_osm_spot_place_id IS NOT NULL THEN
    RETURN QUERY SELECT s.latitude, s.longitude, (s.spot_type = 'park') FROM osm_spots s WHERE s.place_id = p_osm_spot_place_id;
  ELSIF p_store_id IS NOT NULL THEN
    RETURN QUERY SELECT st.latitude, st.longitude, false FROM user_stores st WHERE st.store_id = p_store_id;
  ELSIF p_osm_store_place_id IS NOT NULL THEN
    RETURN QUERY SELECT st.latitude, st.longitude, false FROM osm_stores st WHERE st.place_id = p_osm_store_place_id;
  END IF;
  RETURN;
END;
$$;

-- The shared write path for every check-in, whichever way it originated:
-- closes any other open check-in for the profile ('replaced'), inserts the
-- new row, and — only for a real 'manual' check-in, never 'entity_created'
-- — awards XP and updates the streak. Keeping XP/streak out of the
-- 'entity_created' path is deliberate: the creation trigger below skips
-- distance verification entirely (you just typed in coordinates), so
-- rewarding it the same as a verified check-in would be a free XP/streak
-- farm via spamming spot submissions. A self-made spot still earns XP later,
-- once verified (Phase 2) — just not here.
CREATE OR REPLACE FUNCTION _perform_check_in(
  p_profile_id UUID,
  p_spot_id UUID,
  p_osm_spot_place_id TEXT,
  p_store_id UUID,
  p_osm_store_place_id TEXT,
  p_source TEXT
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_entity_key TEXT := COALESCE(p_spot_id::TEXT, p_osm_spot_place_id, p_store_id::TEXT, p_osm_store_place_id);
  v_active RECORD;
  v_check_in_id UUID;
  v_today DATE := (now() AT TIME ZONE 'utc')::date;
  v_next_streak INTEGER;
BEGIN
  SELECT * INTO v_active FROM check_ins WHERE profile_id = p_profile_id AND checked_out_at IS NULL;

  IF FOUND THEN
    IF v_active.entity_key = v_entity_key THEN
      RETURN v_active.check_in_id; -- already checked in here — idempotent
    END IF;
    UPDATE check_ins SET checked_out_at = now(), checked_out_reason = 'replaced'
    WHERE check_in_id = v_active.check_in_id;
  END IF;

  INSERT INTO check_ins (profile_id, spot_id, osm_spot_place_id, store_id, osm_store_place_id, checked_in_source)
  VALUES (p_profile_id, p_spot_id, p_osm_spot_place_id, p_store_id, p_osm_store_place_id, p_source)
  RETURNING check_in_id INTO v_check_in_id;

  IF p_source = 'manual' THEN
    PERFORM award_xp(p_profile_id, 'check_in', 10, v_entity_key, v_entity_key || ':' || v_today::TEXT);

    INSERT INTO user_streaks (profile_id, current_streak, longest_streak, last_checkin_date)
    VALUES (p_profile_id, 1, 1, v_today)
    ON CONFLICT (profile_id) DO UPDATE SET
      current_streak = CASE
        WHEN user_streaks.last_checkin_date = v_today THEN user_streaks.current_streak
        WHEN user_streaks.last_checkin_date = v_today - 1 THEN user_streaks.current_streak + 1
        ELSE 1
      END,
      longest_streak = GREATEST(user_streaks.longest_streak, CASE
        WHEN user_streaks.last_checkin_date = v_today THEN user_streaks.current_streak
        WHEN user_streaks.last_checkin_date = v_today - 1 THEN user_streaks.current_streak + 1
        ELSE 1
      END),
      last_checkin_date = v_today,
      updated_at = now();
  END IF;

  RETURN v_check_in_id;
END;
$$;

-- ── Public RPCs ──────────────────────────────────────────────────────────

-- Check-in radii deliberately differ by entity size: 'park'-type entities
-- (skateparks) have a real footprint, so a fixed small radius would false-
-- reject someone at the far end of one; street/diy spots and stores are
-- point-like, so a tighter radius keeps the anti-cheat check meaningful.
-- Checkout radii are wider than check-in radii on purpose — someone
-- drifting a little inside the park shouldn't bounce in and out.
CREATE OR REPLACE FUNCTION check_in(
  p_spot_id UUID,
  p_osm_spot_place_id TEXT,
  p_store_id UUID,
  p_osm_store_place_id TEXT,
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_lat DOUBLE PRECISION;
  v_lng DOUBLE PRECISION;
  v_is_park BOOLEAN;
  v_radius_m DOUBLE PRECISION;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF num_nonnulls(p_spot_id, p_osm_spot_place_id, p_store_id, p_osm_store_place_id) != 1 THEN
    RAISE EXCEPTION 'Exactly one entity reference is required';
  END IF;

  SELECT lat, lng, is_park INTO v_lat, v_lng, v_is_park
  FROM _entity_location(p_spot_id, p_osm_spot_place_id, p_store_id, p_osm_store_place_id);

  IF v_lat IS NULL THEN
    RAISE EXCEPTION 'ENTITY_NOT_FOUND';
  END IF;

  v_radius_m := CASE WHEN v_is_park THEN 200 ELSE 100 END;

  IF _haversine_meters(p_lat, p_lng, v_lat, v_lng) > v_radius_m THEN
    RAISE EXCEPTION 'TOO_FAR';
  END IF;

  RETURN _perform_check_in(auth.uid(), p_spot_id, p_osm_spot_place_id, p_store_id, p_osm_store_place_id, 'manual');
END;
$$;

GRANT EXECUTE ON FUNCTION check_in(UUID, TEXT, UUID, TEXT, DOUBLE PRECISION, DOUBLE PRECISION) TO authenticated;

-- Manual check-out (the toggle button) — always reason='manual', no-op if
-- nothing's active. Distance/time-based check-outs never go through this
-- path; only sync_check_in_status below can set those reasons, so the
-- history stays honest about how a check-in actually ended.
CREATE OR REPLACE FUNCTION check_out()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  UPDATE check_ins SET checked_out_at = now(), checked_out_reason = 'manual'
  WHERE profile_id = auth.uid() AND checked_out_at IS NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION check_out() TO authenticated;

-- The foreground-opportunistic auto-checkout call (no background location --
-- see CHECKIN_FEATURE_PLAN.md for why): called whenever the app foregrounds
-- or a detail screen mounts while the caller has an active check-in. No-op
-- if they're still within range and within the time cap.
CREATE OR REPLACE FUNCTION sync_check_in_status(p_lat DOUBLE PRECISION, p_lng DOUBLE PRECISION)
RETURNS TABLE(is_active BOOLEAN, check_in_id UUID, checked_out_reason TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_active RECORD;
  v_lat DOUBLE PRECISION;
  v_lng DOUBLE PRECISION;
  v_is_park BOOLEAN;
  v_radius_m DOUBLE PRECISION;
  v_reason TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_active FROM check_ins WHERE profile_id = auth.uid() AND checked_out_at IS NULL;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT;
    RETURN;
  END IF;

  SELECT lat, lng, is_park INTO v_lat, v_lng, v_is_park
  FROM _entity_location(v_active.spot_id, v_active.osm_spot_place_id, v_active.store_id, v_active.osm_store_place_id);

  v_radius_m := CASE WHEN v_is_park THEN 400 ELSE 250 END;

  IF v_lat IS NOT NULL AND _haversine_meters(p_lat, p_lng, v_lat, v_lng) > v_radius_m THEN
    v_reason := 'auto_distance';
  ELSIF now() - v_active.checked_in_at > interval '4 hours' THEN
    v_reason := 'auto_expired';
  END IF;

  IF v_reason IS NOT NULL THEN
    UPDATE check_ins SET checked_out_at = now(), checked_out_reason = v_reason WHERE check_in_id = v_active.check_in_id;
    RETURN QUERY SELECT false, v_active.check_in_id, v_reason;
    RETURN;
  END IF;

  RETURN QUERY SELECT true, v_active.check_in_id, NULL::TEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION sync_check_in_status(DOUBLE PRECISION, DOUBLE PRECISION) TO authenticated;

-- Single-entity live count (preview card / detail page / search results).
-- On-demand, not a synced aggregate table like user_xp -- an aggregate would
-- go stale purely from clock-passing (checked_in_at aging past the window
-- below fires no write event to re-trigger a resync), which defeats the
-- point of a "live" counter. An indexed on-demand count stays accurate on
-- every poll regardless of whether sync_check_in_status has run recently.
CREATE OR REPLACE FUNCTION get_live_count(
  p_spot_id UUID, p_osm_spot_place_id TEXT, p_store_id UUID, p_osm_store_place_id TEXT
) RETURNS INTEGER LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT COUNT(*)::INTEGER FROM check_ins
  WHERE checked_out_at IS NULL
    AND checked_in_at > now() - interval '4 hours'
    AND entity_key = COALESCE(p_spot_id::TEXT, p_osm_spot_place_id, p_store_id::TEXT, p_osm_store_place_id);
$$;

GRANT EXECUTE ON FUNCTION get_live_count(UUID, TEXT, UUID, TEXT) TO authenticated;

-- Map-pin live indicator: one call per visible tile (see useMapRegionData.ts)
-- instead of one per pin. Kept as its own short-lived query rather than
-- folded into the tile-cached marker payload, which is cached 5 minutes —
-- fine for entity existence, far too stale for a live count.
CREATE OR REPLACE FUNCTION get_live_counts_in_bbox(
  p_min_lat DOUBLE PRECISION, p_max_lat DOUBLE PRECISION,
  p_min_lng DOUBLE PRECISION, p_max_lng DOUBLE PRECISION
) RETURNS TABLE(entity_key TEXT, live_count BIGINT)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT c.entity_key, COUNT(*)::BIGINT
  FROM check_ins c
  WHERE c.checked_out_at IS NULL
    AND c.checked_in_at > now() - interval '4 hours'
    AND (
      EXISTS (SELECT 1 FROM user_spots s WHERE s.spot_id = c.spot_id AND s.latitude BETWEEN p_min_lat AND p_max_lat AND s.longitude BETWEEN p_min_lng AND p_max_lng)
      OR EXISTS (SELECT 1 FROM osm_spots s WHERE s.place_id = c.osm_spot_place_id AND s.latitude BETWEEN p_min_lat AND p_max_lat AND s.longitude BETWEEN p_min_lng AND p_max_lng)
      OR EXISTS (SELECT 1 FROM user_stores st WHERE st.store_id = c.store_id AND st.latitude BETWEEN p_min_lat AND p_max_lat AND st.longitude BETWEEN p_min_lng AND p_max_lng)
      OR EXISTS (SELECT 1 FROM osm_stores st WHERE st.place_id = c.osm_store_place_id AND st.latitude BETWEEN p_min_lat AND p_max_lat AND st.longitude BETWEEN p_min_lng AND p_max_lng)
    )
  GROUP BY c.entity_key;
$$;

GRANT EXECUTE ON FUNCTION get_live_counts_in_bbox(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION) TO authenticated;

-- Lifetime "Spots visited" profile stat -- distinct entities ever checked
-- into, including ones auto-logged by creating them. Public like user_xp
-- (any profile's stat is meant to be visible), unlike the private check_ins
-- ledger itself.
CREATE OR REPLACE FUNCTION get_profile_visited_count(p_profile_id UUID)
RETURNS INTEGER LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT COUNT(DISTINCT entity_key)::INTEGER FROM check_ins WHERE profile_id = p_profile_id;
$$;

GRANT EXECUTE ON FUNCTION get_profile_visited_count(UUID) TO authenticated;

-- ── Auto-check-in on entity creation ────────────────────────────────────────
-- Skips distance verification (you just submitted these coordinates
-- yourself) and, via _perform_check_in's p_source='entity_created' branch,
-- skips XP/streak too -- see the comment on _perform_check_in for why.

CREATE OR REPLACE FUNCTION _check_in_on_spot_created()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM _perform_check_in(NEW.created_by, NEW.spot_id, NULL, NULL, NULL, 'entity_created');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS after_user_spot_insert_check_in ON user_spots;
CREATE TRIGGER after_user_spot_insert_check_in
  AFTER INSERT ON user_spots
  FOR EACH ROW EXECUTE FUNCTION _check_in_on_spot_created();

CREATE OR REPLACE FUNCTION _check_in_on_store_created()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM _perform_check_in(NEW.profile_id, NULL, NULL, NEW.store_id, NULL, 'entity_created');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS after_user_store_insert_check_in ON user_stores;
CREATE TRIGGER after_user_store_insert_check_in
  AFTER INSERT ON user_stores
  FOR EACH ROW EXECUTE FUNCTION _check_in_on_store_created();
