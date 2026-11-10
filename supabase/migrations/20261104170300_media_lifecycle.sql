-- Post media cleanup (md/media_posts.md §9). SQL can't delete Storage
-- objects properly, so every place a post's files stop being needed queues
-- them in media_cleanup_queue, and moderate-post's "drain_cleanup" action
-- (service role) removes them from Storage on a cron.
--
-- One trigger covers every way a media row disappears: delete_post, the
-- abandoned-draft sweep, and account deletion (profiles -> posts ->
-- post_media cascade, from self_delete_account and admin_delete_user_data).
-- Files under a CSAM hold live in moderation-evidence and are never queued
-- -- they're a legal hold and outlive the account.

CREATE FUNCTION _queue_post_media_cleanup() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.storage_path IS NOT NULL AND OLD.bucket <> 'moderation-evidence' THEN
    INSERT INTO media_cleanup_queue (bucket, path) VALUES (OLD.bucket, OLD.storage_path);
  END IF;
  RETURN NULL;
END;
$$;
CREATE TRIGGER post_media_queue_cleanup AFTER DELETE ON post_media
  FOR EACH ROW EXECUTE FUNCTION _queue_post_media_cleanup();

CREATE FUNCTION _request_media_cleanup() RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_url TEXT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM media_cleanup_queue) THEN
    RETURN;
  END IF;
  SELECT decrypted_secret INTO v_url FROM vault.decrypted_secrets WHERE name = 'project_url';
  PERFORM net.http_post(
    url := v_url || '/functions/v1/moderate-post',
    body := jsonb_build_object('action', 'drain_cleanup'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-moderation-secret', _moderation_webhook_secret()
    ),
    timeout_milliseconds := 5000
  );
END;
$$;

SELECT cron.schedule('post-media-cleanup', '*/10 * * * *', 'SELECT public._request_media_cleanup()');

REVOKE EXECUTE ON FUNCTION _queue_post_media_cleanup() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION _request_media_cleanup() FROM PUBLIC, anon, authenticated;
