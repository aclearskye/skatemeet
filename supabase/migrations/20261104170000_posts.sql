-- Media posts, Phase 1 backend (md/media_posts.md §3, §4, §8).
--
-- Supersedes the never-used clips table with posts + post_media (clips is
-- dropped in 20261104170400).
-- Every write goes through a SECURITY DEFINER RPC -- there are no client
-- INSERT/UPDATE/DELETE policies -- so status (the moderation gate) can't be
-- forged.
--
-- Lifecycle:
--   create_post_draft        -> 'uploading' (client uploads to post-quarantine)
--   submit_post / sweeper    -> 'pending_moderation' (all files present)
--   trigger -> pg_net        -> moderate-post edge function (Sightengine)
--   moderation_publish_post  -> 'published' (files copied to post-media)
--   moderation_hold_post     -> 'held'      (admin queue)
--   moderation_reject_caption-> 'caption_rejected' (author edits caption)
--   admin_remove_post        -> 'removed'
-- Nothing becomes publicly visible without passing moderation or an admin.

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- ── posts ───────────────────────────────────────────────────────────────
CREATE TABLE posts (
  post_id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id               UUID NOT NULL REFERENCES profiles(profile_id) ON DELETE CASCADE,
  -- A post is either 1-10 photos or exactly one video, never mixed.
  media_type               TEXT NOT NULL CHECK (media_type IN ('photo', 'video')),
  caption                  TEXT CHECK (char_length(caption) <= 2200),
  -- A caption edit on a live post waits here until moderation passes it;
  -- the live caption stays untouched if it fails.
  pending_caption          TEXT CHECK (char_length(pending_caption) <= 2200),
  status                   TEXT NOT NULL DEFAULT 'uploading' CHECK (status IN (
                             'uploading', 'pending_moderation', 'published', 'held',
                             'caption_rejected', 'rejected', 'removed')),
  hold_reason              TEXT,
  is_urgent                BOOLEAN NOT NULL DEFAULT false,
  -- Zero or one entity tag. DIY spots are user_spots rows (type = 'diy').
  spot_id                  UUID REFERENCES user_spots(spot_id) ON DELETE SET NULL,
  osm_spot_place_id        TEXT,
  store_id                 UUID REFERENCES user_stores(store_id) ON DELETE SET NULL,
  osm_store_place_id       TEXT,
  pinned_at                TIMESTAMPTZ,
  archived_at              TIMESTAMPTZ,
  like_count               INTEGER NOT NULL DEFAULT 0,
  report_count             INTEGER NOT NULL DEFAULT 0,
  moderation_attempts      INTEGER NOT NULL DEFAULT 0,
  moderation_requested_at  TIMESTAMPTZ,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at             TIMESTAMPTZ,
  edited_at                TIMESTAMPTZ,
  CHECK (num_nonnulls(spot_id, osm_spot_place_id, store_id, osm_store_place_id) <= 1)
);

CREATE INDEX posts_profile_idx ON posts(profile_id, created_at DESC);
CREATE INDEX posts_published_idx ON posts(published_at DESC) WHERE status = 'published' AND archived_at IS NULL;
CREATE INDEX posts_spot_idx ON posts(spot_id) WHERE spot_id IS NOT NULL;
CREATE INDEX posts_osm_spot_idx ON posts(osm_spot_place_id) WHERE osm_spot_place_id IS NOT NULL;
CREATE INDEX posts_store_idx ON posts(store_id) WHERE store_id IS NOT NULL;
CREATE INDEX posts_osm_store_idx ON posts(osm_store_place_id) WHERE osm_store_place_id IS NOT NULL;
CREATE INDEX posts_moderation_idx ON posts(status) WHERE status IN ('uploading', 'pending_moderation', 'held');

-- ── post_media ──────────────────────────────────────────────────────────
CREATE TABLE post_media (
  media_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id           UUID NOT NULL REFERENCES posts(post_id) ON DELETE CASCADE,
  position          SMALLINT NOT NULL CHECK (position BETWEEN 0 AND 9),
  media_type        TEXT NOT NULL CHECK (media_type IN ('photo', 'video')),
  -- Where the file currently lives: post-quarantine until published, then
  -- post-media (public). moderation-evidence once under a CSAM hold.
  bucket            TEXT NOT NULL DEFAULT 'post-quarantine',
  storage_path      TEXT,
  -- Cloudflare Stream video id (Phase 3).
  stream_uid        TEXT,
  media_url         TEXT,
  thumbnail_url     TEXT,
  width             INTEGER,
  height            INTEGER,
  duration_seconds  NUMERIC(6, 2),
  UNIQUE (post_id, position)
);

CREATE INDEX post_media_path_idx ON post_media(storage_path);

-- Belt-and-braces for the photo/video rules (create_post_draft already
-- enforces them): media must match the post's type, ≤ 10 photos, 1 video.
CREATE FUNCTION _post_media_guard() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_type TEXT; v_count INTEGER;
BEGIN
  SELECT media_type INTO v_type FROM posts WHERE post_id = NEW.post_id;
  IF NEW.media_type <> v_type THEN
    RAISE EXCEPTION 'MEDIA_TYPE_MISMATCH';
  END IF;
  SELECT count(*) INTO v_count FROM post_media WHERE post_id = NEW.post_id;
  IF (v_type = 'video' AND v_count >= 1) OR (v_type = 'photo' AND v_count >= 10) THEN
    RAISE EXCEPTION 'TOO_MANY_MEDIA';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER post_media_guard BEFORE INSERT ON post_media
  FOR EACH ROW EXECUTE FUNCTION _post_media_guard();

