-- Crowdsourced entity metadata: opening hours, facilities, parking,
-- pet-friendly, paid, well-lit. One row per entity (user-created or
-- OSM-sourced, same exactly-one-of pattern as reviews/photos). Any signed-in
-- user may add or edit metadata on any entity -- this is deliberately not
-- owner-gated, since OSM entities have no in-app owner and the feature is
-- meant to work like OSM tags (crowdsourced, last-write-wins).
--
-- facilities/parking vocab and the opening_hours weekday keys must stay in
-- sync with lib/shared/types.ts (FACILITIES, PARKING_OPTIONS, WEEKDAYS),
-- same discipline PHOTO_REPORT_REASONS already follows against its own
-- CHECK constraint (20260908c_entity_photo_report_reasons.sql).

-- ── Spot metadata ────────────────────────────────────────────────────────

CREATE TABLE spot_metadata (
  metadata_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spot_id         UUID REFERENCES user_spots(spot_id) ON DELETE CASCADE,
  osm_place_id    TEXT,
  opening_hours   JSONB,
  facilities      TEXT[] NOT NULL DEFAULT '{}',
  parking         TEXT CHECK (parking IN ('none', 'street', 'lot', 'garage')),
  pet_friendly    BOOLEAN,
  paid            BOOLEAN,
  well_lit        BOOLEAN,
  last_updated_by UUID REFERENCES profiles(profile_id),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT spot_metadata_exactly_one_spot CHECK (
    (spot_id IS NOT NULL AND osm_place_id IS NULL) OR
    (spot_id IS NULL AND osm_place_id IS NOT NULL)
  ),
  CONSTRAINT spot_metadata_facilities_check CHECK (
    facilities <@ ARRAY['restrooms', 'water_fountain', 'seating', 'shade', 'bike_racks', 'vending', 'trash_bins', 'first_aid']::TEXT[]
  )
);
CREATE UNIQUE INDEX spot_metadata_spot_id_unique ON spot_metadata (spot_id) WHERE spot_id IS NOT NULL;
CREATE UNIQUE INDEX spot_metadata_osm_place_id_unique ON spot_metadata (osm_place_id) WHERE osm_place_id IS NOT NULL;

ALTER TABLE spot_metadata ENABLE ROW LEVEL SECURITY;
CREATE POLICY "spot_metadata_select" ON spot_metadata FOR SELECT USING (true);
-- No INSERT/UPDATE policy -- all writes via upsert_spot_metadata() below, since
-- two mutually-exclusive partial unique indexes make a plain client-side
-- .upsert() conflict target ambiguous; doing the branch server-side avoids
-- that and centralizes last_updated_by/updated_at stamping.

CREATE FUNCTION upsert_spot_metadata(
  p_spot_id UUID,
  p_osm_place_id TEXT,
  p_opening_hours JSONB,
  p_facilities TEXT[],
  p_parking TEXT,
  p_pet_friendly BOOLEAN,
  p_paid BOOLEAN,
  p_well_lit BOOLEAN
) RETURNS spot_metadata LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_row spot_metadata;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF (p_spot_id IS NULL) = (p_osm_place_id IS NULL) THEN
    RAISE EXCEPTION 'Exactly one of p_spot_id or p_osm_place_id must be provided';
  END IF;

  IF p_spot_id IS NOT NULL THEN
    UPDATE spot_metadata SET
      opening_hours = p_opening_hours, facilities = p_facilities, parking = p_parking,
      pet_friendly = p_pet_friendly, paid = p_paid, well_lit = p_well_lit,
      last_updated_by = auth.uid(), updated_at = now()
    WHERE spot_id = p_spot_id
    RETURNING * INTO v_row;

    IF v_row IS NULL THEN
      INSERT INTO spot_metadata (spot_id, opening_hours, facilities, parking, pet_friendly, paid, well_lit, last_updated_by, updated_at)
        VALUES (p_spot_id, p_opening_hours, p_facilities, p_parking, p_pet_friendly, p_paid, p_well_lit, auth.uid(), now())
        RETURNING * INTO v_row;
    END IF;
  ELSE
    UPDATE spot_metadata SET
      opening_hours = p_opening_hours, facilities = p_facilities, parking = p_parking,
      pet_friendly = p_pet_friendly, paid = p_paid, well_lit = p_well_lit,
      last_updated_by = auth.uid(), updated_at = now()
    WHERE osm_place_id = p_osm_place_id
    RETURNING * INTO v_row;

    IF v_row IS NULL THEN
      INSERT INTO spot_metadata (osm_place_id, opening_hours, facilities, parking, pet_friendly, paid, well_lit, last_updated_by, updated_at)
        VALUES (p_osm_place_id, p_opening_hours, p_facilities, p_parking, p_pet_friendly, p_paid, p_well_lit, auth.uid(), now())
        RETURNING * INTO v_row;
    END IF;
  END IF;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION upsert_spot_metadata(UUID, TEXT, JSONB, TEXT[], TEXT, BOOLEAN, BOOLEAN, BOOLEAN) TO authenticated;

