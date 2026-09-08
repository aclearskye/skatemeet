-- Vote/report/delete write paths for entity photos (spot_photos / store_photos),
-- deferred from 20260908_entity_photos.sql. All writes go through SECURITY DEFINER
-- RPCs — the vote/report tables still carry no client-facing write policies, so
-- this is the only way to change them.
--
-- Casting a vote or a report updates columns that after_spot_photo_cover_sync /
-- after_store_photo_cover_sync (from the prior migration) watches, so the cover
-- photo shown on cards/heroes now actually shifts as photos get voted on or
-- hidden, exactly as designed when that trigger was written.

-- ── Read policies ────────────────────────────────────────────────────────────
-- Votes are public, same as spot_votes/store_votes ("store_votes_read" in
-- 20260513_store_vote_counts.sql: FOR SELECT USING (true)). Reports are not —
-- only the reporting user can see their own report row, so the client can show
-- "already reported" state without exposing who reported what to everyone.

CREATE POLICY "spot_photo_votes_select" ON spot_photo_votes FOR SELECT USING (true);
CREATE POLICY "store_photo_votes_select" ON store_photo_votes FOR SELECT USING (true);

CREATE POLICY "spot_photo_reports_select_own" ON spot_photo_reports
  FOR SELECT USING (auth.uid() = profile_id);
CREATE POLICY "store_photo_reports_select_own" ON store_photo_reports
  FOR SELECT USING (auth.uid() = profile_id);

-- ── Vote casting (toggle: same value again removes the vote, opposite flips it) ──

CREATE OR REPLACE FUNCTION cast_spot_photo_vote(p_photo_id UUID, p_vote_value SMALLINT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_existing SMALLINT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_vote_value NOT IN (-1, 1) THEN
    RAISE EXCEPTION 'Invalid vote value';
  END IF;

  SELECT vote_value INTO v_existing
    FROM spot_photo_votes WHERE photo_id = p_photo_id AND profile_id = auth.uid();

  IF v_existing IS NULL THEN
    INSERT INTO spot_photo_votes (photo_id, profile_id, vote_value)
      VALUES (p_photo_id, auth.uid(), p_vote_value);
  ELSIF v_existing = p_vote_value THEN
    DELETE FROM spot_photo_votes WHERE photo_id = p_photo_id AND profile_id = auth.uid();
  ELSE
    UPDATE spot_photo_votes SET vote_value = p_vote_value, created_at = NOW()
      WHERE photo_id = p_photo_id AND profile_id = auth.uid();
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION cast_spot_photo_vote(UUID, SMALLINT) TO authenticated;

CREATE OR REPLACE FUNCTION cast_store_photo_vote(p_photo_id UUID, p_vote_value SMALLINT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_existing SMALLINT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_vote_value NOT IN (-1, 1) THEN
    RAISE EXCEPTION 'Invalid vote value';
  END IF;

  SELECT vote_value INTO v_existing
    FROM store_photo_votes WHERE photo_id = p_photo_id AND profile_id = auth.uid();

  IF v_existing IS NULL THEN
    INSERT INTO store_photo_votes (photo_id, profile_id, vote_value)
      VALUES (p_photo_id, auth.uid(), p_vote_value);
  ELSIF v_existing = p_vote_value THEN
    DELETE FROM store_photo_votes WHERE photo_id = p_photo_id AND profile_id = auth.uid();
  ELSE
    UPDATE store_photo_votes SET vote_value = p_vote_value, created_at = NOW()
      WHERE photo_id = p_photo_id AND profile_id = auth.uid();
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION cast_store_photo_vote(UUID, SMALLINT) TO authenticated;

-- ── Reporting (idempotent — reporting twice is a no-op, not an error) ───────────

CREATE OR REPLACE FUNCTION report_spot_photo(p_photo_id UUID, p_reason TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  INSERT INTO spot_photo_reports (photo_id, profile_id, reason)
    VALUES (p_photo_id, auth.uid(), p_reason)
  ON CONFLICT (photo_id, profile_id) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION report_spot_photo(UUID, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION report_store_photo(p_photo_id UUID, p_reason TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  INSERT INTO store_photo_reports (photo_id, profile_id, reason)
    VALUES (p_photo_id, auth.uid(), p_reason)
  ON CONFLICT (photo_id, profile_id) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION report_store_photo(UUID, TEXT) TO authenticated;

-- ── Delete (owner-only — no-op if the caller doesn't own the photo) ─────────────

CREATE OR REPLACE FUNCTION delete_spot_photo(p_photo_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  DELETE FROM spot_photos WHERE photo_id = p_photo_id AND profile_id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION delete_spot_photo(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION delete_store_photo(p_photo_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  DELETE FROM store_photos WHERE photo_id = p_photo_id AND profile_id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION delete_store_photo(UUID) TO authenticated;