-- ── skater tags ─────────────────────────────────────────────────────────
CREATE TABLE post_skater_tags (
  post_id            UUID NOT NULL REFERENCES posts(post_id) ON DELETE CASCADE,
  tagged_profile_id  UUID NOT NULL REFERENCES profiles(profile_id) ON DELETE CASCADE,
  status             TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted')),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at       TIMESTAMPTZ,
  PRIMARY KEY (post_id, tagged_profile_id)
);
CREATE INDEX post_skater_tags_profile_idx ON post_skater_tags(tagged_profile_id, status);

-- ── likes / saves / reports ─────────────────────────────────────────────
CREATE TABLE post_likes (
  post_id     UUID NOT NULL REFERENCES posts(post_id) ON DELETE CASCADE,
  profile_id  UUID NOT NULL REFERENCES profiles(profile_id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, profile_id)
);

CREATE TABLE post_saves (
  post_id     UUID NOT NULL REFERENCES posts(post_id) ON DELETE CASCADE,
  profile_id  UUID NOT NULL REFERENCES profiles(profile_id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, profile_id)
);
CREATE INDEX post_saves_profile_idx ON post_saves(profile_id, created_at DESC);

-- Reasons kept in sync with POST_REPORT_REASONS in lib/posts/types.ts.
CREATE TABLE post_reports (
  report_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id      UUID NOT NULL REFERENCES posts(post_id) ON DELETE CASCADE,
  profile_id   UUID NOT NULL REFERENCES profiles(profile_id) ON DELETE CASCADE,
  reason       TEXT NOT NULL CHECK (reason IN (
                 'child_sexual_abuse', 'nsfw', 'gore', 'harassment', 'consent', 'spam', 'other')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at  TIMESTAMPTZ,
  resolved_by  UUID REFERENCES profiles(profile_id) ON DELETE SET NULL,
  resolution   TEXT,
  UNIQUE (post_id, profile_id)
);

-- ── moderation records (admin / service role only) ──────────────────────
CREATE TABLE moderation_events (
  event_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id      UUID REFERENCES posts(post_id) ON DELETE SET NULL,
  profile_id   UUID REFERENCES profiles(profile_id) ON DELETE SET NULL,
  media_id     UUID,
  kind         TEXT NOT NULL CHECK (kind IN ('image', 'video', 'caption')),
  provider     TEXT NOT NULL DEFAULT 'sightengine',
  decision     TEXT NOT NULL CHECK (decision IN ('pass', 'hold', 'reject', 'error')),
  reason       TEXT,
  scores       JSONB,
  -- Caption rejections on live posts surface in the admin queue until an
  -- admin marks them reviewed.
  reviewed_at  TIMESTAMPTZ,
  reviewed_by  UUID REFERENCES profiles(profile_id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX moderation_events_post_idx ON moderation_events(post_id, created_at DESC);

-- Legal hold. Deliberately no foreign keys: a hold must outlive the post
-- and the account (deletion never cascades into it).
CREATE TABLE csam_holds (
  hold_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id            UUID NOT NULL,
  profile_id         UUID NOT NULL,
  username           TEXT,
  evidence_paths     TEXT[] NOT NULL DEFAULT '{}',
  flagged_by         UUID NOT NULL,
  nca_report_status  TEXT NOT NULL DEFAULT 'to_file' CHECK (nca_report_status IN ('to_file', 'filed')),
  nca_reference      TEXT,
  filed_at           TIMESTAMPTZ,
  filed_by           UUID,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Files whose rows are gone (deleted/removed posts, abandoned uploads).
-- SQL can't delete Storage objects properly, so a later edge-function job
-- drains this queue (md/media_posts.md §9).
CREATE TABLE media_cleanup_queue (
  cleanup_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket      TEXT NOT NULL,
  path        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── visibility ──────────────────────────────────────────────────────────
-- Logged-out web viewers see published posts from public, unbanned
-- profiles only (no block checks -- there's no viewer).
CREATE FUNCTION is_public_profile(p_owner UUID) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE profile_id = p_owner AND NOT is_private)
     AND NOT EXISTS (SELECT 1 FROM user_bans WHERE profile_id = p_owner AND unbanned_at IS NULL);
$$;

-- The one visibility rule for a post and everything hanging off it
-- (media, tags). Authors see their own posts in any state; admins see all.
CREATE FUNCTION can_see_post(p_post_id UUID) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM posts p
    WHERE p.post_id = p_post_id
      AND (
        p.profile_id = auth.uid()
        OR is_admin(auth.uid())
        OR (
          p.status = 'published' AND p.archived_at IS NULL
          AND CASE WHEN auth.uid() IS NULL THEN is_public_profile(p.profile_id)
                   ELSE can_view_profile(auth.uid(), p.profile_id) END
        )
      )
  );
$$;

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_skater_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE csam_holds ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_cleanup_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "posts_select" ON posts FOR SELECT TO anon, authenticated
  USING (can_see_post(post_id));
CREATE POLICY "post_media_select" ON post_media FOR SELECT TO anon, authenticated
  USING (can_see_post(post_id));
-- Pending tags are visible only to the poster and the tagged skater.
CREATE POLICY "post_skater_tags_select" ON post_skater_tags FOR SELECT TO anon, authenticated
  USING (
    can_see_post(post_id)
    AND (
      status = 'accepted'
      OR tagged_profile_id = auth.uid()
      OR EXISTS (SELECT 1 FROM posts p WHERE p.post_id = post_skater_tags.post_id AND p.profile_id = auth.uid())
    )
  );
CREATE POLICY "post_likes_select_own" ON post_likes FOR SELECT TO authenticated
  USING (profile_id = auth.uid());
CREATE POLICY "post_saves_select_own" ON post_saves FOR SELECT TO authenticated
  USING (profile_id = auth.uid());
CREATE POLICY "post_reports_select_own" ON post_reports FOR SELECT TO authenticated
  USING (profile_id = auth.uid());
-- moderation_events, csam_holds, media_cleanup_queue: no policies -- admin
-- RPCs and the service role only.

-- ── counters ────────────────────────────────────────────────────────────
CREATE FUNCTION _sync_post_like_count() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_post UUID := COALESCE(NEW.post_id, OLD.post_id);
BEGIN
  UPDATE posts SET like_count = (SELECT count(*) FROM post_likes WHERE post_id = v_post)
  WHERE post_id = v_post;
  RETURN NULL;
END;
$$;
CREATE TRIGGER post_likes_count AFTER INSERT OR DELETE ON post_likes
  FOR EACH ROW EXECUTE FUNCTION _sync_post_like_count();

-- A single child-safety report hides the post at once and makes it urgent;
-- otherwise 3 open reports hide it (same threshold as entity photos).
CREATE FUNCTION _sync_post_report_count() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_post UUID := COALESCE(NEW.post_id, OLD.post_id); v_count INTEGER; v_csa BOOLEAN;
BEGIN
  SELECT count(*), bool_or(reason = 'child_sexual_abuse') INTO v_count, v_csa
  FROM post_reports WHERE post_id = v_post AND resolved_at IS NULL;

  UPDATE posts SET report_count = v_count WHERE post_id = v_post;

  IF COALESCE(v_csa, false) THEN
    UPDATE posts SET status = 'held', hold_reason = 'reported_child_sexual_abuse', is_urgent = true
    WHERE post_id = v_post AND status = 'published';
  ELSIF v_count >= 3 THEN
    UPDATE posts SET status = 'held', hold_reason = 'reports'
    WHERE post_id = v_post AND status = 'published';
  END IF;
  RETURN NULL;
END;
$$;
CREATE TRIGGER post_reports_count AFTER INSERT OR UPDATE OR DELETE ON post_reports
  FOR EACH ROW EXECUTE FUNCTION _sync_post_report_count();

-- ── storage buckets ─────────────────────────────────────────────────────
-- Clients re-encode photos to JPEG (which also strips EXIF/GPS); the
-- moderation function strips any metadata segment that survives.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES
  ('post-quarantine', 'post-quarantine', false, 15728640, ARRAY['image/jpeg']),
  ('post-media', 'post-media', true, 15728640, ARRAY['image/jpeg']),
  ('moderation-evidence', 'moderation-evidence', false, NULL, NULL);

-- Uploads land at <uid>/<post_id>/<position>.jpg and must match a media row
-- of the caller's own post that's still uploading.
CREATE POLICY "post_quarantine_owner_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'post-quarantine'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
    AND EXISTS (
      SELECT 1 FROM public.post_media m JOIN public.posts p ON p.post_id = m.post_id
      WHERE m.storage_path = objects.name AND p.profile_id = auth.uid() AND p.status = 'uploading'
    )
  );
-- Admins review held media straight from quarantine via signed URLs.
CREATE POLICY "post_quarantine_admin_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'post-quarantine' AND public.is_admin(auth.uid()));
CREATE POLICY "post_media_public_read" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'post-media');
-- post-media writes and moderation-evidence: service role only.

-- ── client RPCs ─────────────────────────────────────────────────────────
-- p_media_count: photos 1-10, video exactly 1. Returns the post id; media
-- rows carry the exact storage paths the client must upload to.
CREATE FUNCTION create_post_draft(
  p_media_type TEXT,
  p_media_count INTEGER,
  p_caption TEXT,
  p_spot_id UUID,
  p_osm_spot_place_id TEXT,
  p_store_id UUID,
  p_osm_store_place_id TEXT,
  p_tagged_profile_ids UUID[]
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_post_id UUID;
  v_created_at TIMESTAMPTZ;
  v_recent INTEGER;
  v_tag UUID;
  i INTEGER;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;
  IF is_banned(v_uid) THEN
    RAISE EXCEPTION 'BANNED';
  END IF;
  IF p_media_type NOT IN ('photo', 'video') THEN
    RAISE EXCEPTION 'INVALID_MEDIA_TYPE';
  END IF;
  IF (p_media_type = 'video' AND p_media_count <> 1)
     OR (p_media_type = 'photo' AND (p_media_count < 1 OR p_media_count > 10)) THEN
    RAISE EXCEPTION 'INVALID_MEDIA_COUNT';
  END IF;
  IF COALESCE(array_length(p_tagged_profile_ids, 1), 0) > 10 THEN
    RAISE EXCEPTION 'TOO_MANY_TAGS';
  END IF;

  -- New accounts (under 7 days old) get at most 3 posts per rolling 24h.
  SELECT created_at INTO v_created_at FROM profiles WHERE profile_id = v_uid;
  IF v_created_at > now() - INTERVAL '7 days' THEN
    SELECT count(*) INTO v_recent FROM posts
    WHERE profile_id = v_uid AND created_at > now() - INTERVAL '24 hours';
    IF v_recent >= 3 THEN
      RAISE EXCEPTION 'RATE_LIMITED';
    END IF;
  END IF;

  INSERT INTO posts (profile_id, media_type, caption, spot_id, osm_spot_place_id, store_id, osm_store_place_id)
  VALUES (v_uid, p_media_type, NULLIF(trim(p_caption), ''), p_spot_id, p_osm_spot_place_id, p_store_id, p_osm_store_place_id)
  RETURNING post_id INTO v_post_id;

  FOR i IN 0 .. p_media_count - 1 LOOP
    INSERT INTO post_media (post_id, position, media_type, storage_path)
    VALUES (
      v_post_id, i, p_media_type,
      CASE WHEN p_media_type = 'photo' THEN v_uid || '/' || v_post_id || '/' || i || '.jpg' END
    );
  END LOOP;

  FOREACH v_tag IN ARRAY COALESCE(p_tagged_profile_ids, '{}') LOOP
    IF v_tag = v_uid THEN
      RAISE EXCEPTION 'CANNOT_TAG_SELF';
    END IF;
    IF is_blocked_between(v_uid, v_tag) OR NOT can_view_profile(v_uid, v_tag) THEN
      RAISE EXCEPTION 'CANNOT_TAG_PROFILE';
    END IF;
    INSERT INTO post_skater_tags (post_id, tagged_profile_id) VALUES (v_post_id, v_tag)
    ON CONFLICT DO NOTHING;
  END LOOP;

  RETURN v_post_id;
END;
$$;

-- Called by the client once its uploads finish; the sweeper below does the
-- same for uploads that finished while the app was suspended or killed.
CREATE FUNCTION submit_post(p_post_id UUID) RETURNS TEXT
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
  ) THEN
    RAISE EXCEPTION 'UPLOAD_INCOMPLETE';
  END IF;

  UPDATE posts SET status = 'pending_moderation' WHERE post_id = p_post_id;
  RETURN 'pending_moderation';
END;
$$;

CREATE FUNCTION update_post(
  p_post_id UUID,
  p_caption TEXT,
  p_spot_id UUID,
  p_osm_spot_place_id TEXT,
  p_store_id UUID,
  p_osm_store_place_id TEXT,
  p_tagged_profile_ids UUID[]
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_post posts%ROWTYPE;
  v_caption TEXT := NULLIF(trim(p_caption), '');
  v_tag UUID;
  v_username TEXT;
BEGIN
  SELECT * INTO v_post FROM posts WHERE post_id = p_post_id AND profile_id = v_uid;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'POST_NOT_FOUND';
  END IF;
  IF v_post.status IN ('removed', 'rejected', 'uploading') THEN
    RAISE EXCEPTION 'POST_NOT_EDITABLE';
  END IF;
  IF COALESCE(array_length(p_tagged_profile_ids, 1), 0) > 10 THEN
    RAISE EXCEPTION 'TOO_MANY_TAGS';
  END IF;

  UPDATE posts SET
    spot_id = p_spot_id, osm_spot_place_id = p_osm_spot_place_id,
    store_id = p_store_id, osm_store_place_id = p_osm_store_place_id,
    edited_at = now()
  WHERE post_id = p_post_id;

  -- Captions always go back through moderation. A rejected-caption post
  -- re-enters the queue (text only -- its media already passed); a live
  -- post keeps its old caption until the new one passes.
  IF v_caption IS DISTINCT FROM v_post.caption THEN
    IF v_post.status = 'caption_rejected' THEN
      UPDATE posts SET caption = v_caption, status = 'pending_moderation', moderation_attempts = 0
      WHERE post_id = p_post_id;
    ELSIF v_post.status = 'published' AND v_caption IS NULL THEN
      UPDATE posts SET caption = NULL, pending_caption = NULL WHERE post_id = p_post_id;
    ELSIF v_post.status = 'published' THEN
      UPDATE posts SET pending_caption = v_caption WHERE post_id = p_post_id;
    ELSE
      UPDATE posts SET caption = v_caption WHERE post_id = p_post_id;
    END IF;
  END IF;

  -- Tags: drop the ones removed, add new ones as pending.
  DELETE FROM post_skater_tags
  WHERE post_id = p_post_id AND tagged_profile_id <> ALL (COALESCE(p_tagged_profile_ids, '{}'));
  DELETE FROM notifications
  WHERE source = 'post_tag' AND dedup_key = p_post_id::TEXT
    AND profile_id <> ALL (COALESCE(p_tagged_profile_ids, '{}'));

  SELECT username INTO v_username FROM profiles WHERE profile_id = v_uid;
  FOREACH v_tag IN ARRAY COALESCE(p_tagged_profile_ids, '{}') LOOP
    IF v_tag = v_uid THEN
      RAISE EXCEPTION 'CANNOT_TAG_SELF';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM post_skater_tags WHERE post_id = p_post_id AND tagged_profile_id = v_tag) THEN
      IF is_blocked_between(v_uid, v_tag) OR NOT can_view_profile(v_uid, v_tag) THEN
        RAISE EXCEPTION 'CANNOT_TAG_PROFILE';
      END IF;
      INSERT INTO post_skater_tags (post_id, tagged_profile_id) VALUES (p_post_id, v_tag);
      -- Unpublished posts notify their tags on publish instead.
      IF v_post.status = 'published' THEN
        PERFORM create_notification(v_tag, 'post_tag', p_post_id::TEXT,
          '@' || upper(v_username) || ' TAGGED YOU IN A POST', 'info', 'TAGGED IN A POST', v_uid);
      END IF;
    END IF;
  END LOOP;
END;
$$;

CREATE FUNCTION pin_post(p_post_id UUID, p_pinned BOOLEAN) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM posts WHERE post_id = p_post_id AND profile_id = auth.uid()
                 AND status = 'published' AND archived_at IS NULL) THEN
    RAISE EXCEPTION 'POST_NOT_FOUND';
  END IF;
  IF p_pinned THEN
    IF (SELECT count(*) FROM posts WHERE profile_id = auth.uid() AND pinned_at IS NOT NULL
        AND post_id <> p_post_id) >= 3 THEN
      RAISE EXCEPTION 'PIN_LIMIT';
    END IF;
    UPDATE posts SET pinned_at = COALESCE(pinned_at, now()) WHERE post_id = p_post_id;
  ELSE
    UPDATE posts SET pinned_at = NULL WHERE post_id = p_post_id;
  END IF;
END;
$$;

-- Archiving also unpins. Archived posts are listed only to their author.
CREATE FUNCTION archive_post(p_post_id UUID, p_archived BOOLEAN) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE posts SET
    archived_at = CASE WHEN p_archived THEN COALESCE(archived_at, now()) ELSE NULL END,
    pinned_at = CASE WHEN p_archived THEN NULL ELSE pinned_at END
  WHERE post_id = p_post_id AND profile_id = auth.uid();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'POST_NOT_FOUND';
  END IF;
END;
$$;

CREATE FUNCTION delete_post(p_post_id UUID) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM posts WHERE post_id = p_post_id AND profile_id = auth.uid()) THEN
    RAISE EXCEPTION 'POST_NOT_FOUND';
  END IF;
  -- Files are queued for removal by the post_media delete trigger
  -- (20261104170300_media_lifecycle.sql); CSAM evidence is never queued.
  DELETE FROM notifications WHERE source = 'post_tag' AND dedup_key = p_post_id::TEXT;
  DELETE FROM posts WHERE post_id = p_post_id;
