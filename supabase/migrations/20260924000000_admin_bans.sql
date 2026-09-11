-- Admin panel, Phase 3 (ADMIN_PANEL_PLAN.md): user bans. Permanent only, no
-- auto-expiry (explicit decision, not a v1 gap) -- unbanning is always a
-- manual admin action.
--
-- RPCs here only handle the ledger + audit trail; they cannot themselves
-- revoke a session or block sign-in (that needs the Auth Admin API, which
-- requires the service-role key and must never run inside Postgres/RLS).
-- The actual lock is applied by the admin-ban-user Edge Function, which the
-- client calls alongside these RPCs -- see lib/admin/mutations.ts.

-- Ban ledger -- append-only history, same philosophy as xp_events/check_ins,
-- so a user's ban history survives an unban rather than being overwritten.
CREATE TABLE user_bans (
  ban_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  UUID NOT NULL REFERENCES profiles(profile_id) ON DELETE CASCADE,
  reason      TEXT NOT NULL,
  banned_by   UUID NOT NULL REFERENCES profiles(profile_id),
  banned_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  unbanned_at TIMESTAMPTZ,
  unbanned_by UUID REFERENCES profiles(profile_id)
);
-- "Currently banned" = the latest row for a profile has unbanned_at IS NULL.

ALTER TABLE user_bans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_bans_select_admin" ON user_bans
  FOR SELECT USING (is_admin(auth.uid()));
-- No INSERT/UPDATE policy -- written only via the RPCs below.

-- is_banned: SECURITY DEFINER (unlike is_admin()/has_manual_checkin(), which
-- can stay plain STABLE SQL because profiles is broadly readable) because
-- user_bans is admin-only readable -- a plain STABLE function would have its
-- internal SELECT blocked by RLS for a non-admin caller checking their own
-- ban status, always returning false. Gated to "self or admin" so it's safe
-- to expose to any authenticated client (the app's own launch-time ban
-- check) without leaking other users' ban status.
CREATE FUNCTION is_banned(p_profile_id UUID) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_profile_id <> auth.uid() AND NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'NOT_ADMIN';
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM user_bans WHERE profile_id = p_profile_id AND unbanned_at IS NULL
  );
END;
$$;
GRANT EXECUTE ON FUNCTION is_banned(UUID) TO authenticated;

-- admin_ban_user / admin_unban_user: ledger + audit trail only. The client
-- calls the admin-ban-user Edge Function first (the actual Auth-level lock),
-- then these RPCs to record it -- that order means a failed Edge Function
-- call leaves nothing half-recorded and is safely retryable, while a
-- (much less likely) failure here after the lock already succeeded just
-- needs the same retry, which is idempotent since is_banned() still reads
-- false until the ledger row lands.
CREATE FUNCTION admin_ban_user(p_profile_id UUID, p_reason TEXT) RETURNS UUID
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

  INSERT INTO admin_audit_log (admin_id, action, target_type, target_id, notes)
  VALUES (auth.uid(), 'user_banned', 'profile', p_profile_id::TEXT, p_reason);

  RETURN v_ban_id;
END;
$$;
GRANT EXECUTE ON FUNCTION admin_ban_user(UUID, TEXT) TO authenticated;

CREATE FUNCTION admin_unban_user(p_profile_id UUID) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'NOT_ADMIN';
  END IF;
  IF NOT is_banned(p_profile_id) THEN
    RAISE EXCEPTION 'NOT_BANNED';
  END IF;

  UPDATE user_bans SET unbanned_at = now(), unbanned_by = auth.uid()
  WHERE profile_id = p_profile_id AND unbanned_at IS NULL;

  INSERT INTO admin_audit_log (admin_id, action, target_type, target_id)
  VALUES (auth.uid(), 'user_unbanned', 'profile', p_profile_id::TEXT);
END;
$$;
GRANT EXECUTE ON FUNCTION admin_unban_user(UUID) TO authenticated;

-- admin_search_profiles: finds a user by username prefix to ban/view history.
CREATE FUNCTION admin_search_profiles(p_query TEXT)
RETURNS TABLE(
  profile_id UUID, username TEXT, display_name TEXT, is_admin BOOLEAN, is_banned BOOLEAN
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'NOT_ADMIN';
  END IF;

  RETURN QUERY
    SELECT p.profile_id, p.username, p.display_name, p.is_admin, is_banned(p.profile_id)
    FROM profiles p
    WHERE p.username ILIKE p_query || '%'
    ORDER BY p.username ASC
    LIMIT 20;
END;
$$;
GRANT EXECUTE ON FUNCTION admin_search_profiles(TEXT) TO authenticated;

-- admin_list_ban_history: a user's full ban ledger, most recent first.
CREATE FUNCTION admin_list_ban_history(p_profile_id UUID)
RETURNS TABLE(
  ban_id UUID,
  reason TEXT,
  banned_by_username TEXT,
  banned_at TIMESTAMPTZ,
  unbanned_at TIMESTAMPTZ,
  unbanned_by_username TEXT
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'NOT_ADMIN';
  END IF;

  RETURN QUERY
    SELECT b.ban_id, b.reason, bp.username, b.banned_at, b.unbanned_at, up.username
    FROM user_bans b
    JOIN profiles bp ON bp.profile_id = b.banned_by
    LEFT JOIN profiles up ON up.profile_id = b.unbanned_by
    WHERE b.profile_id = p_profile_id
    ORDER BY b.banned_at DESC;
END;
$$;
GRANT EXECUTE ON FUNCTION admin_list_ban_history(UUID) TO authenticated;
