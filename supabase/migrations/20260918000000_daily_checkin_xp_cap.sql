-- Caps check-in XP to once per day, total -- not once per day per entity.
--
-- The dedup key check-in XP has used since Phase 1
-- (20260915000000_check_ins.sql) was "<entity_id>:<utc_date>", which only
-- capped repeat XP at the *same* spot on the same day. Visiting three
-- different spots in one day paid out three separate 10 XP awards -- and
-- worse, combined with the entity-creation-doesn't-gate-XP design, someone
-- could still farm N XP/day by checking into N different (even fake, per
-- 20260917's community-verification-gating) spots. The cap needs to be
-- per-account-per-day, not per-entity-per-day.
--
-- The new dedup key is "check_in:<utc_date>" -- day-scoped only, entity-
-- independent. Checked against *both* xp_events (already paid out) and
-- pending_xp_events (banked at an unverified spot) before deciding whether
-- to award or bank: an unverified spot's check-in claims the day's slot
-- the moment it's banked, even before it's actually paid out, so a second
-- check-in elsewhere the same day correctly sees the slot as used.
--
-- Community-verification eligibility (distinct real skaters checked in)
-- is unaffected -- it's based on check_ins rows, which are recorded on
-- every manual check-in regardless of whether that visit's own XP was
-- capped that day.

DROP FUNCTION IF EXISTS _perform_check_in(UUID, UUID, TEXT, UUID, TEXT, TEXT);

CREATE OR REPLACE FUNCTION _perform_check_in(
  p_profile_id UUID,
  p_spot_id UUID,
  p_osm_spot_place_id TEXT,
  p_store_id UUID,
  p_osm_store_place_id TEXT,
  p_source TEXT
) RETURNS TABLE(check_in_id UUID, xp_status TEXT, spot_verified_now BOOLEAN)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
#variable_conflict use_column
DECLARE
  v_entity_key TEXT := COALESCE(p_spot_id::TEXT, p_osm_spot_place_id, p_store_id::TEXT, p_osm_store_place_id);
  v_active RECORD;
  v_check_in_id UUID;
  v_today DATE := (now() AT TIME ZONE 'utc')::date;
  v_dedup_key TEXT;
  v_already_claimed_today BOOLEAN;
  -- Only a real user_spots check-in is ever gated -- OSM spots/stores and
  -- user stores have no submission-review concept at all, so they stay
  -- "verified" for XP purposes by default.
  v_is_verified BOOLEAN := true;
  v_creator UUID;
  -- 'awarded' | 'banked' | 'daily_cap' | 'none' (idempotent no-op / not a
  -- manual check-in at all).
  v_xp_status TEXT := 'none';
  v_spot_verified_now BOOLEAN := false;
  v_distinct_real_checkins INTEGER;
BEGIN
  SELECT * INTO v_active FROM check_ins WHERE profile_id = p_profile_id AND checked_out_at IS NULL;

  IF FOUND THEN
    IF v_active.entity_key = v_entity_key THEN
      RETURN QUERY SELECT v_active.check_in_id, 'none'::TEXT, false;
      RETURN;
    END IF;
    UPDATE check_ins SET checked_out_at = now(), checked_out_reason = 'replaced'
    WHERE check_ins.check_in_id = v_active.check_in_id;
  END IF;

  INSERT INTO check_ins (profile_id, spot_id, osm_spot_place_id, store_id, osm_store_place_id, checked_in_source)
  VALUES (p_profile_id, p_spot_id, p_osm_spot_place_id, p_store_id, p_osm_store_place_id, p_source)
  RETURNING check_ins.check_in_id INTO v_check_in_id;

  IF p_source = 'manual' THEN
    -- Streak always advances on a real manual check-in, verified spot or
    -- not, and at every entity visited -- only the XP payout below is
    -- capped to once per day, total, across every spot/store.
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

    IF p_spot_id IS NOT NULL THEN
      SELECT is_verified, created_by INTO v_is_verified, v_creator FROM user_spots WHERE spot_id = p_spot_id;
    END IF;

    v_dedup_key := 'check_in:' || v_today::TEXT;

    SELECT EXISTS (
      SELECT 1 FROM xp_events WHERE profile_id = p_profile_id AND source = 'check_in' AND dedup_key = v_dedup_key
      UNION ALL
      SELECT 1 FROM pending_xp_events WHERE profile_id = p_profile_id AND source = 'check_in' AND dedup_key = v_dedup_key
    ) INTO v_already_claimed_today;

    IF v_already_claimed_today THEN
      v_xp_status := 'daily_cap';
    ELSIF v_is_verified THEN
      PERFORM award_xp(p_profile_id, 'check_in', 10, v_entity_key, v_dedup_key);
      v_xp_status := 'awarded';
    ELSE
      INSERT INTO pending_xp_events (profile_id, spot_id, source, amount, ref_id, dedup_key)
      VALUES (p_profile_id, p_spot_id, 'check_in', 10, v_entity_key, v_dedup_key)
      ON CONFLICT (profile_id, source, dedup_key) DO NOTHING;
      v_xp_status := 'banked';
    END IF;

    -- Community verification: distinct real (GPS-verified, not the
    -- creator) skaters who've actually shown up -- based on check_ins rows
    -- recorded above, so this runs regardless of whether *this* visit's own
    -- XP happened to be capped today.
    IF NOT v_is_verified AND p_spot_id IS NOT NULL AND p_profile_id != v_creator THEN
      SELECT COUNT(DISTINCT profile_id) INTO v_distinct_real_checkins
      FROM check_ins
      WHERE spot_id = p_spot_id AND checked_in_source = 'manual' AND profile_id != v_creator;

      IF v_distinct_real_checkins >= 3 THEN
        UPDATE user_spots SET is_verified = true WHERE spot_id = p_spot_id;
        PERFORM _release_pending_spot_xp(p_spot_id);
        PERFORM create_notification(
          v_creator, 'entity_community_verified', p_spot_id::TEXT,
          'YOUR SPOT IS COMMUNITY VERIFIED', 'success', 'SPOT VERIFIED'
        );
        v_spot_verified_now := true;
        IF v_xp_status = 'banked' THEN
          v_xp_status := 'awarded'; -- this visit's own banked entry was just released too
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN QUERY SELECT v_check_in_id, v_xp_status, v_spot_verified_now;
END;
$$;

-- ── check_in: propagates xp_status instead of a plain boolean ─────────────

DROP FUNCTION IF EXISTS check_in(UUID, TEXT, UUID, TEXT, DOUBLE PRECISION, DOUBLE PRECISION);

CREATE OR REPLACE FUNCTION check_in(
  p_spot_id UUID,
  p_osm_spot_place_id TEXT,
  p_store_id UUID,
  p_osm_store_place_id TEXT,
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION
) RETURNS TABLE(check_in_id UUID, xp_status TEXT, spot_verified_now BOOLEAN)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
#variable_conflict use_column
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

  RETURN QUERY SELECT * FROM _perform_check_in(auth.uid(), p_spot_id, p_osm_spot_place_id, p_store_id, p_osm_store_place_id, 'manual');
END;
$$;

GRANT EXECUTE ON FUNCTION check_in(UUID, TEXT, UUID, TEXT, DOUBLE PRECISION, DOUBLE PRECISION) TO authenticated;