END;
$$;

CREATE FUNCTION toggle_post_like(p_post_id UUID) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM posts WHERE post_id = p_post_id AND status = 'published')
     OR NOT can_see_post(p_post_id) THEN
    RAISE EXCEPTION 'POST_NOT_FOUND';
  END IF;
  DELETE FROM post_likes WHERE post_id = p_post_id AND profile_id = auth.uid();
  IF FOUND THEN
    RETURN false;
  END IF;
  INSERT INTO post_likes (post_id, profile_id) VALUES (p_post_id, auth.uid());
  RETURN true;
END;
$$;

CREATE FUNCTION toggle_post_save(p_post_id UUID) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM posts WHERE post_id = p_post_id AND status = 'published')
     OR NOT can_see_post(p_post_id) THEN
    RAISE EXCEPTION 'POST_NOT_FOUND';
  END IF;
  DELETE FROM post_saves WHERE post_id = p_post_id AND profile_id = auth.uid();
  IF FOUND THEN
    RETURN false;
  END IF;
  INSERT INTO post_saves (post_id, profile_id) VALUES (p_post_id, auth.uid());
  RETURN true;
END;
$$;

CREATE FUNCTION report_post(p_post_id UUID, p_reason TEXT) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;
  IF NOT can_see_post(p_post_id) THEN
    RAISE EXCEPTION 'POST_NOT_FOUND';
  END IF;
  INSERT INTO post_reports (post_id, profile_id, reason) VALUES (p_post_id, auth.uid(), p_reason)
  ON CONFLICT (post_id, profile_id) DO NOTHING;
