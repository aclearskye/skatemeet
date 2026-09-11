-- Admin panel, Phase 4: reporting a profile (not just its content), and the
-- ban-appeal flow that follows a ban. Closes the loop the user described:
-- report a profile -> admin bans or dismisses -> a banned user can appeal ->
-- admin reinstates or denies.

-- ── Profile reports ──────────────────────────────────────────────────────
-- Mirrors spot_review_reports/store_review_reports (20260909093922) --
-- same UNIQUE(target, reporter) one-report-per-reporter shape, same
-- resolved_at/resolved_by/resolution trail Phase 2 added to the other
-- report tables (20260920000000).

CREATE TABLE profile_reports (
  report_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  UUID NOT NULL REFERENCES profiles(profile_id) ON DELETE CASCADE,
  reported_by UUID NOT NULL REFERENCES profiles(profile_id) ON DELETE CASCADE,
  reason      TEXT NOT NULL CHECK (reason IN ('harassment', 'spam', 'impersonation', 'inappropriate_content', 'other')),
  details     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES profiles(profile_id),
  resolution  TEXT CHECK (resolution IN ('dismissed', 'banned')),
  UNIQUE (profile_id, reported_by)
);

ALTER TABLE profile_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profile_reports_select_own" ON profile_reports
  FOR SELECT USING (auth.uid() = reported_by);
CREATE POLICY "profile_reports_select_admin" ON profile_reports
  FOR SELECT USING (is_admin(auth.uid()));
-- No INSERT policy: writes only via report_profile() below.

