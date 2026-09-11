-- Fixes a real gap: submit_ban_appeal's ON CONFLICT (ban_id) DO UPDATE meant
-- a banned user could resubmit indefinitely before a decision landed (each
-- resubmission just overwrote the pending testimony) -- reported after
-- testing showed signing out and back in let the appeal form reappear and
-- accept another submission. One appeal per ban, period: the first
-- submission is the only one that's ever accepted.

CREATE OR REPLACE FUNCTION submit_ban_appeal(p_username TEXT, p_testimony TEXT) RETURNS VOID
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

  IF EXISTS (SELECT 1 FROM ban_appeals WHERE ban_id = v_ban_id) THEN
    RAISE EXCEPTION 'ALREADY_APPEALED';
  END IF;

  INSERT INTO ban_appeals (ban_id, profile_id, testimony) VALUES (v_ban_id, v_profile_id, p_testimony);
END;
$$;

-- has_appealed: lets a still-banned, signed-in user (the normal case now
-- that bans don't lock out sign-in) check on load whether they've already
-- appealed, so app/banned.tsx can show the "submitted" state immediately
-- instead of re-showing the form every time they sign back in. Same
-- self-or-admin shape as is_banned() -- ban_appeals is admin-only readable,
-- so this has to be SECURITY DEFINER with an explicit authorization check
-- rather than relying on RLS.
CREATE FUNCTION has_appealed(p_profile_id UUID) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_profile_id <> auth.uid() AND NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'NOT_ADMIN';
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM ban_appeals a
    JOIN user_bans b ON b.ban_id = a.ban_id
    WHERE b.profile_id = p_profile_id AND b.unbanned_at IS NULL
  );
END;
$$;
GRANT EXECUTE ON FUNCTION has_appealed(UUID) TO authenticated;
