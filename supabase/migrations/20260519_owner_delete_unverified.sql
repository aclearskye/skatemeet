-- Allow creators to delete their own spot/store while it is not yet community-verified.
-- Once verified, deletion must go through a future "request deletion" / admin-review flow.

DROP POLICY IF EXISTS "creator_delete_spot" ON user_spots;
CREATE POLICY "creator_delete_spot"
  ON user_spots FOR DELETE
  USING (auth.uid() = created_by AND is_verified = false);

CREATE POLICY "creator_delete_store"
  ON user_stores FOR DELETE
  USING (auth.uid() = profile_id AND is_verified = false);
