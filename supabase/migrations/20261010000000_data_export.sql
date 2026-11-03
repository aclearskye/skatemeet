-- GDPR Art. 15/20 data export (md/messaging_and_privacy.md §7). Returns one
-- JSON document scoped to auth.uid(); the app saves and shares it, so no
-- export file is ever stored server-side. Rate-limited to once an hour.
--
-- Excluded on purpose (stated in the privacy policy): reports *about* the
-- caller (reporter anonymity, Art. 15(4)), blocks against the caller, and
-- admin audit-log entries.

-- Rows of p_table owned by p_profile_id via p_column, as a JSON array.
-- Dynamic and existence-checked because several of these tables predate the
-- migrations folder (user_spots, user_stores, reviews, favourites); an
-- absent table or column is skipped rather than failing the whole export.
-- p_omit drops columns that identify someone other than the caller
-- (e.g. the admin who banned them).
CREATE FUNCTION _export_rows(p_table TEXT, p_column TEXT, p_profile_id UUID, p_omit TEXT[] DEFAULT '{}')
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_result JSONB;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = p_table AND column_name = p_column
  ) THEN
    RETURN '[]'::JSONB;
  END IF;

  EXECUTE format(
    'SELECT COALESCE(jsonb_agg(to_jsonb(t) - $2), ''[]''::JSONB) FROM public.%I t WHERE t.%I = $1',
    p_table, p_column
  ) INTO v_result USING p_profile_id, p_omit;

  RETURN v_result;
END;
$$;
REVOKE EXECUTE ON FUNCTION _export_rows(TEXT, TEXT, UUID, TEXT[]) FROM PUBLIC, anon, authenticated;

