-- Video posts on Cloudflare Stream (md/media_posts.md §3, §4, Phase 3).
--
-- Lifecycle for a video post (photos are unchanged):
--   create_post_draft('video')   -> 'uploading', one post_media row
--   stream-video upload_url      -> Stream direct upload (signed-only video);
--                                   post_media.stream_uid set, bucket 'stream'
--   client uploads, submit_post  -> 'pending_moderation'
--   Stream webhook (ready)       -> stream_video_ready(): fills duration/size
--                                   and (re)requests moderation
--   moderate-post                -> caption check, then a temporary signed MP4
--                                   sent to Sightengine's async video API
--   Sightengine callback         -> pass: video made public, published
--                                   hold: stays signed-only, admin queue
--
-- Stream is the only copy of a video, so post_media.bucket = 'stream' marks
-- it and the cleanup queue deletes it through the Stream API instead of
-- Storage. A CSAM hold relabels it 'moderation-evidence' like photos, which
-- keeps it out of cleanup for good.

-- Sightengine async job for this video (its media id), so a duplicate or
-- stale callback can be recognised and the sweeper doesn't resubmit a job
-- that's still running.
ALTER TABLE post_media
  ADD COLUMN moderation_job_id TEXT,
  ADD COLUMN moderation_job_at TIMESTAMPTZ;

-- ── submit_post: a video counts as uploaded once Stream has an id for it ──
-- Whether Stream has finished processing is moderate-post's problem (it
-- waits for readyToStream); this only rejects a submit with no upload.
CREATE OR REPLACE FUNCTION submit_post(p_post_id UUID) RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_status TEXT;
BEGIN
  SELECT status INTO v_status FROM posts WHERE post_id = p_post_id AND profile_id = auth.uid();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'POST_NOT_FOUND';
  END IF;
  IF v_status <> 'uploading' THEN
    RETURN v_status;
  END IF;
  IF EXISTS (
    SELECT 1 FROM post_media m
    WHERE m.post_id = p_post_id AND m.media_type = 'photo'
      AND NOT EXISTS (SELECT 1 FROM storage.objects o WHERE o.bucket_id = 'post-quarantine' AND o.name = m.storage_path)
  ) OR EXISTS (
    SELECT 1 FROM post_media m
    WHERE m.post_id = p_post_id AND m.media_type = 'video' AND m.stream_uid IS NULL
  ) THEN
    RAISE EXCEPTION 'UPLOAD_INCOMPLETE';
  END IF;

  UPDATE posts SET status = 'pending_moderation' WHERE post_id = p_post_id;
  RETURN 'pending_moderation';
END;
$$;

-- ── Stream webhook outcomes (service role only, called by stream-video) ──

