-- Rate limit for the geocode-place edge function (city search in the Search
-- tab's location picker). The function forwards to Photon, a free
-- OpenStreetMap geocoder with a fair-use policy, so one account flooding it
-- could get our server blocked and break city search for everyone.
--
-- Counted here rather than in the function's memory, because edge functions
-- run as many short-lived copies that don't share state. Only timestamps are
-- kept (never what was searched), and each account's rows are pruned after
-- an hour.

CREATE TABLE geocode_requests (
  profile_id    UUID NOT NULL REFERENCES profiles(profile_id) ON DELETE CASCADE,
  requested_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX geocode_requests_profile_idx ON geocode_requests (profile_id, requested_at);

-- No policies: only claim_geocode_request (and the data export) touch it.
ALTER TABLE geocode_requests ENABLE ROW LEVEL SECURITY;

-- Records one city search for the caller and returns true, or returns false
-- (recording nothing) once they've made 30 in the last minute. The edge
-- function calls this with the caller's own token, so auth.uid() is them.
CREATE FUNCTION claim_geocode_request() RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c_per_minute CONSTANT INTEGER := 30;
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Serialises one account's concurrent calls so they can't race past the
  -- count.
  PERFORM pg_advisory_xact_lock(hashtext('geocode:' || v_uid::TEXT));

  IF (
    SELECT COUNT(*) FROM geocode_requests g
    WHERE g.profile_id = v_uid AND g.requested_at > now() - INTERVAL '1 minute'
  ) >= c_per_minute THEN
    RETURN false;
  END IF;

  DELETE FROM geocode_requests g
  WHERE g.profile_id = v_uid AND g.requested_at < now() - INTERVAL '1 hour';
  INSERT INTO geocode_requests (profile_id) VALUES (v_uid);
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION claim_geocode_request() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION claim_geocode_request() TO authenticated;

-- ── Data export ─────────────────────────────────────────────────────────
-- Patched in place, like 20261114120000_nearby_skaters.sql.
DO $$
DECLARE
  v_old TEXT := pg_get_functiondef('public.export_my_data'::regproc);
  v_new TEXT := replace(
    v_old,
    $r$'nearby_search_points', _export_rows('nearby_search_centers', 'profile_id', v_uid),$r$,
    $r$'nearby_search_points', _export_rows('nearby_search_centers', 'profile_id', v_uid),
    'city_search_times', _export_rows('geocode_requests', 'profile_id', v_uid),$r$
  );
BEGIN
  IF v_new = v_old THEN
    RAISE EXCEPTION 'export_my_data no longer has the expected nearby_search_points entry';
  END IF;
  EXECUTE v_new;
END;
$$;
