-- Message notifications, and a per-chat mute that silences them.
--
--   * DMs push every new message to the other member: title is the
--     sender's display name (or @username), body is the message.
--   * Spot chats push "<name> sent a message" titled with the spot name,
--     never the message text: spot chat messages are scanned after insert
--     and may be held, so the text mustn't reach a lock screen first. At
--     most one push per member per unread burst (until they open the chat).
--   * A muted chat sends no push; the app also skips its in-app banner.
--
-- Pushes go straight to Expo with pg_net, like _push_notification in
-- 20261104170100_push_notifications.sql. Messages never go into the
-- notifications inbox.

ALTER TABLE conversation_members ADD COLUMN muted BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE spot_chat_members
  ADD COLUMN muted BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN last_pushed_at TIMESTAMPTZ;

-- ── Sending ─────────────────────────────────────────────────────────────

CREATE FUNCTION _push_to_profiles(p_profile_ids UUID[], p_title TEXT, p_body TEXT, p_data JSONB)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_messages JSONB;
BEGIN
  IF p_profile_ids IS NULL OR cardinality(p_profile_ids) = 0 THEN
    RETURN;
  END IF;
  SELECT jsonb_agg(jsonb_build_object(
    'to', t.token,
    'title', p_title,
    'body', p_body,
    'sound', 'default',
    'data', p_data
  ))
  INTO v_messages
  FROM push_tokens t WHERE t.profile_id = ANY (p_profile_ids);
  IF v_messages IS NOT NULL THEN
    PERFORM net.http_post(
      url := 'https://exp.host/--/api/v2/push/send',
      body := v_messages,
      headers := jsonb_build_object('Content-Type', 'application/json', 'Accept', 'application/json'),
      timeout_milliseconds := 5000
    );
  END IF;
END;
$$;

CREATE FUNCTION _push_dm_message() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_recipient UUID;
  v_sender_name TEXT;
  v_body TEXT;
BEGIN
  SELECT cm.profile_id INTO v_recipient
  FROM conversation_members cm
  WHERE cm.conversation_id = NEW.conversation_id
    AND cm.profile_id <> NEW.sender_id
    AND NOT cm.muted;
  IF v_recipient IS NULL OR is_blocked_between(NEW.sender_id, v_recipient) THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(NULLIF(btrim(p.display_name), ''), '@' || p.username)
    INTO v_sender_name FROM profiles p WHERE p.profile_id = NEW.sender_id;
  v_body := CASE WHEN char_length(NEW.body) > 140 THEN left(NEW.body, 139) || '…' ELSE NEW.body END;

  PERFORM _push_to_profiles(
    ARRAY[v_recipient],
    COALESCE(v_sender_name, 'New message'),
    v_body,
    jsonb_build_object('source', 'message', 'conversation_id', NEW.conversation_id)
  );
  RETURN NULL;
END;
$$;

CREATE TRIGGER messages_push AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION _push_dm_message();

CREATE FUNCTION _push_spot_chat_message() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_room spot_chat_rooms%ROWTYPE;
  v_spot_name TEXT;
  v_is_diy BOOLEAN;
  v_sender_name TEXT;
  v_recipients UUID[];
BEGIN
  IF NEW.status <> 'visible' THEN
    RETURN NULL;
  END IF;

  -- Members who haven't been pushed since they last read the chat; claim
  -- them in the same statement so concurrent messages don't double up.
  WITH due AS (
    UPDATE spot_chat_members mem
       SET last_pushed_at = now()
     WHERE mem.room_id = NEW.room_id
       AND mem.profile_id <> NEW.sender_id
       AND mem.left_at IS NULL
       AND NOT mem.muted
       AND (mem.last_pushed_at IS NULL
            OR mem.last_pushed_at < COALESCE(mem.last_read_at, mem.joined_at))
       AND NOT is_blocked_between(NEW.sender_id, mem.profile_id)
    RETURNING mem.profile_id
  )
  SELECT array_agg(profile_id) INTO v_recipients FROM due;
  IF v_recipients IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_room FROM spot_chat_rooms WHERE room_id = NEW.room_id;
  SELECT COALESCE(us.name, os.name, 'Spot chat'), COALESCE(us.type = 'diy', os.spot_type = 'diy', false)
    INTO v_spot_name, v_is_diy
  FROM (SELECT 1) one
  LEFT JOIN user_spots us ON us.spot_id = v_room.spot_id
  LEFT JOIN osm_spots os ON os.place_id = v_room.osm_spot_place_id;
  -- Display name only, as in the chat itself.
  SELECT COALESCE(NULLIF(btrim(p.display_name), ''), 'Skater')
    INTO v_sender_name FROM profiles p WHERE p.profile_id = NEW.sender_id;

  PERFORM _push_to_profiles(
    v_recipients,
    v_spot_name,
    COALESCE(v_sender_name, 'Skater') || ' sent a message',
    jsonb_build_object(
      'source', 'spot_chat_message',
      'room_id', NEW.room_id,
      'spot_id', v_room.spot_id,
      'osm_spot_place_id', v_room.osm_spot_place_id,
      'spot_name', v_spot_name,
      'is_diy', v_is_diy
    )
  );
  RETURN NULL;
END;
$$;

CREATE TRIGGER spot_chat_messages_push AFTER INSERT ON spot_chat_messages
  FOR EACH ROW EXECUTE FUNCTION _push_spot_chat_message();

-- ── Muting ──────────────────────────────────────────────────────────────

CREATE FUNCTION set_conversation_muted(p_conversation_id UUID, p_muted BOOLEAN) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  UPDATE conversation_members SET muted = COALESCE(p_muted, false)
  WHERE conversation_id = p_conversation_id AND profile_id = auth.uid();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_A_MEMBER';
  END IF;
