-- Fixes a real self_delete_account/admin_delete_user_data failure: editing
-- a spot or store's metadata (facilities, hours, etc. -- an ordinary action
-- any signed-in user can take, not admin-only) stamps last_updated_by =
-- auth.uid() (20260909093923_entity_metadata.sql). That FK had no ON DELETE
-- action, so deleting a profile that had ever edited any entity's metadata
-- failed outright with a foreign-key violation -- exactly what a user hit
-- self-deactivating. last_updated_by is just "who last touched this," not
-- something that should block deletion (it's already nullable), so this
-- makes both FKs SET NULL instead: the metadata itself is untouched, only
-- the attribution is cleared once that profile is gone.

ALTER TABLE spot_metadata
  DROP CONSTRAINT spot_metadata_last_updated_by_fkey,
  ADD CONSTRAINT spot_metadata_last_updated_by_fkey
    FOREIGN KEY (last_updated_by) REFERENCES profiles(profile_id) ON DELETE SET NULL;

ALTER TABLE store_metadata
  DROP CONSTRAINT store_metadata_last_updated_by_fkey,
  ADD CONSTRAINT store_metadata_last_updated_by_fkey
    FOREIGN KEY (last_updated_by) REFERENCES profiles(profile_id) ON DELETE SET NULL;