END;
$$;

-- The tagged skater accepts (tag appears on the post and in their Tagged
-- in tab) or declines (tag deleted).
CREATE FUNCTION respond_to_post_tag(p_post_id UUID, p_accept BOOLEAN) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_accept THEN
    UPDATE post_skater_tags SET status = 'accepted', responded_at = now()
    WHERE post_id = p_post_id AND tagged_profile_id = auth.uid() AND status = 'pending';
  ELSE
    DELETE FROM post_skater_tags WHERE post_id = p_post_id AND tagged_profile_id = auth.uid();
  END IF;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'TAG_NOT_FOUND';
  END IF;
  UPDATE notifications SET read_at = now()
  WHERE profile_id = auth.uid() AND source = 'post_tag' AND dedup_key = p_post_id::TEXT AND read_at IS NULL;
END;
$$;

-- An accepted tag can be removed by the tagged skater at any time.
CREATE FUNCTION remove_my_post_tag(p_post_id UUID) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM post_skater_tags WHERE post_id = p_post_id AND tagged_profile_id = auth.uid();
  DELETE FROM notifications WHERE profile_id = auth.uid() AND source = 'post_tag' AND dedup_key = p_post_id::TEXT;
END;
$$;

-- ── blocks remove tags ──────────────────────────────────────────────────
-- A block (either direction) deletes every tag between the pair, pending
-- or accepted, plus the tag prompts in both inboxes.
CREATE FUNCTION _remove_tags_on_block() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM notifications n USING post_skater_tags t, posts p
  WHERE t.post_id = p.post_id AND n.source = 'post_tag' AND n.dedup_key = p.post_id::TEXT
    AND n.profile_id = t.tagged_profile_id
    AND ((p.profile_id = NEW.blocker_id AND t.tagged_profile_id = NEW.blocked_id)
      OR (p.profile_id = NEW.blocked_id AND t.tagged_profile_id = NEW.blocker_id));

  DELETE FROM post_skater_tags t USING posts p
  WHERE t.post_id = p.post_id
    AND ((p.profile_id = NEW.blocker_id AND t.tagged_profile_id = NEW.blocked_id)
      OR (p.profile_id = NEW.blocked_id AND t.tagged_profile_id = NEW.blocker_id));
  RETURN NULL;
