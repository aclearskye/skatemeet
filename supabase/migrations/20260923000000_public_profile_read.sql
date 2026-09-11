-- profiles_select restricts reads to the owner only (profile_id = auth.uid()),
-- which silently breaks two features that depend on seeing someone else's
-- profile row: the profiles(username, display_name) embed used by
-- spot/store review queries (now that reviews are publicly readable), and
-- the existing /user/[userId] "view profile" screen, which has always
-- expected to load another user's row. Add a second permissive SELECT
-- policy opening read access to any authenticated user -- profile info is
-- otherwise-public by design here (ProfileView already renders isOwnProfile
-- = false for other users' profiles).
CREATE POLICY "profiles_public_read" ON profiles
  FOR SELECT TO authenticated
  USING (true);
