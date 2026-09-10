-- Award XP for creating an account — the first XP source to actually use the
-- generic award_xp() primitive from 20260911_xp_system.sql. Fires on every
-- new profiles row via trigger (fully automatic, no client change needed),
-- with a one-time backfill for profiles that already existed before this
-- migration so nobody who joined earlier is short-changed.

CREATE OR REPLACE FUNCTION award_account_created_xp()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM award_xp(
    NEW.profile_id,
    'account_created',
    25,
    NEW.profile_id::TEXT,
    NEW.profile_id::TEXT  -- one signup per profile_id, this can only ever fire once
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS after_profile_insert_award_xp ON profiles;
CREATE TRIGGER after_profile_insert_award_xp
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION award_account_created_xp();

-- Backfill: award the same signup XP once to every profile that predates
-- this migration. award_xp's own dedup (profile_id, source, dedup_key) makes
-- this safe to re-run.
DO $$
DECLARE
  v_profile RECORD;
BEGIN
  FOR v_profile IN SELECT profile_id FROM profiles LOOP
    PERFORM award_xp(v_profile.profile_id, 'account_created', 25, v_profile.profile_id::TEXT, v_profile.profile_id::TEXT);
  END LOOP;
END;
$$;
