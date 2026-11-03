-- Privacy, blocking and message reports (md/messaging_and_privacy.md,
-- Migration B). Turns is_private from a UI-only flag into an enforced one,
-- adds two-way blocking, and gives reported messages an admin queue.

-- ── Blocks ──────────────────────────────────────────────────────────────
CREATE TABLE profile_blocks (
  blocker_id UUID NOT NULL REFERENCES profiles(profile_id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES profiles(profile_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);

CREATE INDEX profile_blocks_reverse_idx ON profile_blocks (blocked_id, blocker_id);

ALTER TABLE profile_blocks ENABLE ROW LEVEL SECURITY;

-- Only blocks *I* made are visible -- a block against you is never exposed.
CREATE POLICY "profile_blocks_select_own" ON profile_blocks
  FOR SELECT TO authenticated USING (auth.uid() = blocker_id);
-- No INSERT/DELETE policy -- writes only via block_profile/unblock_profile.

-- Real bodies for the placeholders Migration A created.
CREATE OR REPLACE FUNCTION is_blocked_between(p_a UUID, p_b UUID) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM profile_blocks
    WHERE (blocker_id = p_a AND blocked_id = p_b)
       OR (blocker_id = p_b AND blocked_id = p_a)
  );
$$;

CREATE OR REPLACE FUNCTION has_blocked(p_blocker UUID, p_blocked UUID) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM profile_blocks WHERE blocker_id = p_blocker AND blocked_id = p_blocked
  );
$$;

-- ── Profile visibility ──────────────────────────────────────────────────
CREATE FUNCTION can_view_profile(p_viewer UUID, p_owner UUID) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p_viewer = p_owner
      OR is_admin(p_viewer)
      OR (
        NOT is_blocked_between(p_viewer, p_owner)
        AND (
          NOT COALESCE((SELECT is_private FROM profiles WHERE profile_id = p_owner), false)
          OR are_friends(p_viewer, p_owner)
        )
      );
$$;
GRANT EXECUTE ON FUNCTION can_view_profile(UUID, UUID) TO authenticated;

-- Replaces 20260923000000's USING (true). On its own this removes private
-- (non-friend) and blocked profiles from search, /user/[userId] and every
-- other direct profiles read; searchProfilesByUsername needs no change.
DROP POLICY "profiles_public_read" ON profiles;
CREATE POLICY "profiles_visible_read" ON profiles
  FOR SELECT TO authenticated
  USING (can_view_profile(auth.uid(), profile_id));

-- The minimal card -- name and avatar -- for places that must still show
-- who someone is even when their full profile is private: the locked
-- private-profile screen, review/photo authors, friend requests,
-- notifications and chat cards. Blocked pairs are filtered out in both
-- directions, so a block reads exactly like a deleted account.
--
-- Runs with the view owner's rights (security_invoker off), bypassing
-- profiles' and profile_blocks' RLS on purpose: the WHERE clause is the
-- access rule here. The block check is inlined rather than calling
-- is_blocked_between, because function privileges inside a view are
-- checked against the caller, and that helper isn't client-callable.
CREATE VIEW profile_cards AS
  SELECT p.profile_id, p.username, p.display_name, p.avatar_url, p.is_private
  FROM profiles p
  WHERE auth.uid() IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM profile_blocks b
      WHERE (b.blocker_id = auth.uid() AND b.blocked_id = p.profile_id)
         OR (b.blocker_id = p.profile_id AND b.blocked_id = auth.uid())
    );

REVOKE ALL ON profile_cards FROM anon, authenticated;
GRANT SELECT ON profile_cards TO authenticated;

-- Age gate and export rate limit. No date of birth is ever stored.
ALTER TABLE profiles
  ADD COLUMN age_confirmed_at TIMESTAMPTZ,
  ADD COLUMN last_export_at   TIMESTAMPTZ;

CREATE FUNCTION confirm_age() RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE profiles SET age_confirmed_at = now()
  WHERE profile_id = auth.uid() AND age_confirmed_at IS NULL;
END;
$$;
GRANT EXECUTE ON FUNCTION confirm_age() TO authenticated;

-- ── Per-profile reads respect can_view_profile ──────────────────────────
-- user_streaks, check_ins and the favourites tables are already owner-only.
DROP POLICY "clips_select" ON clips;
CREATE POLICY "clips_select" ON clips
  FOR SELECT USING (can_view_profile(auth.uid(), profile_id));

DROP POLICY "user_xp_select" ON user_xp;
CREATE POLICY "user_xp_select" ON user_xp
  FOR SELECT USING (can_view_profile(auth.uid(), profile_id));

