-- Admin panel, Phase 2 (ADMIN_PANEL_PLAN.md): reports queue for photos and
-- reviews (spots + stores). report_count has been tracked on all four
-- report tables since 20260908113120_entity_photo_interactions.sql /
-- 20260909093922_review_reports.sql, but nothing acts on it yet.

-- Resolution trail on all four report tables.
ALTER TABLE spot_photo_reports
  ADD COLUMN resolved_at TIMESTAMPTZ,
  ADD COLUMN resolved_by UUID REFERENCES profiles(profile_id),
  ADD COLUMN resolution TEXT CHECK (resolution IN ('dismissed', 'content_removed'));
ALTER TABLE store_photo_reports
  ADD COLUMN resolved_at TIMESTAMPTZ,
  ADD COLUMN resolved_by UUID REFERENCES profiles(profile_id),
  ADD COLUMN resolution TEXT CHECK (resolution IN ('dismissed', 'content_removed'));
ALTER TABLE spot_review_reports
  ADD COLUMN resolved_at TIMESTAMPTZ,
  ADD COLUMN resolved_by UUID REFERENCES profiles(profile_id),
  ADD COLUMN resolution TEXT CHECK (resolution IN ('dismissed', 'content_removed'));
ALTER TABLE store_review_reports
  ADD COLUMN resolved_at TIMESTAMPTZ,
  ADD COLUMN resolved_by UUID REFERENCES profiles(profile_id),
  ADD COLUMN resolution TEXT CHECK (resolution IN ('dismissed', 'content_removed'));

-- Admins need to see everyone's reports, not just their own -- the existing
-- "..._select_own" policies (20260908113120 / 20260909093922) stay as-is
-- for the reporting user's own "already reported" check.
CREATE POLICY "spot_photo_reports_select_admin" ON spot_photo_reports
  FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "store_photo_reports_select_admin" ON store_photo_reports
  FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "spot_review_reports_select_admin" ON spot_review_reports
  FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "store_review_reports_select_admin" ON store_review_reports
  FOR SELECT USING (is_admin(auth.uid()));

-- ── Redefine the photo report-count triggers to only count *active*
-- (unresolved) reports, and to also fire on resolution -- otherwise
-- dismissing every report on a hidden photo would never un-hide it, since
-- the original trigger (20260908113114_entity_photos.sql) only fired on
-- INSERT/DELETE and counted every row regardless of resolution state.

CREATE OR REPLACE FUNCTION sync_spot_photo_report_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE target_photo_id UUID; v_count INTEGER;
BEGIN
  target_photo_id := COALESCE(NEW.photo_id, OLD.photo_id);
  SELECT COUNT(*) INTO v_count FROM spot_photo_reports
    WHERE photo_id = target_photo_id AND resolved_at IS NULL;
  UPDATE spot_photos SET report_count = v_count, is_hidden = (v_count >= 3)
    WHERE photo_id = target_photo_id;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS after_spot_photo_report_sync ON spot_photo_reports;
CREATE TRIGGER after_spot_photo_report_sync
  AFTER INSERT OR DELETE OR UPDATE OF resolved_at ON spot_photo_reports
  FOR EACH ROW EXECUTE FUNCTION sync_spot_photo_report_count();

CREATE OR REPLACE FUNCTION sync_store_photo_report_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE target_photo_id UUID; v_count INTEGER;
BEGIN
  target_photo_id := COALESCE(NEW.photo_id, OLD.photo_id);
  SELECT COUNT(*) INTO v_count FROM store_photo_reports
    WHERE photo_id = target_photo_id AND resolved_at IS NULL;
  UPDATE store_photos SET report_count = v_count, is_hidden = (v_count >= 3)
    WHERE photo_id = target_photo_id;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS after_store_photo_report_sync ON store_photo_reports;
CREATE TRIGGER after_store_photo_report_sync
  AFTER INSERT OR DELETE OR UPDATE OF resolved_at ON store_photo_reports
  FOR EACH ROW EXECUTE FUNCTION sync_store_photo_report_count();

