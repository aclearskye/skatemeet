-- Spot chat messages from anyone else never loaded: get_spot_chat_messages
-- hides banned senders with is_banned(m.sender_id), but is_banned() is the
-- client-callable check and raises NOT_ADMIN when a non-admin asks about
-- someone other than themselves. The first member to load another
-- skater's message got an error (the app spun through its retries).
-- export_my_data's spot chat section had the same call.
--
-- _is_banned() is the same lookup without the guard, for server-side use
-- only (not executable by clients, so it can't be used to probe bans).
-- is_banned() keeps its guard for direct calls.

CREATE OR REPLACE FUNCTION public._is_banned(p_profile_id UUID) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_bans WHERE profile_id = p_profile_id AND unbanned_at IS NULL
  );
$$;

REVOKE ALL ON FUNCTION public._is_banned(UUID) FROM public, anon, authenticated;

-- Patch the three server-side callers in place (same pattern as
-- 20261110120000_spot_chats.sql), failing loudly if a body has drifted.
DO $$
DECLARE
  v_fn TEXT;
  v_old TEXT;
  v_new TEXT;
  v_from TEXT;
  v_to TEXT;
BEGIN
  FOR v_fn, v_from, v_to IN VALUES
    ('public.get_spot_chat_messages(uuid,timestamp with time zone,integer)',
     'NOT is_banned(m.sender_id)', 'NOT _is_banned(m.sender_id)'),
    ('public.export_my_data()',
     'NOT is_banned(m.sender_id)', 'NOT _is_banned(m.sender_id)'),
    ('public._spot_chat_eligible(uuid)',
     'NOT is_banned(p_profile_id)', 'NOT _is_banned(p_profile_id)')
  LOOP
    v_old := pg_get_functiondef(v_fn::regprocedure);
    v_new := replace(v_old, v_from, v_to);
    IF v_new = v_old THEN
      RAISE EXCEPTION '% no longer contains %', v_fn, v_from;
    END IF;
    EXECUTE v_new;
  END LOOP;
END;
$$;
