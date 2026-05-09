-- Split shops out of osm_spots into dedicated osm_shops and user_shops tables

-- ── 1. osm_shops (seeded from OSM data) ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS osm_shops (
  place_id      TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  latitude      DOUBLE PRECISION NOT NULL,
  longitude     DOUBLE PRECISION NOT NULL,
  address       TEXT NOT NULL DEFAULT '',
  phone         TEXT,
  website       TEXT,
  opening_hours TEXT,
  seeded_at     TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE osm_shops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "osm_shops_public_read"
  ON osm_shops FOR SELECT USING (true);

CREATE INDEX IF NOT EXISTS osm_shops_lat_lng_idx ON osm_shops (latitude, longitude);

-- ── 2. Move shop rows from osm_spots → osm_shops ─────────────────────────────

INSERT INTO osm_shops (place_id, name, latitude, longitude, address, seeded_at)
SELECT place_id, name, latitude, longitude, address, seeded_at
FROM osm_spots
WHERE spot_type = 'shop'
ON CONFLICT (place_id) DO NOTHING;

DELETE FROM osm_spots WHERE spot_type = 'shop';

-- ── 3. Tighten osm_spots.spot_type constraint (remove 'shop') ────────────────

ALTER TABLE osm_spots DROP CONSTRAINT IF EXISTS osm_spots_spot_type_check;
ALTER TABLE osm_spots ADD CONSTRAINT osm_spots_spot_type_check
  CHECK (spot_type IN ('park', 'diy', 'street'));

-- ── 4. user_shops (user/business-submitted shops) ────────────────────────────

CREATE TABLE IF NOT EXISTS user_shops (
  shop_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id    UUID NOT NULL REFERENCES profiles(profile_id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  latitude      DOUBLE PRECISION NOT NULL,
  longitude     DOUBLE PRECISION NOT NULL,
  address       TEXT NOT NULL DEFAULT '',
  phone         TEXT,
  website       TEXT,
  opening_hours TEXT,
  description   TEXT,
  photo_url     TEXT,
  is_verified   BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE user_shops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_shops_public_read"
  ON user_shops FOR SELECT USING (true);

CREATE POLICY "user_shops_owner_insert"
  ON user_shops FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "user_shops_owner_update"
  ON user_shops FOR UPDATE
  USING (auth.uid() = profile_id);

CREATE INDEX IF NOT EXISTS user_shops_lat_lng_idx ON user_shops (latitude, longitude);
CREATE INDEX IF NOT EXISTS user_shops_profile_id_idx ON user_shops (profile_id);
