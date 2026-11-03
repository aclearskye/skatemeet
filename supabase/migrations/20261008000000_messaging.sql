-- Friend-to-friend messaging (md/messaging_and_privacy.md, Migration A).
--
-- Chat tables deliberately don't reference friend_requests: unfriending
-- (remove_friend deletes the row) leaves every conversation untouched, and
-- send_message simply refuses with NOT_FRIENDS until the pair re-friends.
--
-- All one-sided state (read position, clear, delete) lives on the caller's
-- own conversation_members row, so user A clearing or deleting a chat never
-- touches user B's copy. Writes only via the SECURITY DEFINER RPCs below --
-- no client INSERT/UPDATE/DELETE policy on any of these tables.

CREATE TABLE conversations (
  conversation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_message_at TIMESTAMPTZ
);

CREATE TABLE conversation_members (
  conversation_id UUID NOT NULL REFERENCES conversations(conversation_id) ON DELETE CASCADE,
  -- Deactivating an account removes only *their* member row; the other
  -- side keeps the conversation (and their own messages) until they clear
  -- or delete it.
  profile_id      UUID NOT NULL REFERENCES profiles(profile_id) ON DELETE CASCADE,
  last_read_at    TIMESTAMPTZ,
  -- Clear: messages created at or before this are hidden for this member.
  cleared_at      TIMESTAMPTZ,
  -- Delete: card hidden until a newer message arrives (send_message resets it).
  hidden_at       TIMESTAMPTZ,
  PRIMARY KEY (conversation_id, profile_id)
);

CREATE INDEX conversation_members_profile_idx ON conversation_members (profile_id);

CREATE TABLE messages (
  message_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(conversation_id) ON DELETE CASCADE,
  -- A deactivated user's messages vanish with their account.
  sender_id       UUID NOT NULL REFERENCES profiles(profile_id) ON DELETE CASCADE,
  -- Widen this CHECK (and populate payload) for spot-share messages later.
  kind            TEXT NOT NULL DEFAULT 'text' CHECK (kind IN ('text')),
  body            TEXT,
  payload         JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (kind <> 'text' OR (body IS NOT NULL AND char_length(body) BETWEEN 1 AND 2000))
);

CREATE INDEX messages_conversation_created_idx ON messages (conversation_id, created_at DESC);

-- ── Helpers ─────────────────────────────────────────────────────────────

-- Friendship is undirected once accepted -- either row ordering counts.
CREATE FUNCTION are_friends(p_a UUID, p_b UUID) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM friend_requests
    WHERE status = 'accepted'
      AND ((requester_id = p_a AND recipient_id = p_b)
        OR (requester_id = p_b AND recipient_id = p_a))
  );
$$;

-- Placeholders so this migration is testable on its own. Migration B
-- (20261009000000) replaces both with real bodies once profile_blocks exists.
CREATE FUNCTION is_blocked_between(p_a UUID, p_b UUID) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT false;
$$;

CREATE FUNCTION has_blocked(p_blocker UUID, p_blocked UUID) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT false;
$$;

-- SECURITY DEFINER so the policies below can check membership without
-- recursing through conversation_members' own RLS.
CREATE FUNCTION is_conversation_member(p_conversation_id UUID, p_profile_id UUID) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM conversation_members
    WHERE conversation_id = p_conversation_id AND profile_id = p_profile_id
  );
$$;

