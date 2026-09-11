-- Reverses part of Phase 3 (20260924000000_admin_bans.sql): banning no
-- longer locks the account out at the Auth level. Decision: a banned user
-- should still be able to sign in -- they're confined app-side to
-- app/banned.tsx (the isBanned gate in AuthProvider/app/_layout.tsx, which
-- already existed as a "defense in depth" backup and is now the *only*
-- enforcement mechanism) so they can actually reach the appeal form from an
-- authenticated session, instead of being rejected outright at sign-in with
-- a generic GoTrue "User is banned" error.
--
-- No schema change here -- user_bans/is_banned()/admin_ban_user/
-- admin_unban_user are unchanged; they were always the real source of
-- truth for the app-level gate. Only the client stopped calling the
-- admin-ban-user Edge Function (which set ban_duration) -- see
-- lib/admin/mutations.ts -- and that function has been deleted.
--
-- What this migration *does* change is deletion eligibility: a denied
-- appeal now restarts the 30-day countdown from the decision date, not the
-- original ban date. Without this, someone who appealed close to their
-- original 30-day mark could end up with little or no time left once the
-- appeal was actually decided. A reinstated appeal needs no special case --
-- admin_unban_user already sets unbanned_at, which the `unbanned_at IS NULL`
-- filter below already excludes.

-- CREATE OR REPLACE can't change a function's OUT-parameter row type
-- (adding eligible_since below), so this one needs an explicit drop first.
DROP FUNCTION admin_list_deletion_eligible();

CREATE FUNCTION admin_list_deletion_eligible()
RETURNS TABLE(
  profile_id UUID,
  username TEXT,
  display_name TEXT,
  ban_reason TEXT,
  banned_at TIMESTAMPTZ,
  eligible_since TIMESTAMPTZ
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'NOT_ADMIN';
  END IF;

  RETURN QUERY
    SELECT p.profile_id, p.username, p.display_name, b.reason, b.banned_at,
           COALESCE(a.reviewed_at, b.banned_at) AS eligible_since
    FROM user_bans b
    JOIN profiles p ON p.profile_id = b.profile_id
    LEFT JOIN ban_appeals a ON a.ban_id = b.ban_id
    WHERE b.unbanned_at IS NULL
      AND (a.appeal_id IS NULL OR a.reviewed_at IS NOT NULL)
      AND COALESCE(a.reviewed_at, b.banned_at) <= now() - INTERVAL '30 days'
    ORDER BY COALESCE(a.reviewed_at, b.banned_at) ASC;
END;
$$;

CREATE OR REPLACE FUNCTION admin_delete_user_data(p_profile_id UUID) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_ban_id UUID; v_eligible_since TIMESTAMPTZ; v_username TEXT;
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'NOT_ADMIN';
  END IF;

  SELECT b.ban_id, COALESCE(a.reviewed_at, b.banned_at)
    INTO v_ban_id, v_eligible_since
  FROM user_bans b
  LEFT JOIN ban_appeals a ON a.ban_id = b.ban_id
  WHERE b.profile_id = p_profile_id AND b.unbanned_at IS NULL
  ORDER BY b.banned_at DESC LIMIT 1;

  IF v_ban_id IS NULL THEN
    RAISE EXCEPTION 'NOT_BANNED';
  END IF;
  IF EXISTS (SELECT 1 FROM ban_appeals WHERE ban_id = v_ban_id AND reviewed_at IS NULL) THEN
    RAISE EXCEPTION 'APPEAL_PENDING';
  END IF;
  IF v_eligible_since > now() - INTERVAL '30 days' THEN
    RAISE EXCEPTION 'BAN_TOO_RECENT';
  END IF;

  SELECT username INTO v_username FROM profiles WHERE profile_id = p_profile_id;

  INSERT INTO admin_audit_log (admin_id, action, target_type, target_id, notes)
  VALUES (auth.uid(), 'user_data_deleted', 'profile', p_profile_id::TEXT, v_username);

  DELETE FROM profiles WHERE profile_id = p_profile_id;
END;
$$;