END;
$$;

CREATE FUNCTION set_spot_chat_muted(p_room_id UUID, p_muted BOOLEAN) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  UPDATE spot_chat_members SET muted = COALESCE(p_muted, false)
  WHERE room_id = p_room_id AND profile_id = auth.uid() AND left_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_A_MEMBER';
  END IF;
END;
$$;

-- ── Lists carry the mute flag ───────────────────────────────────────────
-- Return types change, so both are dropped and recreated (bodies as before
-- plus `muted`).

DROP FUNCTION get_my_chats(UUID);

CREATE FUNCTION get_my_chats(p_conversation_id UUID DEFAULT NULL)
RETURNS TABLE (
  conversation_id UUID, other_profile_id UUID, other_username TEXT, other_display_name TEXT,
  other_avatar_url TEXT, other_state TEXT, other_last_read_at TIMESTAMPTZ, last_message_id UUID,
  last_message_body TEXT, last_message_sender UUID, last_message_at TIMESTAMPTZ, unread_count INTEGER,
  can_message BOOLEAN, sort_at TIMESTAMPTZ, muted BOOLEAN
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
#variable_conflict use_column
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
    WITH mine AS (
      SELECT cm.conversation_id, cm.last_read_at, cm.muted,
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
        mine.created_at,
        mine.muted
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
      COALESCE(chats.msg_at, chats.created_at),
      chats.muted
    FROM chats
    LEFT JOIN profiles p ON p.profile_id = chats.other_id

    UNION ALL

    SELECT
      NULL::UUID, f.profile_id, f.username::TEXT, f.display_name::TEXT, f.avatar_url::TEXT,
      'active'::TEXT, NULL::TIMESTAMPTZ, NULL::UUID, NULL::TEXT, NULL::UUID, NULL::TIMESTAMPTZ,
      0, true, NULL::TIMESTAMPTZ, false
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

DROP FUNCTION get_my_spot_chats();

CREATE FUNCTION get_my_spot_chats()
RETURNS TABLE (
  room_id UUID, spot_id UUID, osm_spot_place_id TEXT, spot_name TEXT, is_diy BOOLEAN,
  member_count INTEGER, joined_at TIMESTAMPTZ, last_message_body TEXT, last_message_at TIMESTAMPTZ,
  last_message_is_mine BOOLEAN, last_sender_name TEXT, unread_count INTEGER, muted BOOLEAN
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
#variable_conflict use_column
DECLARE v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
    WITH mine AS (
      SELECT mem.room_id, mem.joined_at, mem.muted,
             COALESCE(mem.cleared_at, '-infinity'::TIMESTAMPTZ) AS visible_since,
             COALESCE(mem.last_read_at, mem.joined_at) AS read_since
      FROM spot_chat_members mem
      WHERE mem.profile_id = v_uid AND mem.left_at IS NULL
    ),
    visible AS (
      SELECT m.room_id, m.message_id, m.body, m.created_at, m.sender_id
      FROM mine
      JOIN spot_chat_messages m ON m.room_id = mine.room_id
      WHERE m.created_at > mine.visible_since
        AND (m.status = 'visible' OR m.sender_id = v_uid)
        AND NOT EXISTS (
          SELECT 1 FROM spot_chat_hidden_messages h
          WHERE h.profile_id = v_uid AND h.message_id = m.message_id
        )
        AND (m.sender_id = v_uid OR NOT is_blocked_between(v_uid, m.sender_id))
        AND (m.sender_id = v_uid OR NOT _is_banned(m.sender_id))
    )
    SELECT
      mine.room_id,
      r.spot_id,
      r.osm_spot_place_id,
      COALESCE(us.name, os.name, 'Spot')::TEXT,
      COALESCE(us.type = 'diy', os.spot_type = 'diy', false),
      (SELECT COUNT(*)::INTEGER FROM spot_chat_members c
        WHERE c.room_id = mine.room_id AND c.left_at IS NULL),
      mine.joined_at,
      last_msg.body,
      last_msg.created_at,
      last_msg.sender_id = v_uid,
      CASE WHEN last_msg.sender_id IS NULL THEN NULL
           ELSE COALESCE(NULLIF(btrim(p.display_name), ''), 'Skater')::TEXT END,
      (SELECT COUNT(*)::INTEGER FROM visible v
        WHERE v.room_id = mine.room_id AND v.sender_id <> v_uid AND v.created_at > mine.read_since),
      mine.muted
    FROM mine
    JOIN spot_chat_rooms r ON r.room_id = mine.room_id
    LEFT JOIN user_spots us ON us.spot_id = r.spot_id
    LEFT JOIN osm_spots os ON os.place_id = r.osm_spot_place_id
    LEFT JOIN LATERAL (
      SELECT v.body, v.created_at, v.sender_id FROM visible v
      WHERE v.room_id = mine.room_id
      ORDER BY v.created_at DESC
      LIMIT 1
    ) last_msg ON true
    LEFT JOIN profiles p ON p.profile_id = last_msg.sender_id
    ORDER BY COALESCE(last_msg.created_at, mine.joined_at) DESC;
END;
$$;

-- ── Privileges ──────────────────────────────────────────────────────────

DO $$
DECLARE fn REGPROCEDURE;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    '_push_to_profiles(uuid[],text,text,jsonb)', '_push_dm_message()', '_push_spot_chat_message()'
  ]::REGPROCEDURE[] LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn);
  END LOOP;
  FOREACH fn IN ARRAY ARRAY[
    'set_conversation_muted(uuid,boolean)', 'set_spot_chat_muted(uuid,boolean)',
    'get_my_chats(uuid)', 'get_my_spot_chats()'
  ]::REGPROCEDURE[] LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', fn);
  END LOOP;
END;
$$;
