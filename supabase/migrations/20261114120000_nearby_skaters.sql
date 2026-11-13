-- Nearby skaters: when the Search tab's search bar is empty, it lists skaters
-- whose last reported location is near the viewer's current location or a
-- location they chose. See docs/ACCOUNT_TYPES.md ("Nearby skaters checklist").
--
-- Safety model. Hiding the distance alone doesn't hide where someone is: a
-- viewer who can move their search point anywhere can watch someone move up
-- and down the list and work out roughly where they live. So:
--   * Only a rounded location (about a 2 km grid cell) is ever stored.
--   * Results come in three distance bands, each shuffled with a seed per
--     viewer per day, never in exact distance order.
--   * Nothing beyond 50 km, and results come a page at a time.
--   * At most 10 different search points per hour per account.
--   * Locations older than 30 days are ignored.
--   * Coordinates, distances and update times are never returned.
--
-- Who's in it: public, discoverable, age-confirmed, unbanned accounts that
-- aren't blocked either way. Private accounts are never listed here, even
-- to friends (username search keeps its usual rules). Store accounts are
-- listed for now. Child accounts don't exist yet; age_confirmed_at is only
-- set by the 18+ gate, and when the Child band lands both RPCs must refuse
-- Child accounts explicitly.

-- ── Discoverability ─────────────────────────────────────────────────────
-- A preference, not an access rule, so it's client-writable like is_private.
ALTER TABLE profiles ADD COLUMN show_in_nearby BOOLEAN NOT NULL DEFAULT true;

