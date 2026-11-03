-- ── 1. send_message: at most 30 messages a minute per sender ────────────
-- Same body as 20261008000000 plus the RATE_LIMITED check. Counted across
-- every conversation, so splitting a flood over several chats doesn't get
-- around it. Uses messages_sender_idx (20261011000000).
CREATE OR REPLACE FUNCTION send_message(p_conversation_id UUID, p_body TEXT) RETURNS messages
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
  IF (
    SELECT COUNT(*) FROM messages
    WHERE sender_id = auth.uid() AND created_at > clock_timestamp() - INTERVAL '1 minute'
  ) >= 30 THEN
    RAISE EXCEPTION 'RATE_LIMITED';
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

  UPDATE conversation_members SET hidden_at = NULL
  WHERE conversation_id = p_conversation_id;
  UPDATE conversation_members SET last_read_at = v_message.created_at
  WHERE conversation_id = p_conversation_id AND profile_id = auth.uid();

  RETURN v_message;
END;
$$;

-- ── 2. Friend requests on realtime ──────────────────────────────────────
-- So an accepted request puts the new friend's "Say Hi" card in the
-- requester's chat list straight away. postgres_changes applies
-- friend_requests_select_participant, so only the two people involved
-- receive the event.
ALTER PUBLICATION supabase_realtime ADD TABLE friend_requests;

-- ── 3. Friends can see each other's streaks ─────────────────────────────
-- Was owner-only (20260915000000), so FriendCard's streak badge never
-- showed. Friends only -- not everyone who can see the profile.
CREATE FUNCTION is_my_friend(p_profile_id UUID) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT are_friends(auth.uid(), p_profile_id);
$$;
REVOKE EXECUTE ON FUNCTION is_my_friend(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION is_my_friend(UUID) TO authenticated;

DROP POLICY "user_streaks_select_own" ON user_streaks;
CREATE POLICY "user_streaks_select_own_or_friend" ON user_streaks
  FOR SELECT TO authenticated
  USING (profile_id = (SELECT auth.uid()) OR is_my_friend(profile_id));
