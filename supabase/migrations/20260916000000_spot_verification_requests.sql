-- Creator-requested spot verification (Phase 2 of CHECKIN_FEATURE_PLAN.md,
-- spots only per the user's explicit scope -- not stores).
--
-- Motivated by a real gap found after Phase 1 shipped: check-in XP is
-- awarded to *anyone* who's physically present at *any* user-submitted spot,
-- verified or not -- that's correct for genuine visitors, but it also means
-- a spot's own creator can check out and back in while still standing there
-- and legitimately earn the daily check-in XP with zero community or admin
-- involvement, at a spot nobody else has ever vouched for. This migration
-- doesn't change check-in XP eligibility (that's a bigger, separate
-- decision) -- it adds the creator-facing side of admin review, so an
-- owner has a real path to getting their spot marked is_verified without
-- waiting on (or gaming) organic community upvotes.
--
-- Reuses the business_accounts pattern already in this codebase: a
-- '..._pending' status with no UPDATE policy for `authenticated` at all --
-- an admin reviews and flips status by hand in the Supabase Table Editor,
-- same as business account verification already works. No admin role or
-- in-app admin UI is introduced here.

ALTER TABLE profiles
  ADD COLUMN spot_review_tokens INTEGER NOT NULL DEFAULT 1 CHECK (spot_review_tokens >= 0),
  ADD COLUMN spot_review_blocked_until TIMESTAMPTZ;

CREATE TABLE spot_verification_requests (
  request_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spot_id      UUID NOT NULL REFERENCES user_spots(spot_id) ON DELETE CASCADE,
  profile_id   UUID NOT NULL REFERENCES profiles(profile_id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at  TIMESTAMPTZ
);

-- One live request per spot at a time -- a second request can't be filed
-- while one's already pending.
CREATE UNIQUE INDEX spot_verification_requests_one_pending_per_spot
  ON spot_verification_requests (spot_id) WHERE status = 'pending';

CREATE INDEX spot_verification_requests_profile_idx ON spot_verification_requests (profile_id);

ALTER TABLE spot_verification_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "spot_verification_requests_select_own" ON spot_verification_requests
  FOR SELECT USING (auth.uid() = profile_id);

-- Deliberately no INSERT/UPDATE policy -- creation only via
-- request_spot_verification() below, status changes only by hand.

-- ── request_spot_verification: the creator-facing entry point ─────────────

CREATE OR REPLACE FUNCTION request_spot_verification(p_spot_id UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_spot RECORD;
  v_tokens INTEGER;
  v_blocked_until TIMESTAMPTZ;
  v_request_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT created_by, is_verified INTO v_spot FROM user_spots WHERE spot_id = p_spot_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ENTITY_NOT_FOUND';
  END IF;
  IF v_spot.created_by != auth.uid() THEN
    RAISE EXCEPTION 'NOT_OWNER';
  END IF;
  IF v_spot.is_verified THEN
    RAISE EXCEPTION 'ALREADY_VERIFIED';
  END IF;
  IF EXISTS (SELECT 1 FROM spot_verification_requests WHERE spot_id = p_spot_id AND status = 'pending') THEN
    RAISE EXCEPTION 'ALREADY_PENDING';
  END IF;

  SELECT spot_review_tokens, spot_review_blocked_until INTO v_tokens, v_blocked_until
  FROM profiles WHERE profile_id = auth.uid();

  IF v_blocked_until IS NOT NULL AND v_blocked_until > now() THEN
    RAISE EXCEPTION 'BLOCKED';
  END IF;
  IF v_tokens < 1 THEN
    RAISE EXCEPTION 'NO_TOKENS';
  END IF;

  UPDATE profiles SET spot_review_tokens = spot_review_tokens - 1 WHERE profile_id = auth.uid();

  INSERT INTO spot_verification_requests (spot_id, profile_id)
  VALUES (p_spot_id, auth.uid())
  RETURNING request_id INTO v_request_id;

  RETURN v_request_id;
END;
$$;

GRANT EXECUTE ON FUNCTION request_spot_verification(UUID) TO authenticated;

-- ── get_spot_verification_status: one round trip for the button's state ───

CREATE OR REPLACE FUNCTION get_spot_verification_status(p_spot_id UUID)
RETURNS TABLE(is_verified BOOLEAN, has_pending_request BOOLEAN, my_tokens INTEGER, my_blocked_until TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
    SELECT
      s.is_verified,
      EXISTS (
        SELECT 1 FROM spot_verification_requests r
        WHERE r.spot_id = p_spot_id AND r.status = 'pending'
      ),
      p.spot_review_tokens,
      p.spot_review_blocked_until
    FROM user_spots s, profiles p
    WHERE s.spot_id = p_spot_id AND p.profile_id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION get_spot_verification_status(UUID) TO authenticated;

-- ── Review outcome side effects ─────────────────────────────────────────
-- Fires whichever way status is set -- by hand in the Table Editor today,
-- or by an in-app admin panel later (ADMIN_PANEL_PLAN.md) without needing
-- to change: that plan's admin RPCs would just flip this same column.

CREATE OR REPLACE FUNCTION _handle_spot_verification_review()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  NEW.reviewed_at := now();

  IF NEW.status = 'approved' THEN
    UPDATE user_spots SET is_verified = true WHERE spot_id = NEW.spot_id;

    -- Refunds the token spent to request this review: a track record of
    -- good submissions sustains a creator's ability to request more,
    -- rather than being a one-shot resource.
    UPDATE profiles SET spot_review_tokens = spot_review_tokens + 1 WHERE profile_id = NEW.profile_id;

    PERFORM award_xp(NEW.profile_id, 'entity_verified', 25, NEW.spot_id::TEXT, NEW.request_id::TEXT);
    PERFORM create_notification(
      NEW.profile_id, 'entity_verified', NEW.request_id::TEXT,
      'YOUR SPOT IS VERIFIED · +25 XP', 'success', 'SPOT VERIFIED'
    );
  ELSIF NEW.status = 'rejected' THEN
    -- No token refund -- it was already spent on this attempt. A 6-month
    -- block on filing another request is the cost of a rejected one.
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

DROP TRIGGER IF EXISTS before_spot_verification_review ON spot_verification_requests;
CREATE TRIGGER before_spot_verification_review
  BEFORE UPDATE ON spot_verification_requests
  FOR EACH ROW EXECUTE FUNCTION _handle_spot_verification_review();
