-- Gates check-in XP on a user-submitted spot's verification status, and
-- banks what would've been earned in the meantime so it isn't lost.
--
-- Follow-up to 20260916000000_spot_verification_requests.sql: DB evidence
-- after Phase 1 shipped showed a real grind vector -- a spot's creator could
-- check out and immediately back in while still standing there and
-- legitimately earn the daily check-in XP, with zero community or admin
-- involvement, at a spot nobody else had ever vouched for. Gating XP on
-- is_verified closes that, but a strict gate alone would also silently
-- punish the very first real skaters checking into a brand-new legitimate
-- spot -- exactly the check-ins that are supposed to earn it verification in
-- the first place. So instead: check-ins at an unverified spot still bank
-- their XP (pending_xp_events) and still count toward both the streak and
-- verification eligibility; the XP itself pays out once the spot is
-- verified, either by admin approval (spot_verification_requests) or by
-- enough distinct real skaters (not the creator) having checked in for
-- real -- a stronger signal than a vote or review, since those need no
-- physical presence at all.

-- ── pending_xp_events: banked XP, released once its spot is verified ──────

CREATE TABLE pending_xp_events (
  pending_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  UUID NOT NULL REFERENCES profiles(profile_id) ON DELETE CASCADE,
  spot_id     UUID NOT NULL REFERENCES user_spots(spot_id) ON DELETE CASCADE,
  source      TEXT NOT NULL,
  amount      INTEGER NOT NULL CHECK (amount > 0),
  ref_id      TEXT NOT NULL,
  dedup_key   TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Same anti-duplicate shape as xp_events itself -- a profile can only
  -- bank one entry per source+dedup_key, exactly mirroring the cap that
  -- would otherwise apply once it's a real xp_events row.
  UNIQUE (profile_id, source, dedup_key)
);

CREATE INDEX pending_xp_events_spot_idx ON pending_xp_events (spot_id);

ALTER TABLE pending_xp_events ENABLE ROW LEVEL SECURITY;

-- Private, same posture as xp_events -- a user can see their own banked
-- total, nobody else can. No write policy: only _perform_check_in (insert)
-- and _release_pending_spot_xp (delete) touch this table.
CREATE POLICY "pending_xp_events_select_own" ON pending_xp_events
  FOR SELECT USING (auth.uid() = profile_id);

