-- Closes a real gap: has_appealed() only checked whether an appeal existed,
-- not whether it had been decided -- so a denied user kept seeing "an admin
-- will review it" forever, with no way to appeal again (one-shot, per
-- 20260928000000) and no indication anything had happened. Replaces it with
-- a three-state status the client can render distinctly.

DROP FUNCTION has_appealed(UUID);

CREATE FUNCTION get_ban_appeal_status(p_profile_id UUID) RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_decision TEXT;
BEGIN
  IF p_profile_id <> auth.uid() AND NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'NOT_ADMIN';
  END IF;

  SELECT a.decision INTO v_decision
  FROM ban_appeals a
  JOIN user_bans b ON b.ban_id = a.ban_id
  WHERE b.profile_id = p_profile_id AND b.unbanned_at IS NULL;

  -- No row at all -> 'none'. A row with decision still NULL -> 'pending'.
  -- 'reinstated' never surfaces here: that always sets unbanned_at, which
  -- the join's WHERE clause already excludes.
  IF NOT FOUND THEN
    RETURN 'none';
  END IF;

  RETURN COALESCE(v_decision, 'pending');
END;
$$;
GRANT EXECUTE ON FUNCTION get_ban_appeal_status(UUID) TO authenticated;
