CREATE TABLE crew_follows (
  follower_id   UUID NOT NULL REFERENCES profiles(profile_id) ON DELETE CASCADE,
  following_id  UUID NOT NULL REFERENCES profiles(profile_id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id)
);

CREATE INDEX crew_follows_following_idx ON crew_follows(following_id);

ALTER TABLE crew_follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crew_select"  ON crew_follows FOR SELECT USING (true);
CREATE POLICY "crew_insert"  ON crew_follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "crew_delete"  ON crew_follows FOR DELETE USING (auth.uid() = follower_id);
