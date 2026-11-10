-- Your own published posts now appear in your Global feed too, so you see a
-- post land after uploading it (Instagram-style). The Following tab is
-- unchanged: you can't follow yourself, so it never includes your own.
-- Same signature, so the existing grants carry over.

CREATE OR REPLACE FUNCTION get_feed(
  p_tab TEXT,
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_as_of TIMESTAMPTZ,
  p_after_score DOUBLE PRECISION,
  p_after_id UUID,
  p_limit INTEGER
) RETURNS TABLE(post_id UUID, score DOUBLE PRECISION)
LANGUAGE sql STABLE SET search_path = public AS $$
  WITH followed AS (
    SELECT following_id FROM crew_follows WHERE follower_id = auth.uid()
  ),
  candidates AS (
    SELECT p.post_id, p.profile_id, p.published_at, p.like_count,
      COALESCE(us.latitude, os.latitude, st.latitude, ost.latitude) AS lat,
      COALESCE(us.longitude, os.longitude, st.longitude, ost.longitude) AS lng
    FROM posts p
    LEFT JOIN user_spots us ON us.spot_id = p.spot_id
    LEFT JOIN osm_spots os ON os.place_id = p.osm_spot_place_id
    LEFT JOIN user_stores st ON st.store_id = p.store_id
    LEFT JOIN osm_stores ost ON ost.place_id = p.osm_store_place_id
    WHERE p.status = 'published' AND p.archived_at IS NULL
      AND p.published_at <= p_as_of
      AND p.published_at > p_as_of - INTERVAL '90 days'
      AND (p_tab <> 'following' OR p.profile_id IN (SELECT following_id FROM followed))
      AND NOT EXISTS (SELECT 1 FROM post_reports r WHERE r.post_id = p.post_id AND r.profile_id = auth.uid())
  ),
  scored AS (
    SELECT c.post_id, (
      100.0 / power(GREATEST(extract(epoch FROM p_as_of - c.published_at) / 3600.0, 0) + 2, 1.2)
      + 2.0 * ln(1 + c.like_count)
      + CASE WHEN c.profile_id IN (SELECT following_id FROM followed) THEN 5 ELSE 0 END
      -- Within ~10 km (equirectangular approximation is plenty at this range).
      + CASE WHEN p_lat IS NOT NULL AND c.lat IS NOT NULL
               AND 111.32 * sqrt(power(c.lat - p_lat, 2) + power((c.lng - p_lng) * cos(radians(p_lat)), 2)) <= 10
             THEN 3 ELSE 0 END
    )::DOUBLE PRECISION AS score
    FROM candidates c
  )
  SELECT s.post_id, s.score FROM scored s
  WHERE p_after_score IS NULL OR (s.score, s.post_id) < (p_after_score, p_after_id)
  ORDER BY s.score DESC, s.post_id DESC
  LIMIT LEAST(COALESCE(p_limit, 10), 50);
$$;