END;
$$;
CREATE TRIGGER profile_blocks_remove_post_tags AFTER INSERT ON profile_blocks
  FOR EACH ROW EXECUTE FUNCTION _remove_tags_on_block();

-- ── moderation (service role only) ──────────────────────────────────────
-- Shared secret between pg_net and the moderate-post edge function, kept in
-- Vault. The function reads it back via _moderation_webhook_secret().
SELECT vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'moderation_webhook_secret');
SELECT vault.create_secret('https://uhsyjdlgnfaezcxrkkrx.supabase.co', 'project_url');

CREATE FUNCTION _moderation_webhook_secret() RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'moderation_webhook_secret';
$$;

CREATE FUNCTION _request_moderation(p_post_id UUID) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_url TEXT;
BEGIN
  SELECT decrypted_secret INTO v_url FROM vault.decrypted_secrets WHERE name = 'project_url';
  UPDATE posts SET moderation_attempts = moderation_attempts + 1, moderation_requested_at = now()
  WHERE post_id = p_post_id;
  PERFORM net.http_post(
    url := v_url || '/functions/v1/moderate-post',
    body := jsonb_build_object('post_id', p_post_id),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-moderation-secret', _moderation_webhook_secret()
    ),
    timeout_milliseconds := 5000
  );
END;
$$;

