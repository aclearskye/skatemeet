-- Function-access audit across the whole schema (Supabase security
-- advisor: anon/authenticated_security_definer_function_executable,
-- function_search_path_mutable, multiple_permissive_policies).
--
-- Postgres grants EXECUTE on every new function to PUBLIC, so every
-- SECURITY DEFINER function in public was callable over /rest/v1/rpc --
-- including by signed-out callers. Most check auth.uid() or is_admin()
-- themselves, but four internal helpers have no checks at all and were
-- directly exploitable: award_xp (grant anyone XP), create_notification
-- (send anyone arbitrary notification text), _perform_check_in (check in
-- anywhere, skipping the distance check) and _release_pending_spot_xp.
-- Every caller of those is itself SECURITY DEFINER, so they keep working
-- after the revoke below.

-- ── 1. Internal helpers and trigger functions: no client access ─────────
-- Trigger functions still fire without EXECUTE (it's only checked when the
-- trigger is created); revoking just removes them from the RPC surface.
DO $$
DECLARE
  fn REGPROCEDURE;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'award_xp(uuid,text,integer,text,text)',
    'create_notification(uuid,text,text,text,text,text,uuid)',
    '_perform_check_in(uuid,uuid,text,uuid,text,text)',
    '_release_pending_spot_xp(uuid)',
    '_entity_location(uuid,text,uuid,text)',
    '_haversine_meters(double precision,double precision,double precision,double precision)',
    '_check_in_on_spot_created()',
    '_check_in_on_store_created()',
    '_handle_spot_verification_review()',
    'award_account_created_xp()',
    'handle_new_user()',
    'sync_profile_on_request_status()',
    'sync_osm_spot_upvote_count()',
    'sync_spot_vote_count()',
    'sync_user_xp_totals()',
    'sync_spot_cover_photo()',
    'sync_store_cover_photo()',
    'sync_spot_photo_report_count()',
    'sync_store_photo_report_count()',
    'sync_spot_photo_vote_counts()',
    'sync_store_photo_vote_counts()',
    'sync_spot_review_report_count()',
    'sync_store_review_report_count()',
    'sync_spot_review_votes()',
    'sync_store_review_votes()',
    'sync_store_upvote_count()'
  ]::REGPROCEDURE[] LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn);
  END LOOP;
END;
$$;

-- ── 2. Client RPCs: signed-in only ──────────────────────────────────────
-- Each already rejects a NULL auth.uid() (or checks is_admin); this just
-- stops signed-out callers reaching them at all.
DO $$
DECLARE
  fn REGPROCEDURE;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'add_spot_photo(uuid,text,text)',
    'add_store_photo(uuid,text,text)',
    'admin_approve_verification(uuid)',
    'admin_ban_user(uuid,text)',
    'admin_delete_user_data(uuid)',
    'admin_dismiss_profile_report(uuid)',
    'admin_list_ban_appeals()',
    'admin_list_ban_history(uuid)',
    'admin_list_deletion_eligible()',
    'admin_list_photo_reports()',
    'admin_list_profile_reports()',
    'admin_list_review_reports()',
    'admin_list_verification_requests()',
    'admin_reject_verification(uuid)',
    'admin_resolve_ban_appeal(uuid,text)',
    'admin_resolve_spot_photo_report(uuid,text)',
    'admin_resolve_spot_review_report(uuid,text)',
    'admin_resolve_store_photo_report(uuid,text)',
    'admin_resolve_store_review_report(uuid,text)',
    'admin_search_profiles(text)',
    'admin_unban_user(uuid)',
    'cancel_friend_request(uuid)',
    'cast_spot_photo_vote(uuid,smallint)',
    'cast_store_photo_vote(uuid,smallint)',
    'check_in(uuid,text,uuid,text,double precision,double precision)',
    'check_out()',
    'create_spot_review(uuid,text,text,numeric,text)',
    'create_store_review(uuid,text,text,numeric,text)',
    'delete_spot_photo(uuid)',
    'delete_store_photo(uuid)',
    'get_ban_appeal_status(uuid)',
    'get_friend_count(uuid)',
    'get_friend_status(uuid)',
    'get_profile_visited_count(uuid)',
    'get_spot_verification_status(uuid)',
    'is_banned(uuid)',
    'remove_friend(uuid)',
    'report_profile(uuid,text,text)',
    'report_spot_photo(uuid,text)',
    'report_spot_review(uuid,text)',
    'report_store_photo(uuid,text)',
    'report_store_review(uuid,text)',
    'request_spot_verification(uuid)',
    'respond_to_friend_request(uuid,boolean)',
    'self_delete_account()',
    'send_friend_request(uuid)',
    'sync_check_in_status(double precision,double precision)',
    'upsert_spot_metadata(uuid,text,jsonb,text[],text,boolean,boolean,boolean)',
    'upsert_store_metadata(uuid,text,jsonb,text[],text,boolean,boolean,boolean)'
  ]::REGPROCEDURE[] LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', fn);
  END LOOP;
END;
$$;

-- Deliberately left callable while signed out:
--   submit_ban_appeal(text,text)  -- see 20260925000000: an appeal may come
--                                    from someone with no session at all
--   get_live_count / get_live_counts_in_bbox -- anonymous head counts only
-- is_admin and has_manual_checkin are SECURITY INVOKER and used inside RLS
-- policies, so they must stay executable by whoever reads those tables.

-- ── 3. Pin search_path on the functions that didn't set one ─────────────
ALTER FUNCTION _haversine_meters(double precision, double precision, double precision, double precision) SET search_path = public;
ALTER FUNCTION has_manual_checkin(uuid, text, uuid, text) SET search_path = public;
ALTER FUNCTION is_admin(uuid) SET search_path = public;
ALTER FUNCTION sync_profile_on_request_status() SET search_path = public;
ALTER FUNCTION sync_spot_cover_photo() SET search_path = public;
ALTER FUNCTION sync_store_cover_photo() SET search_path = public;
ALTER FUNCTION sync_spot_photo_report_count() SET search_path = public;
ALTER FUNCTION sync_store_photo_report_count() SET search_path = public;
ALTER FUNCTION sync_spot_photo_vote_counts() SET search_path = public;
ALTER FUNCTION sync_store_photo_vote_counts() SET search_path = public;
ALTER FUNCTION sync_spot_review_report_count() SET search_path = public;
ALTER FUNCTION sync_store_review_report_count() SET search_path = public;
ALTER FUNCTION sync_spot_review_votes() SET search_path = public;
ALTER FUNCTION sync_store_review_votes() SET search_path = public;
ALTER FUNCTION sync_store_upvote_count() SET search_path = public;

-- ── 4. Overlapping profiles policies ────────────────────────────────────
-- profiles_visible_read already covers the owner (viewer = owner), and
-- profiles_insert is the same check as this older dashboard-created policy.
DROP POLICY "profiles_select" ON profiles;
DROP POLICY "Enable insert for users based on user_id" ON profiles;