-- ── Store metadata ───────────────────────────────────────────────────────

CREATE TABLE store_metadata (
  metadata_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        UUID REFERENCES user_stores(store_id) ON DELETE CASCADE,
  osm_place_id    TEXT,
  opening_hours   JSONB,
  facilities      TEXT[] NOT NULL DEFAULT '{}',
  parking         TEXT CHECK (parking IN ('none', 'street', 'lot', 'garage')),
  pet_friendly    BOOLEAN,
  paid            BOOLEAN,
  well_lit        BOOLEAN,
  last_updated_by UUID REFERENCES profiles(profile_id),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT store_metadata_exactly_one_store CHECK (
    (store_id IS NOT NULL AND osm_place_id IS NULL) OR
    (store_id IS NULL AND osm_place_id IS NOT NULL)
  ),
  CONSTRAINT store_metadata_facilities_check CHECK (
    facilities <@ ARRAY['restrooms', 'water_fountain', 'seating', 'shade', 'bike_racks', 'vending', 'trash_bins', 'first_aid']::TEXT[]
  )
);
CREATE UNIQUE INDEX store_metadata_store_id_unique ON store_metadata (store_id) WHERE store_id IS NOT NULL;
CREATE UNIQUE INDEX store_metadata_osm_place_id_unique ON store_metadata (osm_place_id) WHERE osm_place_id IS NOT NULL;

ALTER TABLE store_metadata ENABLE ROW LEVEL SECURITY;
CREATE POLICY "store_metadata_select" ON store_metadata FOR SELECT USING (true);

CREATE FUNCTION upsert_store_metadata(
  p_store_id UUID,
  p_osm_place_id TEXT,
  p_opening_hours JSONB,
  p_facilities TEXT[],
  p_parking TEXT,
  p_pet_friendly BOOLEAN,
  p_paid BOOLEAN,
  p_well_lit BOOLEAN
) RETURNS store_metadata LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_row store_metadata;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF (p_store_id IS NULL) = (p_osm_place_id IS NULL) THEN
    RAISE EXCEPTION 'Exactly one of p_store_id or p_osm_place_id must be provided';
  END IF;

  IF p_store_id IS NOT NULL THEN
    UPDATE store_metadata SET
      opening_hours = p_opening_hours, facilities = p_facilities, parking = p_parking,
      pet_friendly = p_pet_friendly, paid = p_paid, well_lit = p_well_lit,
      last_updated_by = auth.uid(), updated_at = now()
    WHERE store_id = p_store_id
    RETURNING * INTO v_row;

    IF v_row IS NULL THEN
      INSERT INTO store_metadata (store_id, opening_hours, facilities, parking, pet_friendly, paid, well_lit, last_updated_by, updated_at)
        VALUES (p_store_id, p_opening_hours, p_facilities, p_parking, p_pet_friendly, p_paid, p_well_lit, auth.uid(), now())
        RETURNING * INTO v_row;
    END IF;
  ELSE
    UPDATE store_metadata SET
      opening_hours = p_opening_hours, facilities = p_facilities, parking = p_parking,
      pet_friendly = p_pet_friendly, paid = p_paid, well_lit = p_well_lit,
      last_updated_by = auth.uid(), updated_at = now()
    WHERE osm_place_id = p_osm_place_id
    RETURNING * INTO v_row;

    IF v_row IS NULL THEN
      INSERT INTO store_metadata (osm_place_id, opening_hours, facilities, parking, pet_friendly, paid, well_lit, last_updated_by, updated_at)
        VALUES (p_osm_place_id, p_opening_hours, p_facilities, p_parking, p_pet_friendly, p_paid, p_well_lit, auth.uid(), now())
        RETURNING * INTO v_row;
    END IF;
  END IF;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION upsert_store_metadata(UUID, TEXT, JSONB, TEXT[], TEXT, BOOLEAN, BOOLEAN, BOOLEAN) TO authenticated;