-- The video finished processing. Records what Stream measured and moves the
-- post on: an upload the app never got to submit (killed mid-way) is
-- submitted here; one already waiting is re-requested straight away rather
-- than on the sweeper's next pass.
CREATE FUNCTION stream_video_ready(
  p_post_id UUID,
  p_stream_uid TEXT,
  p_duration NUMERIC,
  p_width INTEGER,
  p_height INTEGER
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_status TEXT;
BEGIN
  UPDATE post_media SET duration_seconds = p_duration, width = p_width, height = p_height
  WHERE post_id = p_post_id AND stream_uid = p_stream_uid;
  IF NOT FOUND THEN
    RETURN; -- a replaced upload (retry) or a deleted post
  END IF;

  SELECT status INTO v_status FROM posts WHERE post_id = p_post_id;
  IF v_status = 'uploading' THEN
    UPDATE posts SET status = 'pending_moderation' WHERE post_id = p_post_id;
  ELSIF v_status = 'pending_moderation' THEN
    PERFORM _request_moderation(p_post_id);
  END IF;
END;
$$;

-- Stream couldn't use the file (not a video, over 60s, corrupt...). The
-- draft is deleted -- its cleanup trigger removes the Stream copy -- and the
-- author is told why.
CREATE FUNCTION stream_video_failed(p_post_id UUID, p_stream_uid TEXT, p_error TEXT) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_owner UUID;
BEGIN
  SELECT p.profile_id INTO v_owner
  FROM posts p JOIN post_media m ON m.post_id = p.post_id
  WHERE p.post_id = p_post_id AND m.stream_uid = p_stream_uid
    AND p.status IN ('uploading', 'pending_moderation');
  IF NOT FOUND THEN
    RETURN;
  END IF;

  PERFORM create_notification(v_owner, 'post_video_failed', p_post_id::TEXT,
    CASE p_error
      WHEN 'ERR_DURATION_EXCEED_CONSTRAINT' THEN 'VIDEOS CAN BE UP TO 60 SECONDS. TRIM IT AND TRY AGAIN.'
      WHEN 'ERR_NON_VIDEO' THEN 'THAT FILE ISN''T A VIDEO WE CAN PLAY.'
      WHEN 'ERR_DURATION_TOO_SHORT' THEN 'THAT VIDEO IS TOO SHORT.'
      ELSE 'SOMETHING WENT WRONG PROCESSING IT. TRY UPLOADING AGAIN.'
    END,
    'danger', 'YOUR VIDEO DIDN''T UPLOAD', NULL);
  DELETE FROM posts WHERE post_id = p_post_id;
END;
$$;

-- ── Cleanup: Stream videos go through the queue too ─────────────────────
CREATE OR REPLACE FUNCTION _queue_post_media_cleanup() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.bucket = 'moderation-evidence' THEN
    RETURN NULL;
  END IF;
  IF OLD.storage_path IS NOT NULL THEN
    INSERT INTO media_cleanup_queue (bucket, path) VALUES (OLD.bucket, OLD.storage_path);
  END IF;
  IF OLD.stream_uid IS NOT NULL THEN
    INSERT INTO media_cleanup_queue (bucket, path) VALUES ('stream', OLD.stream_uid);
  END IF;
  RETURN NULL;
END;
$$;

-- ── Sweeper: catch video uploads the app never submitted ────────────────
-- Normally the Stream webhook does this; this covers a missed webhook.
-- moderate-post itself waits until Stream reports the video ready.
CREATE OR REPLACE FUNCTION _sweep_posts() RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_post RECORD;
BEGIN
  UPDATE posts p SET status = 'pending_moderation'
  WHERE p.status = 'uploading' AND p.media_type = 'photo'
    AND NOT EXISTS (
      SELECT 1 FROM post_media m WHERE m.post_id = p.post_id
        AND NOT EXISTS (SELECT 1 FROM storage.objects o WHERE o.bucket_id = 'post-quarantine' AND o.name = m.storage_path)
    );

  UPDATE posts p SET status = 'pending_moderation'
  WHERE p.status = 'uploading' AND p.media_type = 'video'
    AND p.created_at < now() - INTERVAL '15 minutes'
    AND EXISTS (SELECT 1 FROM post_media m WHERE m.post_id = p.post_id AND m.stream_uid IS NOT NULL);

  FOR v_post IN
    SELECT post_id FROM posts
    WHERE ((status = 'pending_moderation') OR (status = 'published' AND pending_caption IS NOT NULL))
      AND moderation_requested_at < now() - INTERVAL '5 minutes'
      AND moderation_attempts < 20
  LOOP
    PERFORM _request_moderation(v_post.post_id);
  END LOOP;

  -- Their files are queued by the post_media delete trigger.
  DELETE FROM posts WHERE status = 'uploading' AND created_at < now() - INTERVAL '24 hours';
END;
$$;

-- ── Push: tell the author when their video couldn't be processed ────────
DO $$
DECLARE
  v_old TEXT := pg_get_functiondef('public._push_notification'::regproc);
  v_new TEXT := replace(
    v_old,
    $r$'post_published', 'post_held')$r$,
    $r$'post_published', 'post_held', 'post_video_failed')$r$
  );
BEGIN
  IF v_new = v_old THEN
    RAISE EXCEPTION '_push_notification no longer has the expected source list';
  END IF;
  EXECUTE v_new;
END;
$$;

REVOKE EXECUTE ON FUNCTION stream_video_ready(UUID, TEXT, NUMERIC, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION stream_video_failed(UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION stream_video_ready(UUID, TEXT, NUMERIC, INTEGER, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION stream_video_failed(UUID, TEXT, TEXT) TO service_role;
