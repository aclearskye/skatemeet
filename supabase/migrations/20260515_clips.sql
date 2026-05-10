CREATE TABLE clips (
  clip_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id        UUID NOT NULL REFERENCES profiles(profile_id) ON DELETE CASCADE,
  media_url         TEXT NOT NULL,
  media_type        TEXT NOT NULL CHECK (media_type IN ('photo', 'video')),
  thumbnail_url     TEXT,
  duration_seconds  INT,
  caption           TEXT,
  spot_id           UUID REFERENCES user_spots(spot_id) ON DELETE SET NULL,
  shop_id           UUID REFERENCES user_shops(shop_id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX clips_profile_id_idx ON clips(profile_id);

ALTER TABLE clips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clips_select" ON clips FOR SELECT USING (true);
CREATE POLICY "clips_insert" ON clips FOR INSERT WITH CHECK (auth.uid() = profile_id);
CREATE POLICY "clips_delete" ON clips FOR DELETE USING (auth.uid() = profile_id);
