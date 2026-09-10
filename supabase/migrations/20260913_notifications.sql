-- Persisted notification inbox (the bell icon in DrawerMenu.tsx /
-- WebAccountSidebar.tsx, currently unwired). Deliberately decoupled from the
-- ephemeral toast system (lib/context/toast-context.tsx) -- a toast shows
-- something just happened and disappears; this is the durable record of it,
-- with its own message/variant copy, that a user can revisit and delete.

CREATE TABLE notifications (
  notification_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id       UUID NOT NULL REFERENCES profiles(profile_id) ON DELETE CASCADE,
  source           TEXT NOT NULL,
  dedup_key        TEXT NOT NULL,
  label            TEXT,
  message          TEXT NOT NULL,
  variant          TEXT NOT NULL DEFAULT 'info',
  read_at          TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (profile_id, source, dedup_key)
);

CREATE INDEX notifications_profile_id_created_at_idx ON notifications (profile_id, created_at DESC);
CREATE INDEX notifications_unread_idx ON notifications (profile_id) WHERE read_at IS NULL;

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_select_own" ON notifications
  FOR SELECT USING (auth.uid() = profile_id);

-- A broad own-row UPDATE (rather than a narrower "only read_at" check) is a
-- deliberate, lower-stakes call here, unlike the XP tables: worst case a user
-- rewrites their own private notification's text, which affects nobody else
-- and grants no advantage. This just lets the client mark its own rows read.
CREATE POLICY "notifications_update_own" ON notifications
  FOR UPDATE USING (auth.uid() = profile_id) WITH CHECK (auth.uid() = profile_id);

-- The actual feature being asked for.
CREATE POLICY "notifications_delete_own" ON notifications
  FOR DELETE USING (auth.uid() = profile_id);

-- Deliberately no INSERT policy -- every notification is created via
-- create_notification() below, never directly by a client.

-- ── create_notification: the generic creation entry point ──────────────────
--
-- Mirrors award_xp()'s shape and reasoning exactly (supabase/migrations/
-- 20260911_xp_system.sql): it can write to a profile other than the caller
-- (a future "X commented on your clip" notification needs this), so it gets
-- no GRANT EXECUTE TO authenticated -- reachable only from other server-side
-- SECURITY DEFINER functions. ON CONFLICT DO NOTHING makes it safe to call
-- redundantly (e.g. a re-run backfill).

CREATE OR REPLACE FUNCTION create_notification(
  p_profile_id UUID,
  p_source     TEXT,
  p_dedup_key  TEXT,
  p_message    TEXT,
  p_variant    TEXT,
  p_label      TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO notifications (profile_id, source, dedup_key, message, variant, label)
  VALUES (p_profile_id, p_source, p_dedup_key, p_message, p_variant, p_label)
  ON CONFLICT (profile_id, source, dedup_key) DO NOTHING
  RETURNING notification_id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$;

-- ── Wire the one real event that exists today: account creation ────────────
--
-- CREATE OR REPLACE rather than editing 20260912_xp_account_created.sql in
-- place -- that migration may already be applied, so this redefines the
-- trigger function here instead of rewriting history.
--
-- Deliberately NOT making award_xp() itself always create a notification --
-- that would silently couple every future XP source to producing an inbox
-- item, which may not be wanted for high-frequency/low-signal sources later.
-- Each future feature's own RPC decides whether to call create_notification,
-- same as it decides whether to call award_xp.

CREATE OR REPLACE FUNCTION award_account_created_xp()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM award_xp(
    NEW.profile_id,
    'account_created',
    25,
    NEW.profile_id::TEXT,
    NEW.profile_id::TEXT
  );
  PERFORM create_notification(
    NEW.profile_id,
    'account_created',
    NEW.profile_id::TEXT,
    'WELCOME TO THE CREW · +25 XP',
    'success',
    'ACCOUNT CREATED'
  );
  RETURN NEW;
END;
$$;

-- Backfill: give existing profiles (already backfilled for XP in
-- 20260912_xp_account_created.sql) the matching persisted notification too.
DO $$
DECLARE
  v_profile RECORD;
BEGIN
  FOR v_profile IN SELECT profile_id FROM profiles LOOP
    PERFORM create_notification(
      v_profile.profile_id,
      'account_created',
      v_profile.profile_id::TEXT,
      'WELCOME TO THE CREW · +25 XP',
      'success',
      'ACCOUNT CREATED'
    );
  END LOOP;
END;
$$;
