-- Follows, the spot/store post grid and the ranked feed
-- (md/media_posts.md §3 "Follows", §3 "Spot/store grid", §7 "Feed").

-- ── OSM entity tags lose the tag when the entity goes ───────────────────
-- User spots/stores already SET NULL (20261104170000_posts.sql); OSM rows
-- are real rows too (osm_spots / osm_stores), so they get the same rule.
ALTER TABLE posts
  ADD CONSTRAINT posts_osm_spot_fkey FOREIGN KEY (osm_spot_place_id) REFERENCES osm_spots(place_id) ON DELETE SET NULL,
  ADD CONSTRAINT posts_osm_store_fkey FOREIGN KEY (osm_store_place_id) REFERENCES osm_stores(place_id) ON DELETE SET NULL;

-- ── follows (reusing crew_follows) ──────────────────────────────────────
-- One-way, Instagram-style. Private profiles can't be followed. A follow of
-- someone who later turns private goes *dormant*: it stays in the table but
-- is neither counted, listed nor fed (unless the pair are friends), and
-- comes back if they go public again.
ALTER TABLE crew_follows ADD CONSTRAINT crew_follows_no_self CHECK (follower_id <> following_id);

DROP POLICY "crew_select" ON crew_follows;
DROP POLICY "crew_insert" ON crew_follows;
DROP POLICY "crew_delete" ON crew_follows;
-- Was USING (true), exposing private and blocked users' follow graphs.
-- Writes now go through toggle_follow / remove_follower only.
CREATE POLICY "crew_follows_select_visible" ON crew_follows FOR SELECT TO authenticated
  USING (viewer_can_see_profile(follower_id) AND viewer_can_see_profile(following_id));

CREATE FUNCTION _is_active_follow(p_follower UUID, p_following UUID) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT NOT COALESCE((SELECT is_private FROM profiles WHERE profile_id = p_following), false)
      OR are_friends(p_follower, p_following);
$$;

-- Returns the new state (true = now following).
CREATE FUNCTION toggle_follow(p_profile_id UUID) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;
  IF p_profile_id = auth.uid() THEN
    RAISE EXCEPTION 'CANNOT_FOLLOW_SELF';
  END IF;

  DELETE FROM crew_follows WHERE follower_id = auth.uid() AND following_id = p_profile_id;
  IF FOUND THEN
    RETURN false;
  END IF;

  IF NOT can_view_profile(auth.uid(), p_profile_id) THEN
    RAISE EXCEPTION 'PROFILE_NOT_FOUND';
  END IF;
  IF (SELECT is_private FROM profiles WHERE profile_id = p_profile_id) THEN
    RAISE EXCEPTION 'PROFILE_PRIVATE';
  END IF;
  INSERT INTO crew_follows (follower_id, following_id) VALUES (auth.uid(), p_profile_id);
  RETURN true;
END;
$$;

-- Drops someone from your own followers without blocking them.
CREATE FUNCTION remove_follower(p_profile_id UUID) RETURNS VOID
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  DELETE FROM crew_follows WHERE follower_id = p_profile_id AND following_id = auth.uid();
$$;

CREATE FUNCTION get_follow_counts(p_profile_id UUID)
RETURNS TABLE(followers INTEGER, following INTEGER)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT viewer_can_see_profile(p_profile_id) THEN
    RAISE EXCEPTION 'PROFILE_NOT_FOUND';
  END IF;
  RETURN QUERY SELECT
    (SELECT count(*)::INTEGER FROM crew_follows f
      WHERE f.following_id = p_profile_id AND _is_active_follow(f.follower_id, f.following_id)),
    (SELECT count(*)::INTEGER FROM crew_follows f
      WHERE f.follower_id = p_profile_id AND _is_active_follow(f.follower_id, f.following_id));
END;
$$;

-- p_direction: 'followers' (who follows p_profile_id) or 'following'.
-- Blocked users and private profiles the viewer can't see are left out.
CREATE FUNCTION list_follows(p_profile_id UUID, p_direction TEXT, p_query TEXT, p_offset INTEGER, p_limit INTEGER)
RETURNS TABLE(profile_id UUID, username TEXT, display_name TEXT, avatar_url TEXT, is_private BOOLEAN, viewer_follows BOOLEAN)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT viewer_can_see_profile(p_profile_id) THEN
    RAISE EXCEPTION 'PROFILE_NOT_FOUND';
  END IF;
  RETURN QUERY
    SELECT p.profile_id, p.username, p.display_name, p.avatar_url, p.is_private,
      EXISTS (SELECT 1 FROM crew_follows v WHERE v.follower_id = auth.uid() AND v.following_id = p.profile_id)
    FROM crew_follows f
    JOIN profiles p ON p.profile_id = CASE WHEN p_direction = 'followers' THEN f.follower_id ELSE f.following_id END
    WHERE (CASE WHEN p_direction = 'followers' THEN f.following_id ELSE f.follower_id END) = p_profile_id
      AND _is_active_follow(f.follower_id, f.following_id)
      AND can_view_profile(auth.uid(), p.profile_id)
      AND (COALESCE(p_query, '') = '' OR p.username ILIKE p_query || '%' OR p.display_name ILIKE '%' || p_query || '%')
    ORDER BY f.created_at DESC
    OFFSET COALESCE(p_offset, 0)
    LIMIT LEAST(COALESCE(p_limit, 30), 100);
