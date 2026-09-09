-- Reporting for reviews (spot_reviews / store_reviews), mirroring the
-- spot_photo_reports / report_spot_photo pattern from
-- 20260908b_entity_photo_interactions.sql. Unlike photos, reports do not
-- auto-hide the review at any threshold -- report_count is tracked for a
-- future moderation view only; nothing in the reviews feature asks for
-- auto-hide, and text reviews are more opinion-brigadeable than photos.

-- ── Spot reviews ─────────────────────────────────────────────────────────

CREATE TABLE spot_review_reports (
  report_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id  UUID NOT NULL REFERENCES spot_reviews(review_id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(profile_id) ON DELETE CASCADE,
  reason     TEXT NOT NULL CHECK (reason IN ('spam', 'harassment', 'offensive', 'inaccurate', 'other')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (review_id, profile_id)
);
ALTER TABLE spot_review_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "spot_review_reports_select_own" ON spot_review_reports
  FOR SELECT USING (auth.uid() = profile_id);
-- No INSERT policy: writes only via report_spot_review() below.

ALTER TABLE spot_reviews ADD COLUMN report_count INTEGER NOT NULL DEFAULT 0;

CREATE FUNCTION sync_spot_review_report_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE spot_reviews SET report_count =
    (SELECT COUNT(*) FROM spot_review_reports WHERE review_id = COALESCE(NEW.review_id, OLD.review_id))
  WHERE review_id = COALESCE(NEW.review_id, OLD.review_id);
  RETURN NULL;
END;
$$;

CREATE TRIGGER after_spot_review_report_sync
  AFTER INSERT OR DELETE ON spot_review_reports
  FOR EACH ROW EXECUTE FUNCTION sync_spot_review_report_count();

CREATE FUNCTION report_spot_review(p_review_id UUID, p_reason TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  INSERT INTO spot_review_reports (review_id, profile_id, reason)
    VALUES (p_review_id, auth.uid(), p_reason)
  ON CONFLICT (review_id, profile_id) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION report_spot_review(UUID, TEXT) TO authenticated;

-- ── Store reviews ────────────────────────────────────────────────────────

CREATE TABLE store_review_reports (
  report_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id  UUID NOT NULL REFERENCES store_reviews(review_id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(profile_id) ON DELETE CASCADE,
  reason     TEXT NOT NULL CHECK (reason IN ('spam', 'harassment', 'offensive', 'inaccurate', 'other')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (review_id, profile_id)
);
ALTER TABLE store_review_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "store_review_reports_select_own" ON store_review_reports
  FOR SELECT USING (auth.uid() = profile_id);

ALTER TABLE store_reviews ADD COLUMN report_count INTEGER NOT NULL DEFAULT 0;

CREATE FUNCTION sync_store_review_report_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE store_reviews SET report_count =
    (SELECT COUNT(*) FROM store_review_reports WHERE review_id = COALESCE(NEW.review_id, OLD.review_id))
  WHERE review_id = COALESCE(NEW.review_id, OLD.review_id);
  RETURN NULL;
END;
$$;

CREATE TRIGGER after_store_review_report_sync
  AFTER INSERT OR DELETE ON store_review_reports
  FOR EACH ROW EXECUTE FUNCTION sync_store_review_report_count();

CREATE FUNCTION report_store_review(p_review_id UUID, p_reason TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  INSERT INTO store_review_reports (review_id, profile_id, reason)
    VALUES (p_review_id, auth.uid(), p_reason)
  ON CONFLICT (review_id, profile_id) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION report_store_review(UUID, TEXT) TO authenticated;