CREATE FUNCTION _on_post_needs_moderation() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (NEW.status = 'pending_moderation' AND OLD.status IS DISTINCT FROM 'pending_moderation')
     OR (NEW.status = 'published' AND NEW.pending_caption IS NOT NULL
         AND NEW.pending_caption IS DISTINCT FROM OLD.pending_caption) THEN
    PERFORM _request_moderation(NEW.post_id);
  END IF;
  RETURN NULL;
END;
$$;
CREATE TRIGGER posts_request_moderation AFTER UPDATE OF status, pending_caption ON posts
  FOR EACH ROW EXECUTE FUNCTION _on_post_needs_moderation();

CREATE FUNCTION moderation_publish_post(p_post_id UUID) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_post posts%ROWTYPE; v_username TEXT; v_tag RECORD;
BEGIN
  UPDATE posts SET status = 'published', published_at = COALESCE(published_at, now()),
    hold_reason = NULL, is_urgent = false
  WHERE post_id = p_post_id AND status IN ('pending_moderation', 'held')
  RETURNING * INTO v_post;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT username INTO v_username FROM profiles WHERE profile_id = v_post.profile_id;
  FOR v_tag IN SELECT tagged_profile_id FROM post_skater_tags WHERE post_id = p_post_id AND status = 'pending' LOOP
    PERFORM create_notification(v_tag.tagged_profile_id, 'post_tag', p_post_id::TEXT,
      '@' || upper(v_username) || ' TAGGED YOU IN A POST', 'info', 'TAGGED IN A POST', v_post.profile_id);
  END LOOP;
END;
$$;

CREATE FUNCTION moderation_hold_post(p_post_id UUID, p_reason TEXT, p_urgent BOOLEAN) RETURNS VOID
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE posts SET status = 'held', hold_reason = p_reason, is_urgent = is_urgent OR p_urgent
  WHERE post_id = p_post_id AND status IN ('pending_moderation', 'published');
$$;

-- A failing caption on a new post blocks it until edited. The rejection is
-- logged as a moderation_events row (by the edge function), which the admin
-- queue lists until reviewed -- so it's both blocked and flagged.
CREATE FUNCTION moderation_reject_caption(p_post_id UUID) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_post posts%ROWTYPE;
BEGIN
  SELECT * INTO v_post FROM posts WHERE post_id = p_post_id;
  IF v_post.status = 'published' THEN
    -- Live post: the edit is dropped, the old caption stays.
    UPDATE posts SET pending_caption = NULL WHERE post_id = p_post_id;
    PERFORM create_notification(v_post.profile_id, 'post_caption_rejected', p_post_id::TEXT || ':' || now()::TEXT,
      'YOUR CAPTION EDIT WASN''T SAVED. IT BREAKS OUR COMMUNITY GUIDELINES.', 'danger', 'CAPTION NOT SAVED', NULL);
  ELSIF v_post.status = 'pending_moderation' THEN
    UPDATE posts SET status = 'caption_rejected' WHERE post_id = p_post_id;
    PERFORM create_notification(v_post.profile_id, 'post_caption_rejected', p_post_id::TEXT,
      'YOUR POST WASN''T PUBLISHED. EDIT YOUR CAPTION TO POST IT.', 'danger', 'EDIT YOUR CAPTION', NULL);
  END IF;