CREATE FUNCTION report_profile(p_profile_id UUID, p_reason TEXT, p_details TEXT DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_profile_id = auth.uid() THEN
    RAISE EXCEPTION 'CANNOT_REPORT_SELF';
  END IF;

  INSERT INTO profile_reports (profile_id, reported_by, reason, details)
    VALUES (p_profile_id, auth.uid(), p_reason, p_details)
  ON CONFLICT (profile_id, reported_by) DO NOTHING;
END;
$$;
GRANT EXECUTE ON FUNCTION report_profile(UUID, TEXT, TEXT) TO authenticated;

-- admin_list_profile_reports: grouped by target, same shape as
-- admin_list_photo_reports/admin_list_review_reports.
CREATE FUNCTION admin_list_profile_reports()
RETURNS TABLE(
  profile_id UUID,
  username TEXT,
  display_name TEXT,
  is_banned BOOLEAN,
  report_count BIGINT,
  reasons TEXT[],
  oldest_report_at TIMESTAMPTZ
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'NOT_ADMIN';
  END IF;

  RETURN QUERY
    SELECT p.profile_id, p.username, p.display_name, is_banned(p.profile_id),
           COUNT(r.report_id), array_agg(DISTINCT r.reason), MIN(r.created_at)
    FROM profile_reports r
    JOIN profiles p ON p.profile_id = r.profile_id
    WHERE r.resolved_at IS NULL
    GROUP BY p.profile_id, p.username, p.display_name
    ORDER BY MIN(r.created_at) ASC;
END;
$$;
GRANT EXECUTE ON FUNCTION admin_list_profile_reports() TO authenticated;

-- Dismissing a profile report is a plain RPC like the other report tables.
-- Banning one is *not* a separate RPC -- it's just the existing ban flow
-- (Edge Function + admin_ban_user), which is extended below to also close
-- out any open reports on the profile it bans, so the report queue clears
-- itself the moment an admin acts on it instead of needing a second call.
CREATE FUNCTION admin_dismiss_profile_report(p_profile_id UUID) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'NOT_ADMIN';
  END IF;

  UPDATE profile_reports SET resolved_at = now(), resolved_by = auth.uid(), resolution = 'dismissed'
  WHERE profile_id = p_profile_id AND resolved_at IS NULL;

  INSERT INTO admin_audit_log (admin_id, action, target_type, target_id, notes)
  VALUES (auth.uid(), 'report_resolved', 'profile', p_profile_id::TEXT, 'dismissed');
END;
$$;
GRANT EXECUTE ON FUNCTION admin_dismiss_profile_report(UUID) TO authenticated;

-- admin_ban_user (20260924000000_admin_bans.sql) extended: closing any open
-- profile_reports on the banned profile is a side effect of the ban itself,
-- same "thin RPC + automatic side effect" shape as the verification-review
-- trigger releasing banked XP on approval.
CREATE OR REPLACE FUNCTION admin_ban_user(p_profile_id UUID, p_reason TEXT) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_ban_id UUID;
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'NOT_ADMIN';
  END IF;
  IF is_admin(p_profile_id) THEN
    RAISE EXCEPTION 'CANNOT_BAN_ADMIN';
  END IF;
  IF is_banned(p_profile_id) THEN
    RAISE EXCEPTION 'ALREADY_BANNED';
  END IF;

  INSERT INTO user_bans (profile_id, reason, banned_by)
  VALUES (p_profile_id, p_reason, auth.uid())
  RETURNING ban_id INTO v_ban_id;

  UPDATE profile_reports SET resolved_at = now(), resolved_by = auth.uid(), resolution = 'banned'
  WHERE profile_id = p_profile_id AND resolved_at IS NULL;

  INSERT INTO admin_audit_log (admin_id, action, target_type, target_id, notes)
  VALUES (auth.uid(), 'user_banned', 'profile', p_profile_id::TEXT, p_reason);

  RETURN v_ban_id;
END;
$$;

-- ── Ban appeals ──────────────────────────────────────────────────────────
-- A banned account is locked out at the Auth level (20260924000000), so by
-- the time someone reaches app/banned.tsx they typically have no valid
-- session -- app/banned.tsx signs them out on mount regardless. That means
-- appeal submission cannot be "insert as the authenticated caller" like
-- every other write in this app; it has to be keyed by the username the
-- person types in, callable while fully anonymous.

CREATE TABLE ban_appeals (
  appeal_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ban_id       UUID NOT NULL REFERENCES user_bans(ban_id) ON DELETE CASCADE,
  profile_id   UUID NOT NULL REFERENCES profiles(profile_id) ON DELETE CASCADE,
  testimony    TEXT NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at  TIMESTAMPTZ,
  reviewed_by  UUID REFERENCES profiles(profile_id),
  decision     TEXT CHECK (decision IN ('reinstated', 'denied')),
  UNIQUE (ban_id)
);

ALTER TABLE ban_appeals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ban_appeals_select_admin" ON ban_appeals
  FOR SELECT USING (is_admin(auth.uid()));
-- No INSERT/UPDATE policy, and deliberately no "select own" policy either --
-- an appellant has no session to select with. Writes only via the
-- SECURITY DEFINER functions below.

-- submit_ban_appeal: granted to `anon` as well as `authenticated` -- this is
-- the one write path in the whole app callable by a fully unauthenticated
-- caller. It can only ever attach a testimony to an *already-banned*
-- account's own open appeal (one row per ban_id, re-submitting just
-- overwrites the pending testimony rather than spamming rows, and a
-- decided appeal's WHERE clause blocks silently rather than allowing a
-- denied decision to be reopened by resubmitting). It reveals only whether
-- a username currently has an active ban, nothing else.
CREATE FUNCTION submit_ban_appeal(p_username TEXT, p_testimony TEXT) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_profile_id UUID; v_ban_id UUID;
BEGIN
  IF length(trim(p_testimony)) = 0 THEN
    RAISE EXCEPTION 'TESTIMONY_REQUIRED';
  END IF;

  SELECT profile_id INTO v_profile_id FROM profiles WHERE username = p_username;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NO_ACTIVE_BAN';
  END IF;

  SELECT ban_id INTO v_ban_id FROM user_bans
  WHERE profile_id = v_profile_id AND unbanned_at IS NULL
  ORDER BY banned_at DESC LIMIT 1;

  IF v_ban_id IS NULL THEN
    RAISE EXCEPTION 'NO_ACTIVE_BAN';
  END IF;

  INSERT INTO ban_appeals (ban_id, profile_id, testimony)
  VALUES (v_ban_id, v_profile_id, p_testimony)
  ON CONFLICT (ban_id) DO UPDATE
    SET testimony = EXCLUDED.testimony, submitted_at = now()
    WHERE ban_appeals.reviewed_at IS NULL;
END;
$$;
GRANT EXECUTE ON FUNCTION submit_ban_appeal(TEXT, TEXT) TO anon, authenticated;

CREATE FUNCTION admin_list_ban_appeals()
RETURNS TABLE(
  appeal_id UUID,
  profile_id UUID,
  username TEXT,
  ban_reason TEXT,
  banned_at TIMESTAMPTZ,
  testimony TEXT,
  submitted_at TIMESTAMPTZ
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'NOT_ADMIN';
  END IF;

  RETURN QUERY
    SELECT a.appeal_id, a.profile_id, p.username, b.reason, b.banned_at, a.testimony, a.submitted_at
    FROM ban_appeals a
    JOIN profiles p ON p.profile_id = a.profile_id
    JOIN user_bans b ON b.ban_id = a.ban_id
    WHERE a.reviewed_at IS NULL
    ORDER BY a.submitted_at ASC;
END;
$$;
GRANT EXECUTE ON FUNCTION admin_list_ban_appeals() TO authenticated;

-- admin_resolve_ban_appeal only records the decision -- reinstating a
-- session-locked account still needs the admin-ban-user Edge Function
-- (Auth-level unlock) called from the client first, same as a manual unban
-- from app/admin/users.tsx (see lib/admin/mutations.ts's resolveBanAppeal,
-- which calls the existing unbanUser() before this RPC). "Denied" needs no
-- Edge Function call at all -- the account just stays locked.
CREATE FUNCTION admin_resolve_ban_appeal(p_appeal_id UUID, p_decision TEXT) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'NOT_ADMIN';
  END IF;
  IF p_decision NOT IN ('reinstated', 'denied') THEN
    RAISE EXCEPTION 'INVALID_DECISION';
  END IF;

  UPDATE ban_appeals SET reviewed_at = now(), reviewed_by = auth.uid(), decision = p_decision
  WHERE appeal_id = p_appeal_id AND reviewed_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'APPEAL_NOT_PENDING';
  END IF;

  INSERT INTO admin_audit_log (admin_id, action, target_type, target_id, notes)
  VALUES (auth.uid(), 'ban_appeal_resolved', 'ban_appeal', p_appeal_id::TEXT, p_decision);
END;
$$;
GRANT EXECUTE ON FUNCTION admin_resolve_ban_appeal(UUID, TEXT) TO authenticated;
