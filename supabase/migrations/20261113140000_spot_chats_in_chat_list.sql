-- Spot chats the skater has joined (and not left) show in the Chats tab
-- alongside their DMs, with a last-message preview and an unread dot.

-- Read marker per membership. Existing members start fully read; a new
-- member's baseline is joined_at (null last_read_at).
ALTER TABLE spot_chat_members ADD COLUMN last_read_at TIMESTAMPTZ;
UPDATE spot_chat_members SET last_read_at = now() WHERE left_at IS NULL;

-- One row per room the caller is in. The preview and unread count apply
-- the same visibility rules as get_spot_chat_messages (cleared, held,
-- hidden-for-me, blocked, banned), and only ever expose the sender's
-- display name, never a username or profile id.
CREATE OR REPLACE FUNCTION get_my_spot_chats()
RETURNS TABLE (
  room_id UUID,
  spot_id UUID,
  osm_spot_place_id TEXT,
  spot_name TEXT,
  is_diy BOOLEAN,
  member_count INTEGER,
  joined_at TIMESTAMPTZ,
  last_message_body TEXT,
  last_message_at TIMESTAMPTZ,
  last_message_is_mine BOOLEAN,
  last_sender_name TEXT,
  unread_count INTEGER
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
      SELECT mem.room_id, mem.joined_at,
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
        WHERE v.room_id = mine.room_id AND v.sender_id <> v_uid AND v.created_at > mine.read_since)
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

-- Called while the chat is open, so the Chats tab's unread dot clears.
CREATE OR REPLACE FUNCTION mark_spot_chat_read(p_room_id UUID) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  UPDATE spot_chat_members SET last_read_at = now()
  WHERE room_id = p_room_id AND profile_id = auth.uid() AND left_at IS NULL;
END;
$$;

REVOKE ALL ON FUNCTION get_my_spot_chats() FROM public, anon;
REVOKE ALL ON FUNCTION mark_spot_chat_read(UUID) FROM public, anon;
GRANT EXECUTE ON FUNCTION get_my_spot_chats() TO authenticated;
GRANT EXECUTE ON FUNCTION mark_spot_chat_read(UUID) TO authenticated;
