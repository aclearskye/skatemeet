-- The Stores tab (drawer): Nearest and Following, like the feed's
-- Global / Following.
--
--   * search_nearby_stores gains the store's address, for the list rows.
--     Its return type changes, so it's dropped and recreated.
--   * get_followed_stores lists the approved stores the viewer follows.

DROP FUNCTION search_nearby_stores(DOUBLE PRECISION, DOUBLE PRECISION);

CREATE FUNCTION search_nearby_stores(p_lat DOUBLE PRECISION, p_lng DOUBLE PRECISION)
RETURNS TABLE (
  profile_id   UUID,
  name         TEXT,
  address      TEXT,
  logo_path    TEXT,
  store_id     UUID,
  osm_place_id TEXT,
  meters       DOUBLE PRECISION
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
#variable_conflict use_column
DECLARE
  c_radius_m CONSTANT DOUBLE PRECISION := 50000;
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;
  IF p_lat IS NULL OR p_lng IS NULL OR p_lat NOT BETWEEN -90 AND 90 OR p_lng NOT BETWEEN -180 AND 180 THEN
    RAISE EXCEPTION 'INVALID_LOCATION';
  END IF;

  RETURN QUERY
  SELECT * FROM (
    SELECT c.profile_id,
           coalesce(d.name, us.name, os.name),
           coalesce(us.address, os.address),
           d.logo_path,
           c.store_id,
           c.osm_place_id,
           _haversine_meters(p_lat, p_lng, coalesce(us.latitude, os.latitude), coalesce(us.longitude, os.longitude)) AS meters
    FROM store_claims c
    LEFT JOIN store_public_details d ON d.profile_id = c.profile_id
    LEFT JOIN user_stores us ON us.store_id = c.store_id
    LEFT JOIN osm_stores os ON os.place_id = c.osm_place_id
    WHERE c.status = 'approved'
      AND NOT _is_banned(c.profile_id)
      AND NOT is_blocked_between(v_uid, c.profile_id)
  ) s
  WHERE s.meters <= c_radius_m
  ORDER BY s.meters
  LIMIT 20;
END;
$$;

-- Approved stores the viewer follows, most recently followed first.
CREATE FUNCTION get_followed_stores()
RETURNS TABLE (
  profile_id   UUID,
  name         TEXT,
  address      TEXT,
  logo_path    TEXT,
  store_id     UUID,
  osm_place_id TEXT
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
#variable_conflict use_column
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  RETURN QUERY
  SELECT c.profile_id,
         coalesce(d.name, us.name, os.name),
         coalesce(us.address, os.address),
         d.logo_path,
         c.store_id,
         c.osm_place_id
  FROM crew_follows f
  JOIN store_claims c ON c.profile_id = f.following_id AND c.status = 'approved'
  LEFT JOIN store_public_details d ON d.profile_id = c.profile_id
  LEFT JOIN user_stores us ON us.store_id = c.store_id
  LEFT JOIN osm_stores os ON os.place_id = c.osm_place_id
  WHERE f.follower_id = v_uid
    AND NOT _is_banned(c.profile_id)
    AND NOT is_blocked_between(v_uid, c.profile_id)
  ORDER BY f.created_at DESC
  LIMIT 200;
END;
$$;

REVOKE EXECUTE ON FUNCTION
  search_nearby_stores(DOUBLE PRECISION, DOUBLE PRECISION), get_followed_stores()
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION
  search_nearby_stores(DOUBLE PRECISION, DOUBLE PRECISION), get_followed_stores()
TO authenticated;