END;
$$;

CREATE FUNCTION moderation_apply_caption(p_post_id UUID) RETURNS VOID
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE posts SET caption = pending_caption, pending_caption = NULL
  WHERE post_id = p_post_id AND pending_caption IS NOT NULL;
$$;

-- Bans the author, removes the post and opens the legal hold + NCA task.
-- Called by moderate-post's admin "csam" action after it has moved the
-- files into moderation-evidence.
CREATE FUNCTION moderation_record_csam_hold(p_post_id UUID, p_admin_id UUID, p_evidence_paths TEXT[]) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_post posts%ROWTYPE; v_hold UUID; v_username TEXT;
BEGIN
  IF NOT is_admin(p_admin_id) THEN
    RAISE EXCEPTION 'NOT_ADMIN';
  END IF;
  SELECT * INTO v_post FROM posts WHERE post_id = p_post_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'POST_NOT_FOUND';
  END IF;
  SELECT username INTO v_username FROM profiles WHERE profile_id = v_post.profile_id;

  UPDATE posts SET status = 'removed', hold_reason = 'csam', pinned_at = NULL WHERE post_id = p_post_id;
  UPDATE post_media SET bucket = 'moderation-evidence', media_url = NULL WHERE post_id = p_post_id;
  UPDATE post_reports SET resolved_at = now(), resolved_by = p_admin_id, resolution = 'csam'
  WHERE post_id = p_post_id AND resolved_at IS NULL;

  IF NOT EXISTS (SELECT 1 FROM user_bans WHERE profile_id = v_post.profile_id AND unbanned_at IS NULL) THEN
    INSERT INTO user_bans (profile_id, reason, banned_by) VALUES (v_post.profile_id, 'csam', p_admin_id);
  END IF;

  INSERT INTO csam_holds (post_id, profile_id, username, evidence_paths, flagged_by)
  VALUES (p_post_id, v_post.profile_id, v_username, p_evidence_paths, p_admin_id)
  RETURNING hold_id INTO v_hold;

  INSERT INTO admin_audit_log (admin_id, action, target_type, target_id, notes)
  VALUES (p_admin_id, 'post_csam_hold', 'post', p_post_id::TEXT, v_hold::TEXT);
  RETURN v_hold;
END;
$$;

-- Re-requests stuck moderation and promotes uploads that finished in the
-- background (app suspended or killed before it could call submit_post).
-- Abandoned drafts (still uploading after 24h) are deleted.
CREATE FUNCTION _sweep_posts() RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_post RECORD;
BEGIN
  UPDATE posts p SET status = 'pending_moderation'
  WHERE p.status = 'uploading' AND p.media_type = 'photo'
    AND NOT EXISTS (
      SELECT 1 FROM post_media m WHERE m.post_id = p.post_id
        AND NOT EXISTS (SELECT 1 FROM storage.objects o WHERE o.bucket_id = 'post-quarantine' AND o.name = m.storage_path)
    );

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

SELECT cron.schedule('posts-moderation-sweeper', '*/2 * * * *', 'SELECT public._sweep_posts()');

