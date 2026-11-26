-- The Stores tab's Visited list: every store the viewer has checked in at
-- (manual or automatic), most recent visit first. Unlike Nearest and
-- Following it includes stores nobody has claimed yet, which open as their
-- community listing. Hidden stores (pending_claim) are left out.

CREATE FUNCTION get_visited_stores()
RETURNS TABLE (
  profile_id      UUID,
  name            TEXT,
  address         TEXT,
  logo_path       TEXT,
  store_id        UUID,
  osm_place_id    TEXT,
  last_visited_at TIMESTAMPTZ,
  visit_count     INT
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
  WITH visits AS (
    SELECT ci.store_id, ci.osm_store_place_id AS osm_place_id,
           max(ci.checked_in_at) AS last_visited_at, count(*)::INT AS visit_count
    FROM check_ins ci
    WHERE ci.profile_id = v_uid
      AND (ci.store_id IS NOT NULL OR ci.osm_store_place_id IS NOT NULL)
    GROUP BY ci.store_id, ci.osm_store_place_id
  )
  SELECT
    -- The owner, when the store is claimed and shown (otherwise NULL).
    CASE WHEN c.profile_id IS NOT NULL AND NOT _is_banned(c.profile_id)
              AND NOT is_blocked_between(v_uid, c.profile_id) THEN c.profile_id END,
    coalesce(CASE WHEN c.profile_id IS NOT NULL THEN d.name END, us.name, os.name),
    coalesce(us.address, os.address),
    CASE WHEN c.profile_id IS NOT NULL THEN d.logo_path END,
    v.store_id,
    v.osm_place_id,
    v.last_visited_at,
    v.visit_count
  FROM visits v
  LEFT JOIN user_stores us ON us.store_id = v.store_id
  LEFT JOIN osm_stores os ON os.place_id = v.osm_place_id
  LEFT JOIN store_claims c ON c.status = 'approved'
    AND ((v.store_id IS NOT NULL AND c.store_id = v.store_id)
      OR (v.osm_place_id IS NOT NULL AND c.osm_place_id = v.osm_place_id))
  LEFT JOIN store_public_details d ON d.profile_id = c.profile_id
  -- The store still exists and isn't hidden.
  WHERE (us.store_id IS NOT NULL AND NOT us.pending_claim) OR os.place_id IS NOT NULL
  ORDER BY v.last_visited_at DESC
  LIMIT 200;
END;
$$;

REVOKE EXECUTE ON FUNCTION get_visited_stores() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_visited_stores() TO authenticated;
