-- User-defined duct-tape labels on a skater's profile, shown after their
-- skill level / disciplines / pronouns badges and edited from the profile's
-- pencil (components/profile/EditProfileSheet).
--
-- Same shape and rules as user_spots.labels (one lowercase word, hyphens
-- allowed; brand colour key; max 5, no duplicates), so it reuses the
-- validator from 20261106140000_spot_labels.sql. Kept in sync with
-- lib/shared/tapeLabels.ts. Readable by whoever can read the profile row;
-- writable only by its owner (existing profiles_update policy).

ALTER TABLE public.profiles
  ADD COLUMN labels JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD CONSTRAINT profiles_labels_valid CHECK (public.spot_labels_valid(labels));
