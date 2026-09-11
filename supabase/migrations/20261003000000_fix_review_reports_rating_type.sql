-- Fixes admin_list_review_reports() failing for *every* reported review,
-- not just this one: it declared `rating INTEGER` in its RETURNS TABLE, but
-- spot_reviews.rating/store_reviews.rating are both numeric(2,1) (half-star
-- ratings). RETURN QUERY requires the query's column types to structurally
-- match the declared OUT types -- unlike a plain SELECT, it does not
-- silently coerce numeric to integer -- so this failed outright with
-- "structure of query does not match function result type" the moment a
-- review report queue was queried at all (confirmed by reproducing the
-- exact error before writing this fix, impersonating an admin via a local
-- request.jwt.claim.sub override). admin_list_photo_reports has no such
-- column and was unaffected.

DROP FUNCTION admin_list_review_reports();

CREATE FUNCTION admin_list_review_reports()
RETURNS TABLE(
  review_id UUID,
  entity_kind TEXT,
  heading TEXT,
  comment TEXT,
  rating NUMERIC,
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
