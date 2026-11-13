-- Phase 0 of Store accounts (docs/ACCOUNT_TYPES.md, rule 2: "Type and role
-- columns are not client-writable").
--
-- Before this, anon and authenticated held table-wide INSERT/UPDATE/DELETE on
-- profiles, and profiles_update only checked profile_id = auth.uid(). Any
-- signed-in user could therefore set their own is_admin, account_type,
-- business_*, age_confirmed_at, role, spot_review_tokens,
-- spot_review_blocked_until or last_export_at from the client.
--
-- After this, the client can UPDATE only the self-service profile fields
-- below. Everything else changes only through SECURITY DEFINER functions or
-- the service role, which are unaffected by these grants:
--   age_confirmed_at                    -> confirm_age()
--   is_admin, account_type, business_*  -> service role / admin RPCs
--   spot_review_*, last_export_at, role -> their existing server functions
--
-- INSERT and DELETE are revoked outright: handle_new_user() creates the row
-- and self-deletion goes through its own RPC. No client code writes either.

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON profiles FROM anon, authenticated;

GRANT UPDATE (
  first_name,
  last_name,
  username,
  display_name,
  onboarding_completed,
  disciplines,
  skill_level,
  city,
  bio,
  pronouns,
  avatar_url,
  is_private,
  labels,
  show_in_nearby
) ON profiles TO authenticated;

-- These policies have no grant to back them any more. Drop them so nobody
-- reads them as "clients may insert/delete their own profile".
DROP POLICY IF EXISTS profiles_insert ON profiles;
DROP POLICY IF EXISTS profiles_delete ON profiles;