-- ── _release_pending_spot_xp: pays out every banked entry for a spot ──────
-- Called once, from whichever path actually verifies the spot (community
-- threshold below, or admin approval in
-- 20260916000000_spot_verification_requests.sql's review trigger).

CREATE OR REPLACE FUNCTION _release_pending_spot_xp(p_spot_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_pending RECORD;
BEGIN
  FOR v_pending IN SELECT * FROM pending_xp_events WHERE spot_id = p_spot_id LOOP
    PERFORM award_xp(v_pending.profile_id, v_pending.source, v_pending.amount, v_pending.ref_id, v_pending.dedup_key);
  END LOOP;
  DELETE FROM pending_xp_events WHERE spot_id = p_spot_id;
END;
$$;

-- ── _perform_check_in: now XP-gated + community-verification-aware ───────
-- Return type changes (UUID -> a small result row), so this needs DROP,
-- not CREATE OR REPLACE. Its two callers (the entity-creation triggers in
-- 20260915000000_check_ins.sql) both invoke it via PERFORM, which discards
-- the return value regardless of shape -- same as how they already call
-- award_xp, itself a table-returning function -- so they need no changes.

DROP FUNCTION IF EXISTS _perform_check_in(UUID, UUID, TEXT, UUID, TEXT, TEXT);

CREATE OR REPLACE FUNCTION _perform_check_in(
  p_profile_id UUID,
  p_spot_id UUID,
  p_osm_spot_place_id TEXT,
  p_store_id UUID,
  p_osm_store_place_id TEXT,
  p_source TEXT
) RETURNS TABLE(check_in_id UUID, xp_awarded BOOLEAN, spot_verified_now BOOLEAN)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
#variable_conflict use_column
DECLARE
  v_entity_key TEXT := COALESCE(p_spot_id::TEXT, p_osm_spot_place_id, p_store_id::TEXT, p_osm_store_place_id);
  v_active RECORD;
  v_check_in_id UUID;
  v_today DATE := (now() AT TIME ZONE 'utc')::date;
  v_dedup_key TEXT;
  -- Only a real user_spots check-in is ever gated -- OSM spots/stores and
  -- user stores have no submission-review concept at all, so they stay
  -- "verified" for XP purposes by default.
  v_is_verified BOOLEAN := true;
  v_creator UUID;
  v_xp_awarded BOOLEAN := false;
  v_spot_verified_now BOOLEAN := false;
  v_distinct_real_checkins INTEGER;
BEGIN
  SELECT * INTO v_active FROM check_ins WHERE profile_id = p_profile_id AND checked_out_at IS NULL;

  IF FOUND THEN
    IF v_active.entity_key = v_entity_key THEN
      RETURN QUERY SELECT v_active.check_in_id, false, false;
      RETURN;
    END IF;
    UPDATE check_ins SET checked_out_at = now(), checked_out_reason = 'replaced'
    WHERE check_ins.check_in_id = v_active.check_in_id;
  END IF;

  INSERT INTO check_ins (profile_id, spot_id, osm_spot_place_id, store_id, osm_store_place_id, checked_in_source)
  VALUES (p_profile_id, p_spot_id, p_osm_spot_place_id, p_store_id, p_osm_store_place_id, p_source)
  RETURNING check_ins.check_in_id INTO v_check_in_id;

  IF p_source = 'manual' THEN
    v_dedup_key := v_entity_key || ':' || v_today::TEXT;

    -- Streak always advances on a real manual check-in, verified spot or
    -- not -- showing up is what builds the habit; only the XP payout is
    -- deferred below.
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

    IF v_is_verified THEN
      PERFORM award_xp(p_profile_id, 'check_in', 10, v_entity_key, v_dedup_key);
      v_xp_awarded := true;
    ELSE
      INSERT INTO pending_xp_events (profile_id, spot_id, source, amount, ref_id, dedup_key)
      VALUES (p_profile_id, p_spot_id, 'check_in', 10, v_entity_key, v_dedup_key)
      ON CONFLICT (profile_id, source, dedup_key) DO NOTHING;

      IF p_profile_id != v_creator THEN
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
          v_xp_awarded := true; -- this check-in's own banked entry was just released too
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN QUERY SELECT v_check_in_id, v_xp_awarded, v_spot_verified_now;
END;
$$;

-- ── check_in: propagates the richer result so the client can tell banked
-- from awarded XP, and surface a "just got verified" moment ───────────────

DROP FUNCTION IF EXISTS check_in(UUID, TEXT, UUID, TEXT, DOUBLE PRECISION, DOUBLE PRECISION);

CREATE OR REPLACE FUNCTION check_in(
  p_spot_id UUID,
  p_osm_spot_place_id TEXT,
  p_store_id UUID,
  p_osm_store_place_id TEXT,
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION
) RETURNS TABLE(check_in_id UUID, xp_awarded BOOLEAN, spot_verified_now BOOLEAN)
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

-- ── sync_check_in_status: fixes a latent bug found while auditing this
-- same class of issue -- its RETURNS TABLE column is also named
-- check_in_id, and its body's `WHERE check_in_id = v_active.check_in_id`
-- is the exact same bare-identifier ambiguity fixed above. Untriggered so
-- far (nothing has exercised a real auto-checkout yet), but would have
-- raised "column reference is ambiguous" the first time one did. Same
-- signature/return type as before, so CREATE OR REPLACE is enough here --
-- no DROP needed. ─────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION sync_check_in_status(p_lat DOUBLE PRECISION, p_lng DOUBLE PRECISION)
RETURNS TABLE(is_active BOOLEAN, check_in_id UUID, checked_out_reason TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
#variable_conflict use_column
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
    UPDATE check_ins SET checked_out_at = now(), checked_out_reason = v_reason WHERE check_ins.check_in_id = v_active.check_in_id;
    RETURN QUERY SELECT false, v_active.check_in_id, v_reason;
    RETURN;
  END IF;

  RETURN QUERY SELECT true, v_active.check_in_id, NULL::TEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION sync_check_in_status(DOUBLE PRECISION, DOUBLE PRECISION) TO authenticated;

-- ── Admin approval also releases banked XP, not just the creator's bonus ──

CREATE OR REPLACE FUNCTION _handle_spot_verification_review()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  NEW.reviewed_at := now();

  IF NEW.status = 'approved' THEN
    UPDATE user_spots SET is_verified = true WHERE spot_id = NEW.spot_id;
    UPDATE profiles SET spot_review_tokens = spot_review_tokens + 1 WHERE profile_id = NEW.profile_id;

    PERFORM _release_pending_spot_xp(NEW.spot_id);
    PERFORM award_xp(NEW.profile_id, 'entity_verified', 25, NEW.spot_id::TEXT, NEW.request_id::TEXT);
    PERFORM create_notification(
      NEW.profile_id, 'entity_verified', NEW.request_id::TEXT,
      'YOUR SPOT IS VERIFIED · +25 XP', 'success', 'SPOT VERIFIED'
    );
  ELSIF NEW.status = 'rejected' THEN
    UPDATE profiles SET spot_review_blocked_until = now() + interval '6 months'
    WHERE profile_id = NEW.profile_id;

    PERFORM create_notification(
      NEW.profile_id, 'entity_verification_rejected', NEW.request_id::TEXT,
      'YOUR SPOT REVIEW REQUEST WAS DECLINED', 'info', 'REVIEW DECLINED'
    );
  END IF;

  RETURN NEW;
END;
$$;
