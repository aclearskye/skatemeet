-- Self-service account deletion ("Deactivate Account"): available to any
-- signed-in user from Settings, and offered on app/banned.tsx as the
-- alternative to appealing -- immediate, no admin approval or 30-day wait,
-- since it's the user's own informed, confirmed choice rather than
-- enforcement action. Distinct from admin_delete_user_data (Phase 5), which
-- stays admin-gated and eligibility-checked for the ban/appeal path.

CREATE FUNCTION self_delete_account() RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_profile_id UUID := auth.uid();
BEGIN
  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- No admin_audit_log entry here -- that table's admin_id is NOT NULL
  -- REFERENCES profiles(profile_id) with no ON DELETE action, so a row
  -- naming this same profile as admin_id would block the delete below with
  -- a foreign key violation (admin_delete_user_data avoids this because its
  -- admin_id is the *acting admin*, never the row being deleted). It's also
  -- the wrong table semantically -- this isn't an admin action.
  DELETE FROM profiles WHERE profile_id = v_profile_id;
END;
$$;
GRANT EXECUTE ON FUNCTION self_delete_account() TO authenticated;