-- Callable only from other SECURITY DEFINER functions -- a client probing
-- arbitrary pairs could
-- otherwise learn who is friends with whom, or that someone blocked them.
-- CREATE OR REPLACE in Migration B keeps these revocations.
REVOKE EXECUTE ON FUNCTION are_friends(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION is_blocked_between(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION has_blocked(UUID, UUID) FROM PUBLIC, anon, authenticated;

-- The caller's visibility floor for a conversation: '-infinity' when they've
-- never cleared it, their cleared_at when they have, NULL when they aren't a
-- member at all (so `created_at > NULL` hides everything).
CREATE FUNCTION conversation_visible_since(p_conversation_id UUID) RETURNS TIMESTAMPTZ
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(cleared_at, '-infinity'::TIMESTAMPTZ)
  FROM conversation_members
  WHERE conversation_id = p_conversation_id AND profile_id = auth.uid();
$$;

-- ── RLS ─────────────────────────────────────────────────────────────────

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conversations_select_member" ON conversations
  FOR SELECT TO authenticated
  USING (is_conversation_member(conversation_id, auth.uid()));

-- Members can see each other's rows, but only the columns granted below:
-- the other side's last_read_at drives read receipts (and arrives live over
-- realtime), while cleared_at/hidden_at stay unreadable to everyone, so one
-- user can never tell that the other cleared or deleted the chat. The
-- caller's own one-sided state reaches the client through get_my_chats.
CREATE POLICY "conversation_members_select_co_member" ON conversation_members
  FOR SELECT TO authenticated
  USING (is_conversation_member(conversation_id, auth.uid()));

REVOKE ALL ON conversation_members FROM anon, authenticated;
GRANT SELECT (conversation_id, profile_id, last_read_at) ON conversation_members TO authenticated;

REVOKE INSERT, UPDATE, DELETE ON conversations, messages FROM anon, authenticated;

CREATE POLICY "messages_select_visible" ON messages
  FOR SELECT TO authenticated
  USING (created_at > conversation_visible_since(conversation_id));

-- ── Storage-limitation cleanup ──────────────────────────────────────────
-- Physically deletes messages that every remaining member has cleared past
-- -- nobody can see them any more, so they aren't kept.
CREATE FUNCTION _purge_invisible_messages(p_conversation_id UUID) RETURNS VOID
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  DELETE FROM messages m
  WHERE m.conversation_id = p_conversation_id
    AND NOT EXISTS (
      SELECT 1 FROM conversation_members cm
      WHERE cm.conversation_id = p_conversation_id
        AND m.created_at > COALESCE(cm.cleared_at, '-infinity'::TIMESTAMPTZ)
    );
$$;

-- A member row disappears when its account is deleted (cascade). The
-- conversation goes once nobody is left in it; otherwise anything only the
-- departed member could still see is purged.
CREATE FUNCTION _on_conversation_member_removed() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM conversation_members WHERE conversation_id = OLD.conversation_id) THEN
    DELETE FROM conversations WHERE conversation_id = OLD.conversation_id;
  ELSE
    PERFORM _purge_invisible_messages(OLD.conversation_id);
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER after_conversation_member_delete
  AFTER DELETE ON conversation_members
  FOR EACH ROW EXECUTE FUNCTION _on_conversation_member_removed();

-- ── open_conversation: get-or-create ────────────────────────────────────
CREATE FUNCTION open_conversation(p_other_profile_id UUID) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_conversation_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_other_profile_id = auth.uid() THEN
    RAISE EXCEPTION 'CANNOT_MESSAGE_SELF';
  END IF;
  IF is_blocked_between(auth.uid(), p_other_profile_id) THEN
    RAISE EXCEPTION 'BLOCKED';
  END IF;
  IF NOT are_friends(auth.uid(), p_other_profile_id) THEN
    RAISE EXCEPTION 'NOT_FRIENDS';
  END IF;

  -- Serializes concurrent opens for the same pair, so two taps (or both
  -- users at once) can't create two conversations.
  PERFORM pg_advisory_xact_lock(
    hashtext(LEAST(auth.uid(), p_other_profile_id)::TEXT || GREATEST(auth.uid(), p_other_profile_id)::TEXT)
  );

  SELECT a.conversation_id INTO v_conversation_id
  FROM conversation_members a
  JOIN conversation_members b ON b.conversation_id = a.conversation_id
  WHERE a.profile_id = auth.uid() AND b.profile_id = p_other_profile_id
  LIMIT 1;

  IF v_conversation_id IS NOT NULL THEN
    RETURN v_conversation_id;
  END IF;

  INSERT INTO conversations DEFAULT VALUES RETURNING conversation_id INTO v_conversation_id;
  INSERT INTO conversation_members (conversation_id, profile_id)
  VALUES (v_conversation_id, auth.uid()), (v_conversation_id, p_other_profile_id);

  RETURN v_conversation_id;
END;
$$;
GRANT EXECUTE ON FUNCTION open_conversation(UUID) TO authenticated;

