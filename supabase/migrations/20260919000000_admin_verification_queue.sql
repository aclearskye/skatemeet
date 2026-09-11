-- Admin panel, Phase 1 (ADMIN_PANEL_PLAN.md): in-app review of
-- spot_verification_requests, replacing the by-hand Table Editor workflow
-- from 20260916000000_spot_verification_requests.sql. First admin/privileged
-- role in the app.

ALTER TABLE profiles ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT false;

-- Shared helper — every future admin RPC (reports, bans) reuses this instead
-- of repeating the EXISTS check inline.
CREATE FUNCTION is_admin(p_profile_id UUID) RETURNS BOOLEAN
LANGUAGE sql STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE profile_id = p_profile_id AND is_admin);
$$;

-- Audit trail for admin actions — approvals/rejections today, report
-- resolutions/bans later, all writing to this one table.
CREATE TABLE admin_audit_log (
  log_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id    UUID NOT NULL REFERENCES profiles(profile_id),
  action      TEXT NOT NULL, -- 'verification_approved' | 'verification_rejected'
  target_type TEXT NOT NULL, -- 'spot_verification_request'
  target_id   TEXT NOT NULL,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_audit_log_select_admin" ON admin_audit_log
  FOR SELECT USING (is_admin(auth.uid()));
-- No INSERT policy: written only via the RPCs below.

-- spot_verification_requests today only lets a user SELECT their own row
-- ("spot_verification_requests_select_own" in 20260916000000) — admins need
-- to see every pending request, not just their own.
CREATE POLICY "spot_verification_requests_select_admin" ON spot_verification_requests
  FOR SELECT USING (is_admin(auth.uid()));

-- ── admin_list_verification_requests: the queue itself ─────────────────────

CREATE FUNCTION admin_list_verification_requests()
RETURNS TABLE(
  request_id UUID,
  spot_id UUID,
  spot_name TEXT,
  spot_photo_url TEXT,
  requested_by UUID,
  requested_by_username TEXT,
  requested_at TIMESTAMPTZ
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'NOT_ADMIN';
  END IF;

  RETURN QUERY
    SELECT r.request_id, r.spot_id, s.name, s.photo_url, r.profile_id, p.username, r.requested_at
    FROM spot_verification_requests r
    JOIN user_spots s ON s.spot_id = r.spot_id
    JOIN profiles p ON p.profile_id = r.profile_id
    WHERE r.status = 'pending'
    ORDER BY r.requested_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_list_verification_requests() TO authenticated;

-- ── admin_approve_verification / admin_reject_verification ─────────────────
-- Thin by design: the existing BEFORE UPDATE trigger
-- _handle_spot_verification_review (20260916000000) already does every side
-- effect on a status flip -- is_verified, pending_xp_events release, XP
-- award, notification, token refund/6-month block -- the same way whether
-- the flip comes from here or from a by-hand Table Editor edit. These RPCs
-- only add the is_admin gate and the audit trail on top of that.

CREATE FUNCTION admin_approve_verification(p_request_id UUID) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'NOT_ADMIN';
  END IF;

  UPDATE spot_verification_requests SET status = 'approved'
  WHERE request_id = p_request_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'REQUEST_NOT_PENDING';
  END IF;

  INSERT INTO admin_audit_log (admin_id, action, target_type, target_id)
  VALUES (auth.uid(), 'verification_approved', 'spot_verification_request', p_request_id::TEXT);
END;
$$;

GRANT EXECUTE ON FUNCTION admin_approve_verification(UUID) TO authenticated;

CREATE FUNCTION admin_reject_verification(p_request_id UUID) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'NOT_ADMIN';
  END IF;

  UPDATE spot_verification_requests SET status = 'rejected'
  WHERE request_id = p_request_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'REQUEST_NOT_PENDING';
  END IF;

  INSERT INTO admin_audit_log (admin_id, action, target_type, target_id)
  VALUES (auth.uid(), 'verification_rejected', 'spot_verification_request', p_request_id::TEXT);
END;
$$;

GRANT EXECUTE ON FUNCTION admin_reject_verification(UUID) TO authenticated;
