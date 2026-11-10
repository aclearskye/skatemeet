-- Push notifications (md/media_posts.md §5). One row per device; the app
-- registers its Expo push token the first time someone posts and removes it
-- on sign-out.
--
-- Sending happens in the database: an AFTER INSERT trigger on notifications
-- forwards the post-related sources below to Expo's push API with pg_net
-- (enabled in 20261104170000_posts.sql). Expo's endpoint needs no auth
-- unless "enhanced push security" is turned on for the project; if it is,
-- move this into an edge function holding the access token.
--
-- Also adds the author-facing "your post is live" / "under review"
-- notifications, which double as the push for an upload that finished
-- while the app was closed.

CREATE TABLE push_tokens (
  token       TEXT PRIMARY KEY,
  profile_id  UUID NOT NULL REFERENCES profiles(profile_id) ON DELETE CASCADE,
  platform    TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX push_tokens_profile_idx ON push_tokens(profile_id);

ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;
-- No client policies: register/unregister go through the RPCs below.

-- A token moves to whoever registered it last (shared / handed-down device).
CREATE FUNCTION register_push_token(p_token TEXT, p_platform TEXT) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;
  INSERT INTO push_tokens (token, profile_id, platform) VALUES (p_token, auth.uid(), p_platform)
  ON CONFLICT (token) DO UPDATE SET profile_id = auth.uid(), platform = p_platform, updated_at = now();
END;
$$;

CREATE FUNCTION unregister_push_token(p_token TEXT) RETURNS VOID
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  DELETE FROM push_tokens WHERE token = p_token AND profile_id = auth.uid();
$$;

-- Only these notification sources push. Friend-request/streak etc. stay
-- in-app only for now; there is deliberately no "a friend posted" push.
CREATE FUNCTION _push_notification() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_messages JSONB;
BEGIN
  IF NEW.source NOT IN ('post_tag', 'post_removed', 'post_caption_rejected', 'post_published', 'post_held') THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_agg(jsonb_build_object(
    'to', t.token,
    'title', COALESCE(NEW.label, 'SkateMeet'),
    'body', NEW.message,
    'sound', 'default',
    'data', jsonb_build_object('source', NEW.source, 'post_id', split_part(NEW.dedup_key, ':', 1))
  ))
  INTO v_messages
  FROM push_tokens t WHERE t.profile_id = NEW.profile_id;

  IF v_messages IS NOT NULL THEN
    PERFORM net.http_post(
      url := 'https://exp.host/--/api/v2/push/send',
      body := v_messages,
      headers := jsonb_build_object('Content-Type', 'application/json', 'Accept', 'application/json'),
      timeout_milliseconds := 5000
    );
  END IF;
  RETURN NULL;
END;
$$;
CREATE TRIGGER notifications_push AFTER INSERT ON notifications
  FOR EACH ROW EXECUTE FUNCTION _push_notification();

-- moderation_publish_post / moderation_hold_post now also tell the author.
CREATE OR REPLACE FUNCTION moderation_publish_post(p_post_id UUID) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_post posts%ROWTYPE; v_username TEXT; v_tag RECORD; v_was_held BOOLEAN;
BEGIN
  SELECT status = 'held' INTO v_was_held FROM posts WHERE post_id = p_post_id;
  UPDATE posts SET status = 'published', published_at = COALESCE(published_at, now()),
    hold_reason = NULL, is_urgent = false
  WHERE post_id = p_post_id AND status IN ('pending_moderation', 'held')
  RETURNING * INTO v_post;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Re-approving a post held by reports isn't news to its author.
  IF NOT (v_was_held AND v_post.published_at < now() - INTERVAL '1 minute') THEN
    PERFORM create_notification(v_post.profile_id, 'post_published', p_post_id::TEXT,
      'TAP TO VIEW IT.', 'success', 'YOUR POST IS LIVE', NULL);
  END IF;

  SELECT username INTO v_username FROM profiles WHERE profile_id = v_post.profile_id;
  FOR v_tag IN SELECT tagged_profile_id FROM post_skater_tags WHERE post_id = p_post_id AND status = 'pending' LOOP
    PERFORM create_notification(v_tag.tagged_profile_id, 'post_tag', p_post_id::TEXT,
      '@' || upper(v_username) || ' TAGGED YOU IN A POST', 'info', 'TAGGED IN A POST', v_post.profile_id);
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION moderation_hold_post(p_post_id UUID, p_reason TEXT, p_urgent BOOLEAN) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_owner UUID;
BEGIN
  UPDATE posts SET status = 'held', hold_reason = p_reason, is_urgent = is_urgent OR p_urgent
  WHERE post_id = p_post_id AND status = 'pending_moderation'
  RETURNING profile_id INTO v_owner;
  -- Only new uploads notify; a live post held by reports shouldn't tip off
  -- its author before an admin looks.
  IF FOUND THEN
    PERFORM create_notification(v_owner, 'post_held', p_post_id::TEXT,
      'AN ADMIN WILL TAKE A LOOK BEFORE IT GOES LIVE.', 'info', 'YOUR POST IS UNDER REVIEW', NULL);
  END IF;
END;
$$;

DO $$
DECLARE fn REGPROCEDURE;
BEGIN
  FOREACH fn IN ARRAY ARRAY['_push_notification()', 'moderation_publish_post(uuid)', 'moderation_hold_post(uuid,text,boolean)']::REGPROCEDURE[] LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn);
  END LOOP;
  FOREACH fn IN ARRAY ARRAY['register_push_token(text,text)', 'unregister_push_token(text)']::REGPROCEDURE[] LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', fn);
  END LOOP;
END;
$$;
