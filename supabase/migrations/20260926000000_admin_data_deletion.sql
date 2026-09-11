-- Admin panel, Phase 5: 30-day post-ban data deletion. Admin-triggered, not
-- automatic -- the project has no pg_cron/pg_net extensions enabled, and
-- this is real, unattended-if-automatic, irreversible deletion, so a human
-- clicks the button (decision recorded in ADMIN_PANEL_PLAN.md).

-- admin_list_deletion_eligible: a profile qualifies once its current ban is
-- 30+ days old *and* has no unreviewed appeal outstanding -- an appeal must
-- be resolved (reinstated or denied) one way or the other before deletion
-- becomes available, so an admin can never erase someone mid-appeal.
CREATE FUNCTION admin_list_deletion_eligible()
RETURNS TABLE(
  profile_id UUID,
  username TEXT,
  display_name TEXT,
  ban_reason TEXT,
  banned_at TIMESTAMPTZ
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'NOT_ADMIN';
  END IF;

  RETURN QUERY
    SELECT p.profile_id, p.username, p.display_name, b.reason, b.banned_at
    FROM user_bans b
    JOIN profiles p ON p.profile_id = b.profile_id
    WHERE b.unbanned_at IS NULL
      AND b.banned_at <= now() - INTERVAL '30 days'
      AND NOT EXISTS (
        SELECT 1 FROM ban_appeals a WHERE a.ban_id = b.ban_id AND a.reviewed_at IS NULL
      )
    ORDER BY b.banned_at ASC;
END;
$$;
GRANT EXECUTE ON FUNCTION admin_list_deletion_eligible() TO authenticated;

-- admin_delete_user_data: deletes the profiles row, which cascades through
-- nearly every table that references profile_id -- reviews, photos,
-- check-ins, xp, streaks, votes, user_bans, ban_appeals, etc (confirmed via
-- an information_schema audit before writing this). Re-checks eligibility
-- server-side rather than trusting the list the client already showed, same
-- "never trust a client-sent flag" posture as every other admin RPC.
--
-- Deliberately does *not* delete the Auth account itself -- that needs the
-- service role (see the admin-delete-user Edge Function this pairs with in
-- lib/admin/mutations.ts, called by the client right after this succeeds).
-- This DB deletion runs first, unlike the ban flow's Edge-Function-first
-- order: here the DB step is the one we have full transactional control
-- over, so a failure here leaves nothing external touched and is trivially
-- retryable, while a failure in the Edge Function *after* this succeeds
-- just strands an orphaned Auth credential with no profile behind it --
-- inert, since the app treats "no profile row" as logged-out-equivalent
-- (see AuthProvider's fetchProfile) -- and safe to retry independently.
CREATE FUNCTION admin_delete_user_data(p_profile_id UUID) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_ban_id UUID; v_banned_at TIMESTAMPTZ; v_username TEXT;
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'NOT_ADMIN';
  END IF;

  SELECT ban_id, banned_at INTO v_ban_id, v_banned_at
  FROM user_bans WHERE profile_id = p_profile_id AND unbanned_at IS NULL
  ORDER BY banned_at DESC LIMIT 1;

  IF v_ban_id IS NULL THEN
    RAISE EXCEPTION 'NOT_BANNED';
  END IF;
  IF v_banned_at > now() - INTERVAL '30 days' THEN
    RAISE EXCEPTION 'BAN_TOO_RECENT';
  END IF;
  IF EXISTS (SELECT 1 FROM ban_appeals WHERE ban_id = v_ban_id AND reviewed_at IS NULL) THEN
    RAISE EXCEPTION 'APPEAL_PENDING';
  END IF;

  SELECT username INTO v_username FROM profiles WHERE profile_id = p_profile_id;

  -- Written before the delete so the audit trail keeps the username --
  -- target_id is plain TEXT (no FK), so this row survives the cascade below.
  INSERT INTO admin_audit_log (admin_id, action, target_type, target_id, notes)
  VALUES (auth.uid(), 'user_data_deleted', 'profile', p_profile_id::TEXT, v_username);

  DELETE FROM profiles WHERE profile_id = p_profile_id;
END;
$$;
GRANT EXECUTE ON FUNCTION admin_delete_user_data(UUID) TO authenticated;
