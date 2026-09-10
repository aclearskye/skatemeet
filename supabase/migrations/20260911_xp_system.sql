-- XP / leveling system. Generic primitive for four not-yet-built features
-- (entity check-ins, clip uploads, receiving upvotes, challenges) to award
-- XP into, without any of them existing yet.
--
-- The aggregate lives in a new user_xp table rather than as columns on
-- profiles: profiles already carries a permissive "user can update their own
-- row" RLS policy (used today by ProfileAvatar.tsx / SwitchToBusinessModal.tsx
-- for plain client .update() calls), and RLS is row-level, not column-level --
-- an xp_total column there would be directly writable by any client despite
-- anti-cheat intent. user_xp instead gets read-only RLS (no write policy at
-- all), so every write is forced through the award_xp RPC below.

-- ── xp_levels: the leveling curve, tunable via migration, not hardcoded ─────

CREATE TABLE xp_levels (
  level        INTEGER PRIMARY KEY,
  xp_required  INTEGER NOT NULL UNIQUE CHECK (xp_required >= 0),
  title        TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX xp_levels_xp_required_idx ON xp_levels (xp_required);

-- Placeholder curve -- a first pass, expected to be tuned later via a
-- follow-up migration once real earn rates are known.
INSERT INTO xp_levels (level, xp_required, title) VALUES
  (1, 0,     'GROM'),
  (2, 100,   'PUSHER'),
  (3, 250,   'REGULAR'),
  (4, 500,   'RIPPER'),
  (5, 900,   'SHREDDER'),
  (6, 1400,  'LOCAL LEGEND'),
  (7, 2000,  'SPONSORED'),
  (8, 2800,  'PRO'),
  (9, 3800,  'ICON'),
  (10, 5000, 'HALL OF FAME')
ON CONFLICT (level) DO NOTHING;

-- ── user_xp: aggregate, one row per profile, created lazily on first award ──

CREATE TABLE user_xp (
  profile_id     UUID PRIMARY KEY REFERENCES profiles(profile_id) ON DELETE CASCADE,
  xp_total       INTEGER NOT NULL DEFAULT 0 CHECK (xp_total >= 0),
  current_level  INTEGER NOT NULL DEFAULT 1 REFERENCES xp_levels(level),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── xp_events: append-only ledger, source of truth for xp_total ────────────
--
-- source is TEXT rather than an enum so a new XP-earning feature never needs
-- an ALTER TYPE migration -- the allowed values live as an app-level string
-- union in lib/xp/types.ts instead.
--
-- dedup_key is a generic anti-duplicate mechanism: each future source decides
-- what "the same event" means by how it constructs this string (e.g. a
-- check-in uses "<entity_id>:<utc_date>" to cap at once/day/entity; a clip
-- upload just uses "<clip_id>"). profile_id MUST be part of the unique
-- constraint below -- dedup_keys will often collide *across* users by
-- construction (two different users checking into the same spot on the same
-- day both compute the same "<entity_id>:<date>" string).

CREATE TABLE xp_events (
  event_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  UUID NOT NULL REFERENCES profiles(profile_id) ON DELETE CASCADE,
  source      TEXT NOT NULL,
  amount      INTEGER NOT NULL CHECK (amount > 0),
  ref_id      TEXT NOT NULL,
  dedup_key   TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (profile_id, source, dedup_key)
);

CREATE INDEX xp_events_profile_id_idx ON xp_events (profile_id, created_at DESC);

-- ── RLS ──────────────────────────────────────────────────────────────────

ALTER TABLE xp_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_xp ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "xp_levels_select" ON xp_levels FOR SELECT USING (true);

-- Public read: level/progress is meant to be visible on any profile
-- (gamification is identity -- design system brand principle #4).
CREATE POLICY "user_xp_select" ON user_xp FOR SELECT USING (true);

-- Private read: the detailed ledger (exact sources/timestamps) stays visible
-- only to its owner, mirroring spot_photo_reports_select_own.
CREATE POLICY "xp_events_select_own" ON xp_events
  FOR SELECT USING (auth.uid() = profile_id);

-- Deliberately no INSERT/UPDATE/DELETE policy on user_xp or xp_events --
-- every write goes through the SECURITY DEFINER functions below.

-- ── Trigger: xp_events -> user_xp sync ──────────────────────────────────────
--
-- SECURITY DEFINER from the start (not a follow-up fix like
-- 20260910_fix_review_vote_count_sync.sql needed for review votes): user_xp
-- has no client UPDATE policy at all by design, so a SECURITY INVOKER trigger
-- firing off a client-initiated ledger insert would silently no-op exactly
-- like that review-vote bug did.
--
-- Recomputes by SUM() rather than incrementing -- self-healing against any
-- future manual ledger edits or revoke-by-delete, same reasoning as the
-- existing spot/store vote-count triggers.

CREATE OR REPLACE FUNCTION sync_user_xp_totals()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_profile_id UUID := COALESCE(NEW.profile_id, OLD.profile_id);
  v_new_total  INTEGER;
BEGIN
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

DROP TRIGGER IF EXISTS after_xp_event_sync ON xp_events;
CREATE TRIGGER after_xp_event_sync
  AFTER INSERT OR DELETE ON xp_events
  FOR EACH ROW EXECUTE FUNCTION sync_user_xp_totals();

-- ── award_xp: the generic awarding entry point ──────────────────────────────
--
-- Deliberately NOT granted to `authenticated`. It can credit XP to a profile
-- other than the caller (needed for "receiving an upvote" -- the voter
-- triggers it, the clip owner earns the XP), which is a real deviation from
-- every other RPC in this codebase (cast_spot_photo_vote, report_spot_photo,
-- etc. all act only on auth.uid()'s own row). It stays reachable only from
-- other SECURITY DEFINER functions (future check-in/upload/vote/challenge
-- RPCs) that have already validated the action server-side -- never called
-- directly by client code with an arbitrary target profile.
--
-- No auth.uid() check and no fixed enum/amount table inside this function --
-- it trusts its caller to have already validated who's earning what and why.
-- Per-source XP amounts (e.g. "check-in = 10 XP") live in each future
-- feature's own RPC, not centralized here, so this function stays stable as
-- new sources are added.

CREATE OR REPLACE FUNCTION award_xp(
  p_profile_id UUID,
  p_source     TEXT,
  p_amount     INTEGER,
  p_ref_id     TEXT,
  p_dedup_key  TEXT
) RETURNS TABLE (awarded BOOLEAN, xp_total INTEGER, current_level INTEGER)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_row_count INTEGER;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'amount must be positive';
  END IF;

  INSERT INTO xp_events (profile_id, source, amount, ref_id, dedup_key)
  VALUES (p_profile_id, p_source, p_amount, p_ref_id, p_dedup_key)
  ON CONFLICT (profile_id, source, dedup_key) DO NOTHING;
  GET DIAGNOSTICS v_row_count = ROW_COUNT;

  RETURN QUERY
    SELECT (v_row_count > 0), ux.xp_total, ux.current_level
    FROM user_xp ux WHERE ux.profile_id = p_profile_id;
END;
$$;
