-- OSM entries were seeded with only name/address/coords, so unnamed elements
-- fell back to a generic "Skate Park"/"Skate Spot" suffix with nothing else
-- to search or show. This adds columns for the richer OSM tags the seed
-- scripts now capture (description, image) so entries surface more than a
-- bare name.

ALTER TABLE osm_spots ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE osm_spots ADD COLUMN IF NOT EXISTS osm_image_url TEXT;

ALTER TABLE osm_stores ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE osm_stores ADD COLUMN IF NOT EXISTS osm_image_url TEXT;