-- ── send_message ────────────────────────────────────────────────────────
CREATE FUNCTION send_message(p_conversation_id UUID, p_body TEXT) RETURNS messages
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_other_id UUID;
  v_body TEXT := btrim(COALESCE(p_body, ''));
  v_message messages;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT is_conversation_member(p_conversation_id, auth.uid()) THEN
    RAISE EXCEPTION 'NOT_A_MEMBER';
  END IF;
  IF char_length(v_body) = 0 THEN
    RAISE EXCEPTION 'EMPTY_MESSAGE';
  END IF;
  IF char_length(v_body) > 2000 THEN
    RAISE EXCEPTION 'MESSAGE_TOO_LONG';
  END IF;
  IF is_banned(auth.uid()) THEN
    RAISE EXCEPTION 'BANNED';
  END IF;

  SELECT profile_id INTO v_other_id
  FROM conversation_members
  WHERE conversation_id = p_conversation_id AND profile_id <> auth.uid();

  IF v_other_id IS NULL THEN
    RAISE EXCEPTION 'PARTICIPANT_GONE';
  END IF;
  IF is_blocked_between(auth.uid(), v_other_id) THEN
    RAISE EXCEPTION 'BLOCKED';
  END IF;
  IF NOT are_friends(auth.uid(), v_other_id) THEN
    RAISE EXCEPTION 'NOT_FRIENDS';
  END IF;

  -- clock_timestamp(), not now(): a clear committed while this transaction
  -- was open must not hide a message sent after it.
  INSERT INTO messages (conversation_id, sender_id, kind, body, created_at)
  VALUES (p_conversation_id, auth.uid(), 'text', v_body, clock_timestamp())
  RETURNING * INTO v_message;

  UPDATE conversations SET last_message_at = v_message.created_at
  WHERE conversation_id = p_conversation_id;

  -- A new message brings a deleted chat back for both sides, and counts as
  -- the sender having read everything up to it.
  UPDATE conversation_members SET hidden_at = NULL
  WHERE conversation_id = p_conversation_id;
  UPDATE conversation_members SET last_read_at = v_message.created_at
  WHERE conversation_id = p_conversation_id AND profile_id = auth.uid();

  RETURN v_message;
END;
$$;
GRANT EXECUTE ON FUNCTION send_message(UUID, TEXT) TO authenticated;

-- ── mark_conversation_read ──────────────────────────────────────────────
CREATE FUNCTION mark_conversation_read(p_conversation_id UUID) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE conversation_members SET last_read_at = clock_timestamp()
  WHERE conversation_id = p_conversation_id AND profile_id = auth.uid();
END;
$$;
GRANT EXECUTE ON FUNCTION mark_conversation_read(UUID) TO authenticated;

-- ── clear_conversation / delete_conversation (one-sided) ───────────────
CREATE FUNCTION clear_conversation(p_conversation_id UUID) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE conversation_members SET cleared_at = clock_timestamp()
  WHERE conversation_id = p_conversation_id AND profile_id = auth.uid();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_A_MEMBER';
  END IF;

  PERFORM _purge_invisible_messages(p_conversation_id);
END;
$$;
GRANT EXECUTE ON FUNCTION clear_conversation(UUID) TO authenticated;

CREATE FUNCTION delete_conversation(p_conversation_id UUID) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_now TIMESTAMPTZ := clock_timestamp();
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE conversation_members SET cleared_at = v_now, hidden_at = v_now
  WHERE conversation_id = p_conversation_id AND profile_id = auth.uid();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_A_MEMBER';
  END IF;

  PERFORM _purge_invisible_messages(p_conversation_id);
END;
$$;
GRANT EXECUTE ON FUNCTION delete_conversation(UUID) TO authenticated;

