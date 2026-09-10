-- Constrain photo report reasons to a fixed, filterable set of codes so the
-- future admin section can filter/prioritize reports by reason. Reporting a
-- photo now always requires picking one of these from the UI (see
-- lib/shared/types.ts PHOTO_REPORT_REASONS, which must stay in sync with this
-- constraint).

ALTER TABLE spot_photo_reports
  ADD CONSTRAINT spot_photo_reports_reason_check
  CHECK (reason IN ('nsfw', 'outdated', 'harassment', 'consent', 'spam', 'other'));
ALTER TABLE spot_photo_reports ALTER COLUMN reason SET NOT NULL;

ALTER TABLE store_photo_reports
  ADD CONSTRAINT store_photo_reports_reason_check
  CHECK (reason IN ('nsfw', 'outdated', 'harassment', 'consent', 'spam', 'other'));
ALTER TABLE store_photo_reports ALTER COLUMN reason SET NOT NULL;
