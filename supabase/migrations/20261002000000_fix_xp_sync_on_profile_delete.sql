-- Fixes the actual remaining self_delete_account/admin_delete_user_data
-- failure (the metadata FK fix in 20261001000000 wasn't the whole story):
-- deleting a profile cascades its xp_events rows, and sync_user_xp_totals()
-- -- an AFTER INSERT OR DELETE trigger on xp_events -- fires for each one,
-- unconditionally running `INSERT INTO user_xp (profile_id) VALUES (...)
-- ON CONFLICT DO NOTHING`. By the time that fires mid-cascade, the profiles
-- row it references is already gone, so the insert violates
-- user_xp_profile_id_fkey outright (confirmed via a rolled-back test
-- delete: "insert or update on table user_xp violates foreign key
-- constraint"). None of the other count-sync triggers (review/photo votes
-- and reports) have this problem -- they only UPDATE an existing row, which
-- is silently a no-op if that row is also mid-cascade, never an insert
-- against a missing parent.

CREATE OR REPLACE FUNCTION sync_user_xp_totals()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_profile_id UUID := COALESCE(NEW.profile_id, OLD.profile_id);
  v_new_total  INTEGER;
BEGIN
  -- Nothing to sync to if the profile itself is gone (or going, mid-cascade
  -- from a delete) -- skip rather than let the insert below fail its FK.
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE profile_id = v_profile_id) THEN
    RETURN NULL;
  END IF;

  INSERT INTO user_xp (profile_id) VALUES (v_profile_id) ON CONFLICT (profile_id) DO NOTHING;

  SELECT COALESCE(SUM(amount), 0) INTO v_new_total FROM xp_events WHERE profile_id = v_profile_id;

  UPDATE user_xp
  SET xp_total = v_new_total,
      current_level = COALESCE(
        (SELECT level FROM xp_levels WHERE xp_required <= v_new_total ORDER BY xp_required DESC LIMIT 1),
        1
      ),
      updated_at = now()
  WHERE profile_id = v_profile_id;

  RETURN NULL;
END;
$$;