-- ── profile_locations: one rounded location per profile ────────────────
CREATE TABLE profile_locations (
  profile_id  UUID PRIMARY KEY REFERENCES profiles(profile_id) ON DELETE CASCADE,
  lat         DOUBLE PRECISION NOT NULL CHECK (lat BETWEEN -90 AND 90),
  lng         DOUBLE PRECISION NOT NULL CHECK (lng BETWEEN -180 AND 180),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX profile_locations_lat_lng_idx ON profile_locations (lat, lng);

-- No policies at all: not even the owner can read or write it directly.
-- Every access goes through the SECURITY DEFINER functions below (and the
-- data export).
ALTER TABLE profile_locations ENABLE ROW LEVEL SECURITY;

-- ── nearby_search_centers: rate-limit ledger ───────────────────────────
-- One row per distinct (roughly 1 km) search point an account used. Paging
-- through results for the same point doesn't add rows.
CREATE TABLE nearby_search_centers (
  profile_id   UUID NOT NULL REFERENCES profiles(profile_id) ON DELETE CASCADE,
  cell_lat     DOUBLE PRECISION NOT NULL,
  cell_lng     DOUBLE PRECISION NOT NULL,
  searched_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX nearby_search_centers_profile_idx ON nearby_search_centers (profile_id, searched_at);

ALTER TABLE nearby_search_centers ENABLE ROW LEVEL SECURITY;

-- ── Internal helpers ────────────────────────────────────────────────────

-- Snaps a point to the centre of its ~2 km grid cell. The longitude step
-- widens with latitude so cells stay roughly square (and never get more
-- precise) away from the equator.
CREATE FUNCTION _snap_to_location_cell(p_lat DOUBLE PRECISION, p_lng DOUBLE PRECISION)
RETURNS TABLE(lat DOUBLE PRECISION, lng DOUBLE PRECISION)
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  c_step CONSTANT DOUBLE PRECISION := 0.018; -- ~2 km of latitude
  v_lat DOUBLE PRECISION;
  v_lng_step DOUBLE PRECISION;
BEGIN
  v_lat := LEAST(GREATEST(floor(p_lat / c_step) * c_step + c_step / 2, -90), 90);
  v_lng_step := LEAST(c_step / GREATEST(cos(radians(v_lat)), 0.05), 360);
  lat := v_lat;
  lng := LEAST(GREATEST(floor(p_lng / v_lng_step) * v_lng_step + v_lng_step / 2, -180), 180);
  RETURN NEXT;
END;
$$;

-- Drops a profile's stored location as soon as it stops being eligible to
-- appear, so turning discoverability off or going private removes it from
-- the server straight away.
CREATE FUNCTION _clear_location_when_hidden() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT NEW.show_in_nearby OR NEW.is_private THEN
    DELETE FROM profile_locations WHERE profile_id = NEW.profile_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_clear_location_when_hidden
  AFTER UPDATE OF show_in_nearby, is_private ON profiles
  FOR EACH ROW
  WHEN (NOT NEW.show_in_nearby OR NEW.is_private)
  EXECUTE FUNCTION _clear_location_when_hidden();

-- ── report_live_location ────────────────────────────────────────────────
-- Stores the caller's rounded location. Only discoverable, public,
-- age-confirmed, unbanned accounts are stored; anyone else gets a no-op
-- (and any old row is removed), so their location is never collected.
CREATE FUNCTION report_live_location(p_lat DOUBLE PRECISION, p_lng DOUBLE PRECISION) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_eligible BOOLEAN;
  v_cell RECORD;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_lat IS NULL OR p_lng IS NULL OR p_lat NOT BETWEEN -90 AND 90 OR p_lng NOT BETWEEN -180 AND 180 THEN
    RAISE EXCEPTION 'INVALID_LOCATION';
  END IF;

  SELECT p.show_in_nearby AND NOT p.is_private AND p.age_confirmed_at IS NOT NULL AND NOT _is_banned(v_uid)
  INTO v_eligible
  FROM profiles p WHERE p.profile_id = v_uid;

  IF NOT COALESCE(v_eligible, false) THEN
    DELETE FROM profile_locations WHERE profile_id = v_uid;
    RETURN;
  END IF;

  SELECT * INTO v_cell FROM _snap_to_location_cell(p_lat, p_lng);

  -- Skips the write when nothing changed recently, so frequent reports from
  -- the same area cost nothing.
  INSERT INTO profile_locations (profile_id, lat, lng, updated_at)
  VALUES (v_uid, v_cell.lat, v_cell.lng, now())
  ON CONFLICT (profile_id) DO UPDATE
    SET lat = EXCLUDED.lat, lng = EXCLUDED.lng, updated_at = EXCLUDED.updated_at
    WHERE profile_locations.lat <> EXCLUDED.lat
       OR profile_locations.lng <> EXCLUDED.lng
       OR profile_locations.updated_at < now() - INTERVAL '1 hour';
END;
$$;

-- ── search_nearby_skaters ───────────────────────────────────────────────
-- One page of skaters near (p_lat, p_lng): the caller's own location or one
-- they chose. Returns profile-card fields only.
CREATE FUNCTION search_nearby_skaters(p_lat DOUBLE PRECISION, p_lng DOUBLE PRECISION, p_page INTEGER DEFAULT 0)
RETURNS TABLE(
  profile_id   UUID,
  username     TEXT,
  display_name TEXT,
  disciplines  TEXT[],
  city         TEXT,
  avatar_url   TEXT
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c_radius_m   CONSTANT DOUBLE PRECISION := 50000;
  c_page_size  CONSTANT INTEGER := 20;
  c_max_pages  CONSTANT INTEGER := 25;
  c_max_points CONSTANT INTEGER := 10;
  c_stale      CONSTANT INTERVAL := INTERVAL '30 days';
  v_uid UUID := auth.uid();
  v_cell_lat DOUBLE PRECISION;
  v_cell_lng DOUBLE PRECISION;
  v_lat_delta DOUBLE PRECISION;
  v_lng_delta DOUBLE PRECISION;
  v_seed TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_lat IS NULL OR p_lng IS NULL OR p_lat NOT BETWEEN -90 AND 90 OR p_lng NOT BETWEEN -180 AND 180 THEN
    RAISE EXCEPTION 'INVALID_LOCATION';
  END IF;
  IF p_page IS NULL OR p_page < 0 OR p_page >= c_max_pages THEN
    RETURN;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM profiles p WHERE p.profile_id = v_uid AND p.age_confirmed_at IS NOT NULL
  ) OR _is_banned(v_uid) THEN
    RAISE EXCEPTION 'NOT_ELIGIBLE';
  END IF;

  -- Rate limit on distinct search points (rounded to ~1 km so GPS jitter
  -- and paging don't count as new points).
  v_cell_lat := round(p_lat::NUMERIC, 2)::DOUBLE PRECISION;
  v_cell_lng := round(p_lng::NUMERIC, 2)::DOUBLE PRECISION;

  IF NOT EXISTS (
    SELECT 1 FROM nearby_search_centers c
    WHERE c.profile_id = v_uid AND c.cell_lat = v_cell_lat AND c.cell_lng = v_cell_lng
      AND c.searched_at > now() - INTERVAL '1 hour'
  ) THEN
    -- Serialises one account's concurrent searches so they can't race past
    -- the count.
    PERFORM pg_advisory_xact_lock(hashtext('nearby_search:' || v_uid::TEXT));
    IF (
      SELECT COUNT(*) FROM nearby_search_centers c
      WHERE c.profile_id = v_uid AND c.searched_at > now() - INTERVAL '1 hour'
    ) >= c_max_points THEN
      RAISE EXCEPTION 'RATE_LIMITED';
    END IF;
    DELETE FROM nearby_search_centers c
    WHERE c.profile_id = v_uid AND c.searched_at < now() - INTERVAL '1 day';
    INSERT INTO nearby_search_centers (profile_id, cell_lat, cell_lng)
    VALUES (v_uid, v_cell_lat, v_cell_lng);
  END IF;

  -- Bounding box first (uses the index), exact distance after.
  v_lat_delta := c_radius_m / 111320.0;
  v_lng_delta := c_radius_m / (111320.0 * GREATEST(cos(radians(p_lat)), 0.01));
  v_seed := v_uid::TEXT || ':' || (now() AT TIME ZONE 'utc')::DATE::TEXT;

  RETURN QUERY
  WITH candidates AS (
    SELECT l.profile_id, _haversine_meters(p_lat, p_lng, l.lat, l.lng) AS meters
    FROM profile_locations l
    WHERE l.lat BETWEEN p_lat - v_lat_delta AND p_lat + v_lat_delta
      AND (
        p_lng - v_lng_delta < -180 OR p_lng + v_lng_delta > 180 -- box crosses the antimeridian
        OR l.lng BETWEEN p_lng - v_lng_delta AND p_lng + v_lng_delta
      )
      AND l.updated_at > now() - c_stale
      AND l.profile_id <> v_uid
  )
  SELECT p.profile_id, p.username, p.display_name, p.disciplines, p.city, p.avatar_url
  FROM candidates c
  JOIN profiles p ON p.profile_id = c.profile_id
  WHERE c.meters <= c_radius_m
    AND p.show_in_nearby
    AND NOT p.is_private
    AND p.age_confirmed_at IS NOT NULL
    AND NOT _is_banned(p.profile_id)
    AND NOT is_blocked_between(v_uid, p.profile_id)
  ORDER BY
    CASE WHEN c.meters < 5000 THEN 0 WHEN c.meters < 20000 THEN 1 ELSE 2 END,
    md5(v_seed || p.profile_id::TEXT)
  LIMIT c_page_size OFFSET p_page * c_page_size;
END;
$$;

-- ── Execute privileges ──────────────────────────────────────────────────
REVOKE ALL ON FUNCTION _snap_to_location_cell(DOUBLE PRECISION, DOUBLE PRECISION) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION _clear_location_when_hidden() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION report_live_location(DOUBLE PRECISION, DOUBLE PRECISION) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION search_nearby_skaters(DOUBLE PRECISION, DOUBLE PRECISION, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION report_live_location(DOUBLE PRECISION, DOUBLE PRECISION) TO authenticated;
GRANT EXECUTE ON FUNCTION search_nearby_skaters(DOUBLE PRECISION, DOUBLE PRECISION, INTEGER) TO authenticated;

-- ── Data export ─────────────────────────────────────────────────────────
-- export_my_data() gains the caller's stored (rounded) location and their
-- recent search points. Patched in place, like 20261104170400_drop_clips.sql.
DO $$
DECLARE
  v_old TEXT := pg_get_functiondef('public.export_my_data'::regproc);
  v_new TEXT := replace(
    v_old,
    $r$'check_ins', _export_rows('check_ins', 'profile_id', v_uid),$r$,
    $r$'check_ins', _export_rows('check_ins', 'profile_id', v_uid),
    'nearby_location', _export_rows('profile_locations', 'profile_id', v_uid),
    'nearby_search_points', _export_rows('nearby_search_centers', 'profile_id', v_uid),$r$
  );
BEGIN
  IF v_new = v_old THEN
    RAISE EXCEPTION 'export_my_data no longer has the expected check_ins entry';
  END IF;
  EXECUTE v_new;
END;
$$;