END;
$$;

-- A block (either direction) also ends follows both ways.
CREATE FUNCTION _remove_follows_on_block() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM crew_follows
  WHERE (follower_id = NEW.blocker_id AND following_id = NEW.blocked_id)
     OR (follower_id = NEW.blocked_id AND following_id = NEW.blocker_id);
  RETURN NULL;
END;
$$;
CREATE TRIGGER profile_blocks_remove_follows AFTER INSERT ON profile_blocks
  FOR EACH ROW EXECUTE FUNCTION _remove_follows_on_block();

-- ── spot / store tagged-post grid ───────────────────────────────────────
-- Only posts whose author has *ever* manually checked in at that entity
-- (before or after posting). SECURITY DEFINER to read other users'
-- check-ins; can_see_post still gates each post for the viewer.
CREATE FUNCTION entity_posts(
  p_spot_id UUID, p_osm_spot_place_id TEXT, p_store_id UUID, p_osm_store_place_id TEXT, p_limit INTEGER
) RETURNS TABLE(post_id UUID)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.post_id FROM posts p
  WHERE p.status = 'published' AND p.archived_at IS NULL
    AND ((p_spot_id IS NOT NULL AND p.spot_id = p_spot_id)
      OR (p_osm_spot_place_id IS NOT NULL AND p.osm_spot_place_id = p_osm_spot_place_id)
      OR (p_store_id IS NOT NULL AND p.store_id = p_store_id)
      OR (p_osm_store_place_id IS NOT NULL AND p.osm_store_place_id = p_osm_store_place_id))
    AND EXISTS (
      SELECT 1 FROM check_ins c
      WHERE c.profile_id = p.profile_id AND c.checked_in_source = 'manual'
        AND c.entity_key = COALESCE(p_spot_id::TEXT, p_osm_spot_place_id, p_store_id::TEXT, p_osm_store_place_id)
    )
    AND can_see_post(p.post_id)
  ORDER BY p.published_at DESC
  LIMIT LEAST(COALESCE(p_limit, 30), 90);
$$;

-- ── feed ────────────────────────────────────────────────────────────────
-- Global: everything the viewer can see (public profiles + friended
-- private ones, per can_see_post via posts RLS -- this function is
-- SECURITY INVOKER on purpose). Following: only followed authors. Logged
-- out: Global only, public profiles only (anon RLS).
--
-- score = recency decay + likes + followed boost + "tagged near you" boost.
-- Weights live here only, so they're easy to tune. Pagination is a keyset
-- on (score, post_id) at a fixed p_as_of so pages don't shift mid-scroll.
CREATE FUNCTION get_feed(
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
      AND (auth.uid() IS NULL OR p.profile_id <> auth.uid())
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

-- ── people on posts ─────────────────────────────────────────────────────
-- Author + accepted tagged skaters for a batch of posts, as minimal cards.
-- profiles is authenticated-only (and profile_cards needs a session), so
-- this is what lets logged-out web viewers see who posted. Scoped by
-- can_see_post, so it reveals nothing about posts the caller can't see.
CREATE FUNCTION get_post_people(p_post_ids UUID[])
RETURNS TABLE(post_id UUID, role TEXT, profile_id UUID, username TEXT, display_name TEXT, avatar_url TEXT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.post_id, 'author', pr.profile_id, pr.username, pr.display_name, pr.avatar_url
  FROM posts p JOIN profiles pr ON pr.profile_id = p.profile_id
  WHERE p.post_id = ANY(p_post_ids) AND can_see_post(p.post_id)
  UNION ALL
  -- Pending tags are only ever returned to the post's author (so editing
  -- tags doesn't silently drop them); everyone else sees accepted ones.
  SELECT t.post_id, CASE WHEN t.status = 'accepted' THEN 'tag' ELSE 'pending_tag' END,
    pr.profile_id, pr.username, pr.display_name, pr.avatar_url
  FROM post_skater_tags t
  JOIN posts p ON p.post_id = t.post_id
  JOIN profiles pr ON pr.profile_id = t.tagged_profile_id
  WHERE t.post_id = ANY(p_post_ids) AND can_see_post(t.post_id)
    AND (t.status = 'accepted' OR p.profile_id = auth.uid())
    AND (auth.uid() IS NULL OR NOT is_blocked_between(auth.uid(), pr.profile_id));
$$;

-- ── function access ─────────────────────────────────────────────────────
DO $$
DECLARE fn REGPROCEDURE;
BEGIN
  FOREACH fn IN ARRAY ARRAY['_remove_follows_on_block()']::REGPROCEDURE[] LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn);
  END LOOP;
  FOREACH fn IN ARRAY ARRAY[
    'toggle_follow(uuid)', 'remove_follower(uuid)', 'get_follow_counts(uuid)',
    'list_follows(uuid,text,text,integer,integer)'
  ]::REGPROCEDURE[] LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', fn);
  END LOOP;
END;
$$;

-- Used by RLS / readable logged out.
GRANT EXECUTE ON FUNCTION _is_active_follow(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION entity_posts(uuid, text, uuid, text, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_post_people(uuid[]) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_feed(text, double precision, double precision, timestamptz, double precision, uuid, integer) TO anon, authenticated;