CREATE OR REPLACE FUNCTION get_profile_visited_count(p_profile_id UUID)
RETURNS INTEGER LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN can_view_profile(auth.uid(), p_profile_id)
    THEN (SELECT COUNT(DISTINCT entity_key)::INTEGER FROM check_ins WHERE profile_id = p_profile_id)
    ELSE 0
  END;
$$;

CREATE OR REPLACE FUNCTION get_friend_count(p_profile_id UUID) RETURNS INTEGER
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN can_view_profile(auth.uid(), p_profile_id)
    THEN (
      SELECT COUNT(*)::INTEGER
      FROM friend_requests
      WHERE status = 'accepted'
        AND (requester_id = p_profile_id OR recipient_id = p_profile_id)
    )
    ELSE 0
  END;
$$;

-- No row at all for a blocked pair, so the client reads it as "none".
CREATE OR REPLACE FUNCTION get_friend_status(p_other_profile_id UUID)
RETURNS TABLE(status TEXT, request_id UUID, is_requester BOOLEAN)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF is_blocked_between(auth.uid(), p_other_profile_id) THEN
    RETURN;
  END IF;

  RETURN QUERY
    SELECT r.status, r.request_id, r.requester_id = auth.uid()
    FROM friend_requests r
    WHERE (r.requester_id = auth.uid() AND r.recipient_id = p_other_profile_id)
       OR (r.requester_id = p_other_profile_id AND r.recipient_id = auth.uid())
    ORDER BY r.created_at DESC
    LIMIT 1;
END;
$$;

-- send_friend_request (20261006000000) gains the BLOCKED check.
CREATE OR REPLACE FUNCTION send_friend_request(p_recipient_id UUID) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_request_id UUID;
  v_requester_username TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_recipient_id = auth.uid() THEN
    RAISE EXCEPTION 'CANNOT_FRIEND_SELF';
  END IF;
  IF is_blocked_between(auth.uid(), p_recipient_id) THEN
    RAISE EXCEPTION 'BLOCKED';
  END IF;

  IF EXISTS (
    SELECT 1 FROM friend_requests
    WHERE status = 'accepted'
      AND ((requester_id = auth.uid() AND recipient_id = p_recipient_id)
        OR (requester_id = p_recipient_id AND recipient_id = auth.uid()))
  ) THEN
    RAISE EXCEPTION 'ALREADY_FRIENDS';
  END IF;

  IF EXISTS (
    SELECT 1 FROM friend_requests
    WHERE status = 'pending'
      AND ((requester_id = auth.uid() AND recipient_id = p_recipient_id)
        OR (requester_id = p_recipient_id AND recipient_id = auth.uid()))
  ) THEN
    RAISE EXCEPTION 'REQUEST_ALREADY_PENDING';
  END IF;

  SELECT username INTO v_requester_username FROM profiles WHERE profile_id = auth.uid();

  INSERT INTO friend_requests (requester_id, recipient_id)
  VALUES (auth.uid(), p_recipient_id)
  ON CONFLICT (requester_id, recipient_id) DO UPDATE
    SET status = 'pending', created_at = now(), responded_at = NULL
  RETURNING request_id INTO v_request_id;

  PERFORM create_notification(
    p_recipient_id,
    'friend_request',
    v_request_id::TEXT,
    '@' || v_requester_username || ' WANTS TO BE FRIENDS',
    'info',
    'FRIEND REQUEST',
    auth.uid()
  );

  RETURN v_request_id;
END;
$$;

-- ── block_profile / unblock_profile / get_my_blocks ─────────────────────
CREATE FUNCTION block_profile(p_profile_id UUID) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_profile_id = auth.uid() THEN
    RAISE EXCEPTION 'CANNOT_BLOCK_SELF';
  END IF;

  INSERT INTO profile_blocks (blocker_id, blocked_id)
  VALUES (auth.uid(), p_profile_id)
  ON CONFLICT DO NOTHING;

  -- Same full reset as remove_friend, plus any pending request prompt in
  -- either inbox, so neither side is left with a stale Accept/Decline.
  DELETE FROM notifications n
  USING friend_requests r
  WHERE n.source = 'friend_request'
    AND n.dedup_key = r.request_id::TEXT
    AND ((r.requester_id = auth.uid() AND r.recipient_id = p_profile_id)
      OR (r.requester_id = p_profile_id AND r.recipient_id = auth.uid()));

  DELETE FROM friend_requests
  WHERE (requester_id = auth.uid() AND recipient_id = p_profile_id)
     OR (requester_id = p_profile_id AND recipient_id = auth.uid());