-- ── admin_list_photo_reports / admin_list_review_reports ────────────────────
-- Grouped by target (a photo/review with several reports surfaces once, not
-- once per reporter), combining spot+store as one queue since the app
-- treats both uniformly as an "entity." Only unresolved reports count
-- toward the queue -- once every report on a target is resolved it drops
-- out, whether by dismissal or by removing the content.

CREATE FUNCTION admin_list_photo_reports()
RETURNS TABLE(
  photo_id UUID,
  entity_kind TEXT,
  media_url TEXT,
  report_count BIGINT,
  reasons TEXT[],
  oldest_report_at TIMESTAMPTZ
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'NOT_ADMIN';
  END IF;

  RETURN QUERY
    SELECT * FROM (
      SELECT p.photo_id, 'spot'::TEXT AS entity_kind, p.media_url,
             COUNT(r.report_id) AS report_count, array_agg(DISTINCT r.reason) AS reasons,
             MIN(r.created_at) AS oldest_report_at
      FROM spot_photo_reports r
      JOIN spot_photos p ON p.photo_id = r.photo_id
      WHERE r.resolved_at IS NULL
      GROUP BY p.photo_id, p.media_url

      UNION ALL

      SELECT p.photo_id, 'store'::TEXT AS entity_kind, p.media_url,
             COUNT(r.report_id) AS report_count, array_agg(DISTINCT r.reason) AS reasons,
             MIN(r.created_at) AS oldest_report_at
      FROM store_photo_reports r
      JOIN store_photos p ON p.photo_id = r.photo_id
      WHERE r.resolved_at IS NULL
      GROUP BY p.photo_id, p.media_url
    ) combined
    ORDER BY oldest_report_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_list_photo_reports() TO authenticated;

CREATE FUNCTION admin_list_review_reports()
RETURNS TABLE(
  review_id UUID,
  entity_kind TEXT,
  heading TEXT,
  comment TEXT,
  rating INTEGER,
  report_count BIGINT,
  reasons TEXT[],
  oldest_report_at TIMESTAMPTZ
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'NOT_ADMIN';
  END IF;

  RETURN QUERY
    SELECT * FROM (
      SELECT rv.review_id, 'spot'::TEXT AS entity_kind, rv.heading, rv.comment, rv.rating,
             COUNT(r.report_id) AS report_count, array_agg(DISTINCT r.reason) AS reasons,
             MIN(r.created_at) AS oldest_report_at
      FROM spot_review_reports r
      JOIN spot_reviews rv ON rv.review_id = r.review_id
      WHERE r.resolved_at IS NULL
      GROUP BY rv.review_id, rv.heading, rv.comment, rv.rating

      UNION ALL

      SELECT rv.review_id, 'store'::TEXT AS entity_kind, rv.heading, rv.comment, rv.rating,
             COUNT(r.report_id) AS report_count, array_agg(DISTINCT r.reason) AS reasons,
             MIN(r.created_at) AS oldest_report_at
      FROM store_review_reports r
      JOIN store_reviews rv ON rv.review_id = r.review_id
      WHERE r.resolved_at IS NULL
      GROUP BY rv.review_id, rv.heading, rv.comment, rv.rating
    ) combined
    ORDER BY oldest_report_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_list_review_reports() TO authenticated;

-- ── Resolve actions -- split per spot/store, matching how report_spot_photo/
-- report_store_photo and delete_spot_photo/delete_store_photo are already
-- split rather than parameterized. "content_removed" deletes the row
-- outright (cascades to its report rows via ON DELETE CASCADE); "dismissed"
-- marks the active reports resolved instead, which the trigger above
-- reacts to for photos.

CREATE FUNCTION admin_resolve_spot_photo_report(p_photo_id UUID, p_resolution TEXT) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'NOT_ADMIN';
  END IF;
  IF p_resolution NOT IN ('dismissed', 'content_removed') THEN
    RAISE EXCEPTION 'INVALID_RESOLUTION';
  END IF;

  IF p_resolution = 'content_removed' THEN
    DELETE FROM spot_photos WHERE photo_id = p_photo_id;
  ELSE
    UPDATE spot_photo_reports SET resolved_at = now(), resolved_by = auth.uid(), resolution = 'dismissed'
    WHERE photo_id = p_photo_id AND resolved_at IS NULL;
  END IF;

  INSERT INTO admin_audit_log (admin_id, action, target_type, target_id, notes)
  VALUES (auth.uid(), 'report_resolved', 'spot_photo', p_photo_id::TEXT, p_resolution);
END;
$$;

GRANT EXECUTE ON FUNCTION admin_resolve_spot_photo_report(UUID, TEXT) TO authenticated;

CREATE FUNCTION admin_resolve_store_photo_report(p_photo_id UUID, p_resolution TEXT) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'NOT_ADMIN';
  END IF;
  IF p_resolution NOT IN ('dismissed', 'content_removed') THEN
    RAISE EXCEPTION 'INVALID_RESOLUTION';
  END IF;

  IF p_resolution = 'content_removed' THEN
    DELETE FROM store_photos WHERE photo_id = p_photo_id;
  ELSE
    UPDATE store_photo_reports SET resolved_at = now(), resolved_by = auth.uid(), resolution = 'dismissed'
    WHERE photo_id = p_photo_id AND resolved_at IS NULL;
  END IF;

  INSERT INTO admin_audit_log (admin_id, action, target_type, target_id, notes)
  VALUES (auth.uid(), 'report_resolved', 'store_photo', p_photo_id::TEXT, p_resolution);
END;
$$;

GRANT EXECUTE ON FUNCTION admin_resolve_store_photo_report(UUID, TEXT) TO authenticated;

CREATE FUNCTION admin_resolve_spot_review_report(p_review_id UUID, p_resolution TEXT) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'NOT_ADMIN';
  END IF;
  IF p_resolution NOT IN ('dismissed', 'content_removed') THEN
    RAISE EXCEPTION 'INVALID_RESOLUTION';
  END IF;

  IF p_resolution = 'content_removed' THEN
    DELETE FROM spot_reviews WHERE review_id = p_review_id;
  ELSE
    UPDATE spot_review_reports SET resolved_at = now(), resolved_by = auth.uid(), resolution = 'dismissed'
    WHERE review_id = p_review_id AND resolved_at IS NULL;
  END IF;

  INSERT INTO admin_audit_log (admin_id, action, target_type, target_id, notes)
  VALUES (auth.uid(), 'report_resolved', 'spot_review', p_review_id::TEXT, p_resolution);
END;
$$;

GRANT EXECUTE ON FUNCTION admin_resolve_spot_review_report(UUID, TEXT) TO authenticated;

CREATE FUNCTION admin_resolve_store_review_report(p_review_id UUID, p_resolution TEXT) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'NOT_ADMIN';
  END IF;
  IF p_resolution NOT IN ('dismissed', 'content_removed') THEN
    RAISE EXCEPTION 'INVALID_RESOLUTION';
  END IF;

  IF p_resolution = 'content_removed' THEN
    DELETE FROM store_reviews WHERE review_id = p_review_id;
  ELSE
    UPDATE store_review_reports SET resolved_at = now(), resolved_by = auth.uid(), resolution = 'dismissed'
    WHERE review_id = p_review_id AND resolved_at IS NULL;
  END IF;

  INSERT INTO admin_audit_log (admin_id, action, target_type, target_id, notes)
  VALUES (auth.uid(), 'report_resolved', 'store_review', p_review_id::TEXT, p_resolution);
END;
$$;

GRANT EXECUTE ON FUNCTION admin_resolve_store_review_report(UUID, TEXT) TO authenticated;