-- ── get_my_chats ────────────────────────────────────────────────────────
-- Every visible conversation, plus each friend the caller has never had a
-- conversation with as a "Say hi" entry (conversation_id NULL). A cleared or
-- deleted conversation still has its row, so it never reverts to "Say hi".
--
-- other_state:
--   'active'        -- show the other skater normally
--   'blocked_by_me' -- caller blocked them: name shown, "Unblock" offered
--   'unavailable'   -- they deleted their account, or blocked the caller.
--                      Deliberately indistinguishable, so a block is never
--                      revealed; no name or avatar is returned.
--
-- p_conversation_id narrows to one conversation (the thread header), and
-- ignores hidden_at so a deleted chat can still be reopened from a profile.
CREATE FUNCTION get_my_chats(p_conversation_id UUID DEFAULT NULL)
RETURNS TABLE(
  conversation_id     UUID,
  other_profile_id    UUID,
  other_username      TEXT,
  other_display_name  TEXT,
  other_avatar_url    TEXT,
  other_state         TEXT,
  other_last_read_at  TIMESTAMPTZ,
  last_message_id     UUID,
  last_message_body   TEXT,
  last_message_sender UUID,
  last_message_at     TIMESTAMPTZ,
  unread_count        INTEGER,
  can_message         BOOLEAN,
  sort_at             TIMESTAMPTZ
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
#variable_conflict use_column
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
    WITH mine AS (
      SELECT cm.conversation_id, cm.last_read_at,
             COALESCE(cm.cleared_at, '-infinity'::TIMESTAMPTZ) AS visible_since,
             c.created_at
      FROM conversation_members cm
      JOIN conversations c ON c.conversation_id = cm.conversation_id
      WHERE cm.profile_id = auth.uid()
        AND (p_conversation_id IS NULL OR cm.conversation_id = p_conversation_id)
        AND (p_conversation_id IS NOT NULL OR cm.hidden_at IS NULL)
    ),
    chats AS (
      SELECT
        mine.conversation_id,
        other.profile_id AS other_id,
        other.last_read_at AS other_last_read_at,
        CASE
          WHEN other.profile_id IS NULL THEN 'unavailable'
          WHEN has_blocked(other.profile_id, auth.uid()) THEN 'unavailable'
          WHEN has_blocked(auth.uid(), other.profile_id) THEN 'blocked_by_me'
          ELSE 'active'
        END AS state,
        last_msg.message_id, last_msg.body, last_msg.sender_id, last_msg.created_at AS msg_at,
        (
          SELECT COUNT(*)::INTEGER FROM messages m
          WHERE m.conversation_id = mine.conversation_id
            AND m.sender_id <> auth.uid()
            AND m.created_at > mine.visible_since
            AND m.created_at > COALESCE(mine.last_read_at, '-infinity'::TIMESTAMPTZ)
        ) AS unread,
        mine.created_at
      FROM mine
      LEFT JOIN conversation_members other
        ON other.conversation_id = mine.conversation_id AND other.profile_id <> auth.uid()
      LEFT JOIN LATERAL (
        SELECT m.message_id, m.body, m.sender_id, m.created_at
        FROM messages m
        WHERE m.conversation_id = mine.conversation_id AND m.created_at > mine.visible_since
        ORDER BY m.created_at DESC
        LIMIT 1
      ) last_msg ON true
    )
    SELECT
      chats.conversation_id,
      CASE WHEN chats.state = 'unavailable' THEN NULL ELSE chats.other_id END,
      CASE WHEN chats.state = 'unavailable' THEN NULL ELSE p.username::TEXT END,
      CASE WHEN chats.state = 'unavailable' THEN NULL ELSE p.display_name::TEXT END,
      CASE WHEN chats.state = 'unavailable' THEN NULL ELSE p.avatar_url::TEXT END,
      chats.state::TEXT,
      CASE WHEN chats.state = 'unavailable' THEN NULL ELSE chats.other_last_read_at END,
      chats.message_id,
      chats.body,
      chats.sender_id,
      chats.msg_at,
      chats.unread,
      chats.state = 'active' AND are_friends(auth.uid(), chats.other_id),
      COALESCE(chats.msg_at, chats.created_at)
    FROM chats
    LEFT JOIN profiles p ON p.profile_id = chats.other_id

    UNION ALL

    SELECT
      NULL::UUID, f.profile_id, f.username::TEXT, f.display_name::TEXT, f.avatar_url::TEXT,
      'active'::TEXT, NULL::TIMESTAMPTZ, NULL::UUID, NULL::TEXT, NULL::UUID, NULL::TIMESTAMPTZ,
      0, true, NULL::TIMESTAMPTZ
    FROM friend_requests r
    JOIN profiles f
      ON f.profile_id = CASE WHEN r.requester_id = auth.uid() THEN r.recipient_id ELSE r.requester_id END
    WHERE p_conversation_id IS NULL
      AND r.status = 'accepted'
      AND (r.requester_id = auth.uid() OR r.recipient_id = auth.uid())
      AND NOT is_blocked_between(auth.uid(), f.profile_id)
      AND NOT EXISTS (
        SELECT 1 FROM conversation_members a
        JOIN conversation_members b ON b.conversation_id = a.conversation_id
        WHERE a.profile_id = auth.uid() AND b.profile_id = f.profile_id
      )

    ORDER BY 14 DESC NULLS LAST, 3 ASC;
END;
$$;
GRANT EXECUTE ON FUNCTION get_my_chats(UUID) TO authenticated;

-- ── get_unread_chat_count: drawer badge ─────────────────────────────────
CREATE FUNCTION get_unread_chat_count() RETURNS INTEGER
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COUNT(*)::INTEGER
  FROM conversation_members cm
  JOIN messages m ON m.conversation_id = cm.conversation_id
  WHERE cm.profile_id = auth.uid()
    AND cm.hidden_at IS NULL
    AND m.sender_id <> auth.uid()
    AND m.created_at > COALESCE(cm.cleared_at, '-infinity'::TIMESTAMPTZ)
    AND m.created_at > COALESCE(cm.last_read_at, '-infinity'::TIMESTAMPTZ);
$$;
GRANT EXECUTE ON FUNCTION get_unread_chat_count() TO authenticated;

-- ── Realtime ────────────────────────────────────────────────────────────
-- postgres_changes applies each subscriber's RLS (and column grants), so a
-- client only receives messages it could SELECT. profiles is never added.
ALTER PUBLICATION supabase_realtime ADD TABLE messages, conversation_members;