END;
$$;
GRANT EXECUTE ON FUNCTION block_profile(UUID) TO authenticated;

-- Doesn't restore the friendship -- either side can send a new request.
CREATE FUNCTION unblock_profile(p_profile_id UUID) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  DELETE FROM profile_blocks WHERE blocker_id = auth.uid() AND blocked_id = p_profile_id;
END;
$$;
GRANT EXECUTE ON FUNCTION unblock_profile(UUID) TO authenticated;

-- SECURITY DEFINER because a blocked profile is (by design) hidden from the
-- blocker by profiles' RLS, yet the unblock list still needs its name.
CREATE FUNCTION get_my_blocks()
RETURNS TABLE(profile_id UUID, username TEXT, display_name TEXT, avatar_url TEXT, blocked_at TIMESTAMPTZ)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.profile_id, p.username::TEXT, p.display_name::TEXT, p.avatar_url::TEXT, b.created_at
  FROM profile_blocks b
  JOIN profiles p ON p.profile_id = b.blocked_id
  WHERE b.blocker_id = auth.uid()
  ORDER BY b.created_at DESC;
$$;
GRANT EXECUTE ON FUNCTION get_my_blocks() TO authenticated;

-- ── Message reports ─────────────────────────────────────────────────────
-- Mirrors profile_reports. The message text (and a little context) is
-- copied at report time: one-sided clears and the deleted-sender cascade
-- would otherwise leave admins nothing to review. Context stores profile
-- ids only, never usernames, so account deletion leaves no copied names.
CREATE TABLE message_reports (
  report_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id       UUID REFERENCES messages(message_id) ON DELETE SET NULL,
  sender_id        UUID NOT NULL REFERENCES profiles(profile_id) ON DELETE CASCADE,
  reported_by      UUID NOT NULL REFERENCES profiles(profile_id) ON DELETE CASCADE,
  -- Nulled by the 90-day retention job once resolved; required until then.
  body_snapshot    TEXT,
  context_snapshot JSONB,
  reason           TEXT NOT NULL CHECK (reason IN ('harassment', 'spam', 'inappropriate_content', 'other')),
  details          TEXT CHECK (details IS NULL OR char_length(details) <= 500),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at      TIMESTAMPTZ,
  resolved_by      UUID REFERENCES profiles(profile_id) ON DELETE SET NULL,
  resolution       TEXT CHECK (resolution IN ('dismissed', 'message_removed', 'banned')),
  UNIQUE (message_id, reported_by),
  CHECK (body_snapshot IS NOT NULL OR resolved_at IS NOT NULL)
);

ALTER TABLE message_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "message_reports_select_own" ON message_reports
  FOR SELECT TO authenticated USING (auth.uid() = reported_by);
-- Admins read through admin_list_message_reports (which is logged), not
-- directly. No INSERT policy: writes only via report_message().

CREATE FUNCTION report_message(
  p_message_id UUID,
  p_reason     TEXT,
  p_details    TEXT DEFAULT NULL,
  p_block      BOOLEAN DEFAULT false
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_message messages;
  v_context JSONB;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_message FROM messages WHERE message_id = p_message_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'MESSAGE_NOT_FOUND';
  END IF;
  IF NOT is_conversation_member(v_message.conversation_id, auth.uid()) THEN
    RAISE EXCEPTION 'NOT_A_MEMBER';
  END IF;
  IF v_message.sender_id = auth.uid() THEN
    RAISE EXCEPTION 'CANNOT_REPORT_OWN_MESSAGE';
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'sender_id', c.sender_id, 'body', c.body, 'created_at', c.created_at
         ) ORDER BY c.created_at), '[]'::JSONB)
    INTO v_context
  FROM (
    SELECT sender_id, body, created_at FROM messages
    WHERE conversation_id = v_message.conversation_id AND created_at < v_message.created_at
    ORDER BY created_at DESC
    LIMIT 5
  ) c;

  INSERT INTO message_reports (message_id, sender_id, reported_by, body_snapshot, context_snapshot, reason, details)
  VALUES (p_message_id, v_message.sender_id, auth.uid(), v_message.body, v_context, p_reason,
          NULLIF(btrim(COALESCE(p_details, '')), ''))
  ON CONFLICT (message_id, reported_by) DO NOTHING;

  IF p_block THEN
    PERFORM block_profile(v_message.sender_id);
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION report_message(UUID, TEXT, TEXT, BOOLEAN) TO authenticated;

