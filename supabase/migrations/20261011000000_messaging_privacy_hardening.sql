-- Follow-ups from the Supabase security/performance advisors after
-- 20261008000000-20261010000000.

-- ── 1. Two-argument helpers must not be client-callable ─────────────────
-- can_view_profile(viewer, owner) and is_conversation_member(conversation,
-- profile) took arbitrary ids, so any caller could probe whether two other
-- people are friends, blocked or private, or share a conversation. Policies
-- now use one-argument wrappers bound to auth.uid() -- which only ever
-- answer what the caller could already find out by reading -- and the
-- two-argument versions are left to other SECURITY DEFINER functions.
CREATE FUNCTION viewer_can_see_profile(p_owner UUID) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT can_view_profile(auth.uid(), p_owner);
$$;

CREATE FUNCTION is_my_conversation(p_conversation_id UUID) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT is_conversation_member(p_conversation_id, auth.uid());
$$;

DROP POLICY "profiles_visible_read" ON profiles;
CREATE POLICY "profiles_visible_read" ON profiles
  FOR SELECT TO authenticated USING (viewer_can_see_profile(profile_id));

DROP POLICY "clips_select" ON clips;
CREATE POLICY "clips_select" ON clips
  FOR SELECT USING (viewer_can_see_profile(profile_id));

DROP POLICY "user_xp_select" ON user_xp;
CREATE POLICY "user_xp_select" ON user_xp
  FOR SELECT USING (viewer_can_see_profile(profile_id));

DROP POLICY "conversations_select_member" ON conversations;
CREATE POLICY "conversations_select_member" ON conversations
  FOR SELECT TO authenticated USING (is_my_conversation(conversation_id));

DROP POLICY "conversation_members_select_co_member" ON conversation_members;
CREATE POLICY "conversation_members_select_co_member" ON conversation_members
  FOR SELECT TO authenticated USING (is_my_conversation(conversation_id));

-- ── 2. auth.uid() evaluated once per query, not per row ─────────────────
DROP POLICY "profile_blocks_select_own" ON profile_blocks;
CREATE POLICY "profile_blocks_select_own" ON profile_blocks
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = blocker_id);

DROP POLICY "message_reports_select_own" ON message_reports;
CREATE POLICY "message_reports_select_own" ON message_reports
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = reported_by);

-- ── 3. Execute privileges ───────────────────────────────────────────────
-- Functions are executable by PUBLIC (and so anon) by default. Internal
-- helpers lose it entirely; every client RPC is signed-in only.
REVOKE EXECUTE ON FUNCTION can_view_profile(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION is_conversation_member(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION _purge_invisible_messages(UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION _on_conversation_member_removed() FROM PUBLIC, anon, authenticated;

DO $$
DECLARE
  fn REGPROCEDURE;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'viewer_can_see_profile(uuid)', 'is_my_conversation(uuid)', 'conversation_visible_since(uuid)',
    'open_conversation(uuid)', 'send_message(uuid,text)', 'mark_conversation_read(uuid)',
    'clear_conversation(uuid)', 'delete_conversation(uuid)', 'get_my_chats(uuid)', 'get_unread_chat_count()',
    'block_profile(uuid)', 'unblock_profile(uuid)', 'get_my_blocks()', 'confirm_age()',
    'report_message(uuid,text,text,boolean)', 'admin_list_message_reports()',
    'admin_log_message_report_view(uuid)', 'admin_dismiss_message_report(uuid)',
    'admin_remove_message(uuid)', 'export_my_data()'
  ]::REGPROCEDURE[] LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', fn);
  END LOOP;
END;
$$;

-- ── 4. Indexes for account-deletion cascades and report lookups ─────────
CREATE INDEX messages_sender_idx ON messages (sender_id);
CREATE INDEX message_reports_sender_idx ON message_reports (sender_id);
CREATE INDEX message_reports_reported_by_idx ON message_reports (reported_by);
