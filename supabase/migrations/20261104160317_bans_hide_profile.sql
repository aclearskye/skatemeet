-- A banned (or underage-deactivated) account is hidden from everyone but
-- itself and admins. Until now a ban only confined the user to
-- app/banned.tsx; their profile, clips and XP stayed visible to others.
--
-- can_view_profile backs every viewer_can_see_profile() RLS policy
-- (profiles, clips -> posts, user_xp, ...), so one change covers them all.
-- The ban check is inlined rather than calling is_banned(), which raises
-- NOT_ADMIN for anyone other than the subject or an admin; as SECURITY
-- DEFINER this reads user_bans past its admin-only RLS.
--
-- profile_cards is deliberately untouched: chat cards, review authors and
-- notifications keep resolving a banned user's name and avatar rather than
-- breaking.
CREATE OR REPLACE FUNCTION can_view_profile(p_viewer UUID, p_owner UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p_viewer = p_owner
      OR is_admin(p_viewer)
      OR (
        NOT is_blocked_between(p_viewer, p_owner)
        AND NOT EXISTS (
          SELECT 1 FROM user_bans WHERE profile_id = p_owner AND unbanned_at IS NULL
        )
        AND (
          NOT COALESCE((SELECT is_private FROM profiles WHERE profile_id = p_owner), false)
          OR are_friends(p_viewer, p_owner)
        )
      );
$$;