-- ── Admin queue ─────────────────────────────────────────────────────────
-- One row per report (each is about a single message). The snapshot is
-- deliberately left out here -- admin_open_message_report returns it and
-- logs the access, so every admin read of message content is audited.
CREATE FUNCTION admin_list_message_reports()
RETURNS TABLE(
  report_id       UUID,
  message_id      UUID,
  sender_id       UUID,
  sender_username TEXT,
  sender_banned   BOOLEAN,
  reason          TEXT,
  details         TEXT,
  created_at      TIMESTAMPTZ
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'NOT_ADMIN';
  END IF;

  RETURN QUERY
    SELECT r.report_id, r.message_id, r.sender_id, p.username::TEXT, is_banned(r.sender_id),
           r.reason, r.details, r.created_at
    FROM message_reports r
    JOIN profiles p ON p.profile_id = r.sender_id
    WHERE r.resolved_at IS NULL
    ORDER BY r.created_at ASC;
END;
$$;
GRANT EXECUTE ON FUNCTION admin_list_message_reports() TO authenticated;

-- Records an admin opening a report, and returns what they're allowed to
-- see: the reported message and its earlier context, from the copies.
CREATE FUNCTION admin_log_message_report_view(p_report_id UUID)
RETURNS TABLE(body_snapshot TEXT, context_snapshot JSONB)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'NOT_ADMIN';
  END IF;

  INSERT INTO admin_audit_log (admin_id, action, target_type, target_id)
  VALUES (auth.uid(), 'message_report_viewed', 'message_report', p_report_id::TEXT);

  RETURN QUERY
    SELECT r.body_snapshot, r.context_snapshot FROM message_reports r WHERE r.report_id = p_report_id;
END;
$$;
GRANT EXECUTE ON FUNCTION admin_log_message_report_view(UUID) TO authenticated;

CREATE FUNCTION admin_dismiss_message_report(p_report_id UUID) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'NOT_ADMIN';
  END IF;

  UPDATE message_reports SET resolved_at = now(), resolved_by = auth.uid(), resolution = 'dismissed'
  WHERE report_id = p_report_id AND resolved_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'REPORT_NOT_PENDING';
  END IF;

  INSERT INTO admin_audit_log (admin_id, action, target_type, target_id, notes)
  VALUES (auth.uid(), 'report_resolved', 'message_report', p_report_id::TEXT, 'dismissed');
END;
$$;
GRANT EXECUTE ON FUNCTION admin_dismiss_message_report(UUID) TO authenticated;

-- Deletes the message for everyone, resolving every open report on it.
-- Reports are resolved first: message_id is ON DELETE SET NULL, so they
-- can't be found by it afterwards.
CREATE FUNCTION admin_remove_message(p_message_id UUID) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'NOT_ADMIN';
  END IF;

  UPDATE message_reports SET resolved_at = now(), resolved_by = auth.uid(), resolution = 'message_removed'
  WHERE message_id = p_message_id AND resolved_at IS NULL;

  DELETE FROM messages WHERE message_id = p_message_id;

  INSERT INTO admin_audit_log (admin_id, action, target_type, target_id)
  VALUES (auth.uid(), 'message_removed', 'message', p_message_id::TEXT);
END;
$$;
GRANT EXECUTE ON FUNCTION admin_remove_message(UUID) TO authenticated;

-- admin_ban_user (20260925000000) also closes open message reports against
-- the banned sender, same side-effect shape as its profile_reports update.
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

  UPDATE message_reports SET resolved_at = now(), resolved_by = auth.uid(), resolution = 'banned'
  WHERE sender_id = p_profile_id AND resolved_at IS NULL;

  INSERT INTO admin_audit_log (admin_id, action, target_type, target_id, notes)
  VALUES (auth.uid(), 'user_banned', 'profile', p_profile_id::TEXT, p_reason);

  RETURN v_ban_id;
END;
$$;

-- ── Retention: report copies kept 90 days after resolution ──────────────
-- Only the outcome (reason, resolution, timestamps) survives.
CREATE FUNCTION purge_resolved_message_report_snapshots() RETURNS VOID
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE message_reports
  SET body_snapshot = NULL, context_snapshot = NULL, details = NULL
  WHERE resolved_at < now() - INTERVAL '90 days'
    AND (body_snapshot IS NOT NULL OR context_snapshot IS NOT NULL OR details IS NOT NULL);
$$;
REVOKE EXECUTE ON FUNCTION purge_resolved_message_report_snapshots() FROM PUBLIC, anon, authenticated;

-- First use of pg_cron in this project (see 20260926000000's note that it
-- wasn't enabled then).
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'purge-message-report-snapshots',
  '17 3 * * *',
  'SELECT public.purge_resolved_message_report_snapshots()'
);
