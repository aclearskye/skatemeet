-- User-defined duct-tape labels on user-created spots (incl. DIY).
--
-- Stored inline as a small JSONB array of { text, color } objects rather than
-- a join table: a spot carries at most a handful, they're always read with
-- the spot, and every spot read is already `select *`, so the map preview
-- card and detail screen get them for free.
--
-- text  — one lowercase word, hyphens allowed between parts ("kinked-rail")
-- color — a brand colour *key*, not a hex value, so a palette change in
--         lib/theme.ts recolours existing labels.
--
-- Kept in sync with lib/spots/labels.ts (SPOT_LABEL_COLOR_KEYS,
-- MAX_SPOT_LABELS, MAX_SPOT_LABEL_LENGTH, SPOT_LABEL_PATTERN).

CREATE OR REPLACE FUNCTION public.spot_labels_valid(p_labels JSONB)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT jsonb_typeof(p_labels) = 'array'
    AND jsonb_array_length(p_labels) <= 5
    AND NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(p_labels) AS e
      WHERE jsonb_typeof(e) <> 'object'
         OR jsonb_typeof(e -> 'text') IS DISTINCT FROM 'string'
         OR jsonb_typeof(e -> 'color') IS DISTINCT FROM 'string'
         OR char_length(e ->> 'text') > 20
         OR (e ->> 'text') !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
         OR (e ->> 'color') NOT IN ('primary', 'secondary', 'tertiary', 'gold', 'tape')
    )
    -- no duplicate label text on one spot
    AND (
      SELECT count(DISTINCT e ->> 'text') FROM jsonb_array_elements(p_labels) AS e
    ) = jsonb_array_length(p_labels);
$$;

ALTER TABLE public.user_spots
  ADD COLUMN labels JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD CONSTRAINT user_spots_labels_valid CHECK (public.spot_labels_valid(labels));
