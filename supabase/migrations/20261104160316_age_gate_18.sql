-- Raises the minimum age from 16 to 18 (md/media_posts.md §11, Phase 0),
-- part 1 of 2: the server-side pieces the 18+ client build calls. Safe to
-- apply before that build ships -- nothing calls these yet.
--
-- Part 2 (supabase/pending_migrations/age_gate_18_reset_confirmations.sql) re-gates
-- existing accounts and must wait until the 18+ build is live.

-- record_underage_self_report: failing the re-check deactivates the account
-- pending appeal rather than deleting it. It reuses the ban + single-appeal
-- flow wholesale -- the app/_layout.tsx isBanned redirect, app/banned.tsx's
-- appeal form, admin_list_ban_appeals (which already shows ban_reason, so
-- admins can tell 'underage' apart) and the 30-day deletion eligibility --
-- instead of inventing a parallel "deactivated" state.
--
-- banned_by is the user themselves: the column is NOT NULL and
-- admin_list_ban_history inner-joins it to profiles, so a self-reference
-- keeps that history readable ("banned by @them") without a schema change.
-- No admin_audit_log row, since no admin acted.
--
-- Idempotent: a second call while already banned is a no-op, so a retry
-- after a flaky network response never errors.
CREATE FUNCTION record_underage_self_report() RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;
  IF is_banned(auth.uid()) THEN
    RETURN;
  END IF;

  INSERT INTO user_bans (profile_id, reason, banned_by)
  VALUES (auth.uid(), 'underage', auth.uid());
END;
$$;

-- get_my_ban_reason: lets app/banned.tsx show underage-specific copy.
-- user_bans is admin-only readable, so this is SECURITY DEFINER and scoped
-- to the caller's own active ban. NULL when not banned.
CREATE FUNCTION get_my_ban_reason() RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT reason FROM user_bans
  WHERE profile_id = auth.uid() AND unbanned_at IS NULL
  ORDER BY banned_at DESC
  LIMIT 1;
$$;

-- Same signed-in-only treatment as every client RPC in
-- 20261012000000_lock_down_function_access.sql.
REVOKE EXECUTE ON FUNCTION record_underage_self_report() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION record_underage_self_report() TO authenticated;
REVOKE EXECUTE ON FUNCTION get_my_ban_reason() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_my_ban_reason() TO authenticated;