-- ── admin RPCs ──────────────────────────────────────────────────────────
-- Held posts, urgent first. Media paths are returned so the client can mint
-- signed URLs (quarantine) or use public ones (post-media).
CREATE FUNCTION admin_list_held_posts()
RETURNS TABLE(
  post_id UUID, profile_id UUID, username TEXT, media_type TEXT, caption TEXT,
  hold_reason TEXT, is_urgent BOOLEAN, created_at TIMESTAMPTZ, report_count INTEGER,
  report_reasons TEXT[], media JSONB, latest_scores JSONB
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'NOT_ADMIN';
  END IF;
  RETURN QUERY
    SELECT p.post_id, p.profile_id, pr.username, p.media_type, p.caption,
      p.hold_reason, p.is_urgent, p.created_at, p.report_count,
      ARRAY(SELECT DISTINCT r.reason FROM post_reports r WHERE r.post_id = p.post_id AND r.resolved_at IS NULL),
      (SELECT jsonb_agg(jsonb_build_object('media_id', m.media_id, 'position', m.position, 'bucket', m.bucket,
          'storage_path', m.storage_path, 'media_url', m.media_url, 'stream_uid', m.stream_uid) ORDER BY m.position)
       FROM post_media m WHERE m.post_id = p.post_id),
      (SELECT jsonb_agg(jsonb_build_object('kind', e.kind, 'decision', e.decision, 'reason', e.reason) ORDER BY e.created_at DESC)
       FROM moderation_events e WHERE e.post_id = p.post_id AND e.decision IN ('hold', 'reject'))
    FROM posts p
    JOIN profiles pr ON pr.profile_id = p.profile_id
    WHERE p.status = 'held'
    ORDER BY p.is_urgent DESC, p.created_at ASC;
END;
$$;

CREATE FUNCTION admin_list_caption_flags()
RETURNS TABLE(event_id UUID, post_id UUID, profile_id UUID, username TEXT, caption_text TEXT, reason TEXT, created_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'NOT_ADMIN';
  END IF;
  RETURN QUERY
    SELECT e.event_id, e.post_id, e.profile_id, pr.username, e.scores->>'text', e.reason, e.created_at
    FROM moderation_events e
    LEFT JOIN profiles pr ON pr.profile_id = e.profile_id
    WHERE e.kind = 'caption' AND e.decision = 'reject' AND e.reviewed_at IS NULL
    ORDER BY e.created_at ASC;
END;
$$;

CREATE FUNCTION admin_review_caption_flag(p_event_id UUID) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'NOT_ADMIN';
  END IF;
  UPDATE moderation_events SET reviewed_at = now(), reviewed_by = auth.uid() WHERE event_id = p_event_id;
END;
$$;

CREATE FUNCTION admin_remove_post(p_post_id UUID, p_reason TEXT) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_owner UUID;
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'NOT_ADMIN';
  END IF;
  UPDATE posts SET status = 'removed', hold_reason = p_reason, pinned_at = NULL
  WHERE post_id = p_post_id AND status <> 'removed'
  RETURNING profile_id INTO v_owner;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'POST_NOT_FOUND';
  END IF;

  UPDATE post_reports SET resolved_at = now(), resolved_by = auth.uid(), resolution = 'content_removed'
  WHERE post_id = p_post_id AND resolved_at IS NULL;
  INSERT INTO media_cleanup_queue (bucket, path)
  SELECT bucket, storage_path FROM post_media WHERE post_id = p_post_id AND storage_path IS NOT NULL;
  UPDATE post_media SET media_url = NULL WHERE post_id = p_post_id;
  DELETE FROM notifications WHERE source = 'post_tag' AND dedup_key = p_post_id::TEXT;

  PERFORM create_notification(v_owner, 'post_removed', p_post_id::TEXT,
    'YOUR POST WAS REMOVED FOR BREAKING OUR COMMUNITY GUIDELINES' ||
      CASE WHEN p_reason IS NOT NULL THEN ': ' || upper(p_reason) ELSE '' END || '.',
    'danger', 'POST REMOVED', NULL);

  INSERT INTO admin_audit_log (admin_id, action, target_type, target_id, notes)
  VALUES (auth.uid(), 'post_removed', 'post', p_post_id::TEXT, p_reason);
END;
$$;

CREATE FUNCTION admin_list_csam_holds()
RETURNS TABLE(hold_id UUID, post_id UUID, profile_id UUID, username TEXT, nca_report_status TEXT,
              nca_reference TEXT, created_at TIMESTAMPTZ, filed_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'NOT_ADMIN';
  END IF;
  RETURN QUERY
    SELECT h.hold_id, h.post_id, h.profile_id, h.username, h.nca_report_status, h.nca_reference, h.created_at, h.filed_at
    FROM csam_holds h
    ORDER BY (h.nca_report_status = 'to_file') DESC, h.created_at ASC;
END;
$$;

CREATE FUNCTION admin_mark_csam_hold_filed(p_hold_id UUID, p_reference TEXT) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'NOT_ADMIN';
  END IF;
  IF length(trim(COALESCE(p_reference, ''))) = 0 THEN
    RAISE EXCEPTION 'REFERENCE_REQUIRED';
  END IF;
  UPDATE csam_holds SET nca_report_status = 'filed', nca_reference = trim(p_reference),
    filed_at = now(), filed_by = auth.uid()
  WHERE hold_id = p_hold_id;
  INSERT INTO admin_audit_log (admin_id, action, target_type, target_id, notes)
  VALUES (auth.uid(), 'csam_hold_filed', 'csam_hold', p_hold_id::TEXT, trim(p_reference));
END;
$$;

-- ── function access ─────────────────────────────────────────────────────
-- Same three tiers as 20261012000000_lock_down_function_access.sql.
DO $$
DECLARE fn REGPROCEDURE;
BEGIN
  -- Internal / service role only.
  FOREACH fn IN ARRAY ARRAY[
    '_post_media_guard()', '_sync_post_like_count()', '_sync_post_report_count()',
    '_remove_tags_on_block()', '_moderation_webhook_secret()', '_request_moderation(uuid)',
    '_on_post_needs_moderation()', '_sweep_posts()',
    'moderation_publish_post(uuid)', 'moderation_hold_post(uuid,text,boolean)',
    'moderation_reject_caption(uuid)', 'moderation_apply_caption(uuid)',
    'moderation_record_csam_hold(uuid,uuid,text[])'
  ]::REGPROCEDURE[] LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn);
  END LOOP;

  -- Signed-in clients.
  FOREACH fn IN ARRAY ARRAY[
    'create_post_draft(text,integer,text,uuid,text,uuid,text,uuid[])', 'submit_post(uuid)',
    'update_post(uuid,text,uuid,text,uuid,text,uuid[])', 'pin_post(uuid,boolean)',
    'archive_post(uuid,boolean)', 'delete_post(uuid)', 'toggle_post_like(uuid)',
    'toggle_post_save(uuid)', 'report_post(uuid,text)', 'respond_to_post_tag(uuid,boolean)',
    'remove_my_post_tag(uuid)', 'admin_list_held_posts()', 'admin_list_caption_flags()',
    'admin_review_caption_flag(uuid)', 'admin_remove_post(uuid,text)', 'admin_list_csam_holds()',
    'admin_mark_csam_hold_filed(uuid,text)'
  ]::REGPROCEDURE[] LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', fn);
  END LOOP;
END;
$$;

-- Used inside RLS policies, so whoever reads posts (including anon) needs them.
GRANT EXECUTE ON FUNCTION is_public_profile(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION can_see_post(uuid) TO anon, authenticated;