CREATE FUNCTION export_my_data() RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_last_export TIMESTAMPTZ;
  v_chats JSONB;
  v_friends JSONB;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT last_export_at INTO v_last_export FROM profiles WHERE profile_id = v_uid FOR UPDATE;
  IF v_last_export > now() - INTERVAL '1 hour' THEN
    RAISE EXCEPTION 'EXPORT_RATE_LIMITED';
  END IF;
  UPDATE profiles SET last_export_at = now() WHERE profile_id = v_uid;

  -- Every message the caller sent (including ones cleared on their side --
  -- the other person's copy still exists), plus received messages still
  -- visible to them. A departed or blocking other party is labelled the same
  -- way the app shows them, so the export never reveals a block either.
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'conversation_id', mine.conversation_id,
           'with', CASE
             WHEN other.profile_id IS NULL OR has_blocked(other.profile_id, v_uid) THEN 'Unavailable skater'
             ELSE '@' || op.username
           END,
           'my_last_read_at', mine.last_read_at,
           'cleared_at', mine.cleared_at,
           'deleted_at', mine.hidden_at,
           'messages', (
             SELECT COALESCE(jsonb_agg(jsonb_build_object(
                      'from', CASE WHEN m.sender_id = v_uid THEN 'me' ELSE 'them' END,
                      'kind', m.kind,
                      'body', m.body,
                      'sent_at', m.created_at
                    ) ORDER BY m.created_at), '[]'::JSONB)
             FROM messages m
             WHERE m.conversation_id = mine.conversation_id
               AND (m.sender_id = v_uid OR m.created_at > COALESCE(mine.cleared_at, '-infinity'::TIMESTAMPTZ))
           )
         )), '[]'::JSONB)
    INTO v_chats
  FROM conversation_members mine
  LEFT JOIN conversation_members other
    ON other.conversation_id = mine.conversation_id AND other.profile_id <> v_uid
  LEFT JOIN profiles op ON op.profile_id = other.profile_id
  WHERE mine.profile_id = v_uid;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'other', '@' || p.username,
           'direction', CASE WHEN r.requester_id = v_uid THEN 'sent' ELSE 'received' END,
           'status', r.status,
           'created_at', r.created_at,
           'responded_at', r.responded_at
         )), '[]'::JSONB)
    INTO v_friends
  FROM friend_requests r
  JOIN profiles p
    ON p.profile_id = CASE WHEN r.requester_id = v_uid THEN r.recipient_id ELSE r.requester_id END
  WHERE r.requester_id = v_uid OR r.recipient_id = v_uid;

  RETURN jsonb_build_object(
    'exported_at', now(),
    'profile', (SELECT to_jsonb(p) - 'last_export_at' FROM profiles p WHERE p.profile_id = v_uid),
    'chats', v_chats,
    'friends_and_requests', v_friends,
    'blocks_i_made', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('blocked', '@' || p.username, 'blocked_at', b.created_at)), '[]'::JSONB)
      FROM profile_blocks b JOIN profiles p ON p.profile_id = b.blocked_id
      WHERE b.blocker_id = v_uid
    ),
    'reports_i_filed', jsonb_build_object(
      'messages', (
        SELECT COALESCE(jsonb_agg(jsonb_build_object(
                 'reason', r.reason, 'details', r.details, 'created_at', r.created_at, 'resolution', r.resolution
               )), '[]'::JSONB)
        FROM message_reports r WHERE r.reported_by = v_uid
      ),
      'profiles', (
        SELECT COALESCE(jsonb_agg(jsonb_build_object(
                 'reason', r.reason, 'details', r.details, 'created_at', r.created_at, 'resolution', r.resolution
               )), '[]'::JSONB)
        FROM profile_reports r WHERE r.reported_by = v_uid
      ),
      'spot_reviews', _export_rows('spot_review_reports', 'profile_id', v_uid, ARRAY['resolved_by']),
      'store_reviews', _export_rows('store_review_reports', 'profile_id', v_uid, ARRAY['resolved_by']),
      'spot_photos', _export_rows('spot_photo_reports', 'profile_id', v_uid, ARRAY['resolved_by']),
      'store_photos', _export_rows('store_photo_reports', 'profile_id', v_uid, ARRAY['resolved_by'])
    ),
    'notifications', _export_rows('notifications', 'profile_id', v_uid),
    'check_ins', _export_rows('check_ins', 'profile_id', v_uid),
    'streak', _export_rows('user_streaks', 'profile_id', v_uid),
    'xp', _export_rows('user_xp', 'profile_id', v_uid),
    'xp_events', _export_rows('xp_events', 'profile_id', v_uid),
    'pending_xp_events', _export_rows('pending_xp_events', 'profile_id', v_uid),
    'business_verification_requests', _export_rows('business_verification_requests', 'profile_id', v_uid),
    'crew_follows', _export_rows('crew_follows', 'follower_id', v_uid),
    'spot_reviews', _export_rows('spot_reviews', 'profile_id', v_uid),
    'store_reviews', _export_rows('store_reviews', 'profile_id', v_uid),
    'spot_review_votes', _export_rows('spot_review_votes', 'profile_id', v_uid),
    'store_review_votes', _export_rows('store_review_votes', 'profile_id', v_uid),
    'spot_photos', _export_rows('spot_photos', 'profile_id', v_uid),
    'store_photos', _export_rows('store_photos', 'profile_id', v_uid),
    'spot_photo_votes', _export_rows('spot_photo_votes', 'profile_id', v_uid),
    'store_photo_votes', _export_rows('store_photo_votes', 'profile_id', v_uid),
    'spot_votes', _export_rows('spot_votes', 'profile_id', v_uid),
    'store_votes', _export_rows('store_votes', 'profile_id', v_uid),
    'clips', _export_rows('clips', 'profile_id', v_uid),
    'favourite_spots', _export_rows('spot_favorites', 'profile_id', v_uid),
    'favourite_stores', _export_rows('store_favorites', 'profile_id', v_uid),
    'spots_created', _export_rows('user_spots', 'created_by', v_uid),
    'stores_created', _export_rows('user_stores', 'profile_id', v_uid),
    'verification_requests', _export_rows('spot_verification_requests', 'profile_id', v_uid, ARRAY['reviewed_by']),
    'bans', _export_rows('user_bans', 'profile_id', v_uid, ARRAY['banned_by', 'unbanned_by']),
    'ban_appeals', _export_rows('ban_appeals', 'profile_id', v_uid, ARRAY['reviewed_by'])
  );
END;
$$;
GRANT EXECUTE ON FUNCTION export_my_data() TO authenticated;
