-- Spot chats: one public, text-only group chat per skate spot and DIY spot
-- (user_spots, including type 'diy', and osm_spots). Never for stores: a
-- room can only reference a spot table, so a store chat can't exist.
--
-- Rooms are created on first join, so every spot -- existing or added
-- later -- has a chat without a backfill.
--
-- Privacy: clients never read these tables directly. Everything goes through
-- the SECURITY DEFINER RPCs below, which return the sender's display name and
-- avatar only -- never their username or profile id. Messages are grouped by
-- a random per-membership alias, so a sender can't be matched to a profile.
-- Block and report act on a message id for the same reason.
--
-- Leaving keeps the log: a member row is soft-left (left_at) and every
-- message stays. Clearing and per-message deletes are one-sided, stored on
-- the caller's own rows, exactly like DMs (20261008000000).
--
-- Moderation, in two layers:
--   1. Before insert (_spot_chat_filter): slurs, phone numbers, emails,
--      @handles, off-platform contact requests and links are refused. Slurs
--      and contact details also open a 'filter' report for admins.
--   2. After insert (moderate-spot-chat edge function, via pg_net): a
--      Sightengine scan for hate, sexual content, threats, self-harm and
--      extremism. A hit hides the message from everyone but its sender and
--      opens a 'scan' report. A failed scan leaves the message visible (the
--      filter has already run) and users can still report it.
--
-- Eligibility: signed in, age confirmed (18+ under the current age gate) and
-- not banned. See docs/ACCOUNT_TYPES.md -- Child access is off until decided.

-- ── Tables ──────────────────────────────────────────────────────────────

CREATE TABLE spot_chat_rooms (
  room_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spot_id           UUID UNIQUE REFERENCES user_spots(spot_id) ON DELETE CASCADE,
  osm_spot_place_id TEXT UNIQUE REFERENCES osm_spots(place_id) ON DELETE CASCADE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_message_at   TIMESTAMPTZ,
  -- Bumped whenever the visible log changes (new, held, restored or removed
  -- message). The only thing clients receive over realtime: they refetch
  -- through get_spot_chat_messages, so no message row is ever broadcast.
  revision          BIGINT NOT NULL DEFAULT 0,
  CHECK (num_nonnulls(spot_id, osm_spot_place_id) = 1)
);

CREATE TABLE spot_chat_members (
  room_id    UUID NOT NULL REFERENCES spot_chat_rooms(room_id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(profile_id) ON DELETE CASCADE,
  -- Random, never derived from profile_id: groups a sender's messages
  -- without identifying them.
  alias      UUID NOT NULL DEFAULT gen_random_uuid(),
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  left_at    TIMESTAMPTZ,
  -- Messages created at or before this are hidden for this member only.
  cleared_at TIMESTAMPTZ,
  PRIMARY KEY (room_id, profile_id)
);

CREATE INDEX spot_chat_members_profile_idx ON spot_chat_members (profile_id);
CREATE INDEX spot_chat_members_active_idx ON spot_chat_members (room_id) WHERE left_at IS NULL;

CREATE TABLE spot_chat_messages (
  message_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id    UUID NOT NULL REFERENCES spot_chat_rooms(room_id) ON DELETE CASCADE,
  -- A deleted account's messages go with it, as in DMs.
  sender_id  UUID NOT NULL REFERENCES profiles(profile_id) ON DELETE CASCADE,
  body       TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  -- 'held': flagged by the scan, hidden from everyone but the sender until
  -- an admin dismisses (restores) or removes it.
  status     TEXT NOT NULL DEFAULT 'visible' CHECK (status IN ('visible', 'held')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX spot_chat_messages_room_created_idx ON spot_chat_messages (room_id, created_at DESC);
CREATE INDEX spot_chat_messages_sender_idx ON spot_chat_messages (sender_id, created_at DESC);

-- "Delete for me" on a single message.
CREATE TABLE spot_chat_hidden_messages (
  profile_id UUID NOT NULL REFERENCES profiles(profile_id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES spot_chat_messages(message_id) ON DELETE CASCADE,
  hidden_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (profile_id, message_id)
);

CREATE INDEX spot_chat_hidden_messages_message_idx ON spot_chat_hidden_messages (message_id);

-- One queue for user reports and automatic flags. The text (and a little
-- context) is copied at report time, like message_reports, so a removal,
-- one-sided clear or refused message still leaves admins something to read.
CREATE TABLE spot_chat_reports (
  report_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- 'user': a member reported it. 'filter': refused before sending (no
  -- message row). 'scan': flagged and held after sending.
  source           TEXT NOT NULL CHECK (source IN ('user', 'filter', 'scan')),
  message_id       UUID REFERENCES spot_chat_messages(message_id) ON DELETE SET NULL,
  room_id          UUID REFERENCES spot_chat_rooms(room_id) ON DELETE SET NULL,
  sender_id        UUID NOT NULL REFERENCES profiles(profile_id) ON DELETE CASCADE,
  reported_by      UUID REFERENCES profiles(profile_id) ON DELETE CASCADE,
  body_snapshot    TEXT,
  context_snapshot JSONB,
  reason           TEXT NOT NULL CHECK (reason IN (
                     -- user
                     'harassment', 'spam', 'inappropriate_content', 'personal_info', 'threat', 'self_harm', 'other',
                     -- filter
                     'slur', 'phone_number', 'email', 'contact_handle',
                     -- scan (plus slur, self_harm, personal_info, threat above)
                     'hate_speech', 'sexual', 'extremism'
                   )),
  details          TEXT CHECK (details IS NULL OR char_length(details) <= 500),
  scores           JSONB,
  -- Repeat filter hits from the same sender in the same room fold into one
  -- open report instead of flooding the queue.
  hit_count        INTEGER NOT NULL DEFAULT 1,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_hit_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at      TIMESTAMPTZ,
  resolved_by      UUID REFERENCES profiles(profile_id) ON DELETE SET NULL,
  resolution       TEXT CHECK (resolution IN ('dismissed', 'message_removed', 'banned')),
  CHECK ((source = 'user') = (reported_by IS NOT NULL)),
  CHECK (body_snapshot IS NOT NULL OR resolved_at IS NOT NULL)
);

CREATE UNIQUE INDEX spot_chat_reports_user_once ON spot_chat_reports (message_id, reported_by) WHERE source = 'user';
CREATE UNIQUE INDEX spot_chat_reports_scan_once ON spot_chat_reports (message_id) WHERE source = 'scan';
CREATE UNIQUE INDEX spot_chat_reports_filter_open
  ON spot_chat_reports (sender_id, room_id, reason) WHERE source = 'filter' AND resolved_at IS NULL;
CREATE INDEX spot_chat_reports_open_idx ON spot_chat_reports (created_at) WHERE resolved_at IS NULL;
CREATE INDEX spot_chat_reports_sender_idx ON spot_chat_reports (sender_id);
CREATE INDEX spot_chat_reports_reported_by_idx ON spot_chat_reports (reported_by);
CREATE INDEX spot_chat_reports_message_idx ON spot_chat_reports (message_id);

-- Server-side deny list, editable without a migration. Not client-readable.
--   match_anywhere = false: whole words only (plus a plural ending), for
--                           short terms that hide inside ordinary words.
--   match_anywhere = true:  also matched inside the text with every space
--                           and symbol removed ("towel head"). Only for
--                           long terms that can't appear across ordinary
--                           word boundaries.
CREATE TABLE chat_filter_terms (
  term           TEXT PRIMARY KEY CHECK (term ~ '^[a-z]+$'),
  match_anywhere BOOLEAN NOT NULL DEFAULT false
);

INSERT INTO chat_filter_terms (term, match_anywhere) VALUES
  ('nigger', true), ('faggot', true), ('wetback', true), ('raghead', true), ('towelhead', true),
  ('sandnigger', true), ('nigga', false), ('tranny', false), ('beaner', false),
  ('kike', false), ('chink', false), ('spic', false), ('fag', false), ('dyke', false),
  ('retard', false), ('coon', false), ('gook', false), ('paki', false), ('gypo', false), ('pikey', false);

ALTER TABLE spot_chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE spot_chat_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE spot_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE spot_chat_hidden_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE spot_chat_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_filter_terms ENABLE ROW LEVEL SECURITY;

-- No policies (so no client access) on anything but rooms.
REVOKE ALL ON spot_chat_members, spot_chat_messages, spot_chat_hidden_messages,
              spot_chat_reports, chat_filter_terms FROM anon, authenticated;

-- ── Helpers ─────────────────────────────────────────────────────────────

CREATE FUNCTION _spot_chat_eligible(p_profile_id UUID) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE profile_id = p_profile_id AND age_confirmed_at IS NOT NULL
  ) AND NOT is_banned(p_profile_id);
$$;

CREATE FUNCTION _is_spot_chat_member(p_room_id UUID, p_profile_id UUID) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM spot_chat_members
    WHERE room_id = p_room_id AND profile_id = p_profile_id AND left_at IS NULL
  );
$$;

-- One-argument wrapper bound to auth.uid(), for RLS (same reasoning as
-- is_my_conversation in 20261011000000).
CREATE FUNCTION is_my_spot_chat(p_room_id UUID) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _is_spot_chat_member(p_room_id, auth.uid());
$$;

-- Rooms carry nothing personal; members can read them so realtime can
-- deliver revision bumps.
CREATE POLICY "spot_chat_rooms_select_member" ON spot_chat_rooms
  FOR SELECT TO authenticated USING (is_my_spot_chat(room_id));
REVOKE ALL ON spot_chat_rooms FROM anon, authenticated;
GRANT SELECT ON spot_chat_rooms TO authenticated;

-- Returns the reason a message is refused, or NULL. Contact checks run on
-- the raw text; slur checks on a leet-decoded copy.
CREATE FUNCTION _spot_chat_filter(p_body TEXT) RETURNS TEXT
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_raw   TEXT := lower(p_body);
  v_nums  TEXT := lower(p_body);
  v_words TEXT;
  v_spaced TEXT;
  v_joined TEXT;
  v_number_words TEXT[] := ARRAY['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
  i INTEGER;
BEGIN
  -- Slurs. 0→o 1→i 3→e 4→a 5→s 7→t @→a $→s !→i |→i
  -- Punctuation becomes spaces, and runs of 3+ of a letter shrink to two
  -- ("niggggger" -> "nigger").
  v_words := regexp_replace(translate(v_raw, '013457@$!|', 'oieastasii'), '[^a-z]+', ' ', 'g');
  v_words := regexp_replace(v_words, '([a-z])\1\1+', '\1\1', 'g');
  -- Spelled-out letters joined back up: "n i g g e r" / "n.i.g.g.e.r".
  v_spaced := regexp_replace(v_words, '\m([a-z]) (?=[a-z]\M)', '\1', 'g');
  v_joined := replace(v_words, ' ', '');
  IF EXISTS (
    SELECT 1 FROM chat_filter_terms t
    WHERE v_words ~ ('\m' || t.term || '(s|es|z|ed)?\M')
       OR v_spaced ~ ('\m' || t.term || '(s|es|z|ed)?\M')
       OR (t.match_anywhere AND position(t.term IN v_joined) > 0)
  ) THEN
    RETURN 'slur';
  END IF;

  -- Emails, including "name at gmail dot com".
  IF v_raw ~ '[a-z0-9._%+-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}'
     OR v_raw ~ '\m(gmail|hotmail|outlook|yahoo|icloud|protonmail|proton\s*me)\M' THEN
    RETURN 'email';
  END IF;

  -- Phone numbers: nine or more digits, loosely separated, with spelled-out
  -- digits ("oh seven seven...") counted too.
  FOR i IN 1..10 LOOP
    v_nums := regexp_replace(v_nums, '\m' || v_number_words[i] || '\M', (i - 1)::TEXT, 'g');
  END LOOP;
  IF v_nums ~ '(\d[^0-9a-z]{0,3}){9,}' THEN
    RETURN 'phone_number';
  END IF;

  -- @handles and moving the chat off the app.
  IF v_raw ~ '(^|[^a-z0-9._%+-])@[a-z0-9_.]{2,}'
     OR v_raw ~ '\m(whats\s*app|telegram|kik|wickr|snap\s*chat|discord|signal\s+app)\M'
     OR v_raw ~ '\m(add|follow|hmu|dm|message|text|msg|hit) me (up )?on\M'
     OR v_raw ~ '\m(my|add|drop your|whats your|what''s your) (snap|sc|insta|ig|number|digits)\M' THEN
    RETURN 'contact_handle';
  END IF;

  IF v_raw ~ '(https?://|www\.)'
     OR v_raw ~ '\m[a-z0-9-]+\.(com|net|org|io|co|uk|me|gg|ly|app|xyz|tv|link|site|info|biz|ru)\M' THEN
    RETURN 'link';
  END IF;

  RETURN NULL;
END;
$$;

-- Up to five earlier visible messages in the room, for report context.
CREATE FUNCTION _spot_chat_context(p_room_id UUID, p_before TIMESTAMPTZ) RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'sender_id', c.sender_id, 'body', c.body, 'created_at', c.created_at
         ) ORDER BY c.created_at), '[]'::JSONB)
  FROM (
    SELECT sender_id, body, created_at FROM spot_chat_messages
    WHERE room_id = p_room_id AND created_at < p_before AND status = 'visible'
    ORDER BY created_at DESC
    LIMIT 5
  ) c;
$$;

-- Revision bump on every change to the visible log.
CREATE FUNCTION _on_spot_chat_message_change() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE spot_chat_rooms SET revision = revision + 1, last_message_at = NEW.created_at
    WHERE room_id = NEW.room_id;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE spot_chat_rooms SET revision = revision + 1 WHERE room_id = NEW.room_id;
  ELSE
    UPDATE spot_chat_rooms SET revision = revision + 1 WHERE room_id = OLD.room_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER spot_chat_messages_bump_revision
  AFTER INSERT OR DELETE OR UPDATE OF status ON spot_chat_messages
  FOR EACH ROW EXECUTE FUNCTION _on_spot_chat_message_change();

-- Asks the edge function to scan a new message. Never blocks or fails the
-- send: pg_net queues the request, and any error here is swallowed.
CREATE FUNCTION _request_spot_chat_scan() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_url TEXT;
BEGIN
  BEGIN
    SELECT decrypted_secret INTO v_url FROM vault.decrypted_secrets WHERE name = 'project_url';
    IF v_url IS NOT NULL THEN
      PERFORM net.http_post(
        url := v_url || '/functions/v1/moderate-spot-chat',
        body := jsonb_build_object('message_id', NEW.message_id),
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-moderation-secret', _moderation_webhook_secret()
        ),
        timeout_milliseconds := 5000
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  RETURN NULL;
END;
$$;

CREATE TRIGGER spot_chat_messages_request_scan
  AFTER INSERT ON spot_chat_messages
  FOR EACH ROW EXECUTE FUNCTION _request_spot_chat_scan();

-- ── Client RPCs ─────────────────────────────────────────────────────────

-- The room for a spot, if one exists yet. Always one row.
CREATE FUNCTION get_spot_chat_room(p_spot_id UUID, p_osm_spot_place_id TEXT)
RETURNS TABLE(room_id UUID, is_member BOOLEAN, member_count INTEGER, can_join BOOLEAN)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_room_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF num_nonnulls(p_spot_id, p_osm_spot_place_id) <> 1 THEN
    RAISE EXCEPTION 'INVALID_SPOT';
  END IF;

  SELECT r.room_id INTO v_room_id FROM spot_chat_rooms r
  WHERE (p_spot_id IS NOT NULL AND r.spot_id = p_spot_id)
     OR (p_osm_spot_place_id IS NOT NULL AND r.osm_spot_place_id = p_osm_spot_place_id);

  RETURN QUERY SELECT
    v_room_id,
    v_room_id IS NOT NULL AND _is_spot_chat_member(v_room_id, auth.uid()),
    COALESCE((SELECT COUNT(*)::INTEGER FROM spot_chat_members m
              WHERE m.room_id = v_room_id AND m.left_at IS NULL), 0),
    _spot_chat_eligible(auth.uid());
END;
$$;

-- Get-or-create the room, then join (or rejoin) it. Rejoining keeps the
-- caller's earlier clear, so cleared history doesn't come back.
CREATE FUNCTION join_spot_chat(p_spot_id UUID, p_osm_spot_place_id TEXT) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_room_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF num_nonnulls(p_spot_id, p_osm_spot_place_id) <> 1 THEN
    RAISE EXCEPTION 'INVALID_SPOT';
  END IF;
  IF is_banned(auth.uid()) THEN
    RAISE EXCEPTION 'BANNED';
  END IF;
  IF NOT _spot_chat_eligible(auth.uid()) THEN
    RAISE EXCEPTION 'NOT_ELIGIBLE';
  END IF;
  IF p_spot_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM user_spots WHERE spot_id = p_spot_id) THEN
    RAISE EXCEPTION 'SPOT_NOT_FOUND';
  END IF;
  IF p_osm_spot_place_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM osm_spots WHERE place_id = p_osm_spot_place_id) THEN
    RAISE EXCEPTION 'SPOT_NOT_FOUND';
  END IF;

  INSERT INTO spot_chat_rooms (spot_id, osm_spot_place_id)
  VALUES (p_spot_id, p_osm_spot_place_id)
  ON CONFLICT DO NOTHING;

  SELECT r.room_id INTO v_room_id FROM spot_chat_rooms r
  WHERE (p_spot_id IS NOT NULL AND r.spot_id = p_spot_id)
     OR (p_osm_spot_place_id IS NOT NULL AND r.osm_spot_place_id = p_osm_spot_place_id);

  INSERT INTO spot_chat_members (room_id, profile_id)
  VALUES (v_room_id, auth.uid())
  ON CONFLICT (room_id, profile_id) DO UPDATE
    SET left_at = NULL,
        joined_at = CASE WHEN spot_chat_members.left_at IS NULL THEN spot_chat_members.joined_at ELSE now() END;

  RETURN v_room_id;
END;
$$;

CREATE FUNCTION leave_spot_chat(p_room_id UUID) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  UPDATE spot_chat_members SET left_at = now()
  WHERE room_id = p_room_id AND profile_id = auth.uid() AND left_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_A_MEMBER';
  END IF;
END;
$$;

-- Clears the whole log for the caller only.
CREATE FUNCTION clear_spot_chat(p_room_id UUID) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  UPDATE spot_chat_members SET cleared_at = clock_timestamp()
  WHERE room_id = p_room_id AND profile_id = auth.uid() AND left_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_A_MEMBER';
  END IF;
END;
$$;

-- Deletes one message for the caller only. Works on anyone's message.
CREATE FUNCTION hide_spot_chat_message(p_message_id UUID) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_room_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  SELECT room_id INTO v_room_id FROM spot_chat_messages WHERE message_id = p_message_id;
  IF v_room_id IS NULL THEN
    RAISE EXCEPTION 'MESSAGE_NOT_FOUND';
  END IF;
  IF NOT _is_spot_chat_member(v_room_id, auth.uid()) THEN
    RAISE EXCEPTION 'NOT_A_MEMBER';
  END IF;

  INSERT INTO spot_chat_hidden_messages (profile_id, message_id)
  VALUES (auth.uid(), p_message_id)
  ON CONFLICT DO NOTHING;
END;
$$;

-- Newest first, keyset-paged on created_at. Hides: anything before the
-- caller's clear, messages they deleted for themselves, held messages
-- (except their own), both directions of any block, and banned senders.
CREATE FUNCTION get_spot_chat_messages(p_room_id UUID, p_before TIMESTAMPTZ DEFAULT NULL, p_limit INTEGER DEFAULT 50)
RETURNS TABLE(
  message_id        UUID,
  body              TEXT,
  created_at        TIMESTAMPTZ,
  is_mine           BOOLEAN,
  is_held           BOOLEAN,
  sender_alias      UUID,
  sender_name       TEXT,
  sender_avatar_url TEXT
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
#variable_conflict use_column
DECLARE v_visible_since TIMESTAMPTZ;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT COALESCE(cleared_at, '-infinity'::TIMESTAMPTZ) INTO v_visible_since
  FROM spot_chat_members
  WHERE room_id = p_room_id AND profile_id = auth.uid() AND left_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_A_MEMBER';
  END IF;

  RETURN QUERY
    SELECT m.message_id, m.body, m.created_at,
           m.sender_id = auth.uid(),
           m.status = 'held',
           mem.alias,
           -- Display name only, never the @username.
           COALESCE(NULLIF(btrim(p.display_name), ''), 'Skater')::TEXT,
           p.avatar_url::TEXT
    FROM spot_chat_messages m
    JOIN profiles p ON p.profile_id = m.sender_id
    LEFT JOIN spot_chat_members mem ON mem.room_id = m.room_id AND mem.profile_id = m.sender_id
    WHERE m.room_id = p_room_id
      AND m.created_at > v_visible_since
      AND (p_before IS NULL OR m.created_at < p_before)
      AND (m.status = 'visible' OR m.sender_id = auth.uid())
      AND NOT EXISTS (
        SELECT 1 FROM spot_chat_hidden_messages h
        WHERE h.profile_id = auth.uid() AND h.message_id = m.message_id
      )
      AND (m.sender_id = auth.uid() OR NOT is_blocked_between(auth.uid(), m.sender_id))
      -- A ban hides the banned skater's messages, as it hides their profile.
      AND (m.sender_id = auth.uid() OR NOT is_banned(m.sender_id))
    ORDER BY m.created_at DESC
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 50), 1), 100);
END;
$$;

-- Returns { "message": {...} } on success or { "blocked": "<reason>" } when
-- the filter refuses it. Refusals return rather than raise, so the filter
-- report written here isn't rolled back.
CREATE FUNCTION send_spot_chat_message(p_room_id UUID, p_body TEXT) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_body    TEXT := btrim(COALESCE(p_body, ''));
  v_reason  TEXT;
  v_message spot_chat_messages;
  v_alias   UUID;
  v_profile profiles;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT _is_spot_chat_member(p_room_id, auth.uid()) THEN
    RAISE EXCEPTION 'NOT_A_MEMBER';
  END IF;
  IF is_banned(auth.uid()) THEN
    RAISE EXCEPTION 'BANNED';
  END IF;
  IF NOT _spot_chat_eligible(auth.uid()) THEN
    RAISE EXCEPTION 'NOT_ELIGIBLE';
  END IF;
  IF char_length(v_body) = 0 THEN
    RAISE EXCEPTION 'EMPTY_MESSAGE';
  END IF;
  IF char_length(v_body) > 2000 THEN
    RAISE EXCEPTION 'MESSAGE_TOO_LONG';
  END IF;
  IF (
    SELECT COUNT(*) FROM spot_chat_messages
    WHERE sender_id = auth.uid() AND created_at > clock_timestamp() - INTERVAL '1 minute'
  ) >= 15 THEN
    RAISE EXCEPTION 'RATE_LIMITED';
  END IF;

  v_reason := _spot_chat_filter(v_body);
  IF v_reason IS NOT NULL THEN
    IF v_reason IN ('slur', 'phone_number', 'email', 'contact_handle') THEN
      INSERT INTO spot_chat_reports (source, room_id, sender_id, body_snapshot, context_snapshot, reason)
      VALUES ('filter', p_room_id, auth.uid(), v_body, _spot_chat_context(p_room_id, clock_timestamp()), v_reason)
      ON CONFLICT (sender_id, room_id, reason) WHERE source = 'filter' AND resolved_at IS NULL
      DO UPDATE SET hit_count = spot_chat_reports.hit_count + 1,
                    last_hit_at = now(),
                    body_snapshot = EXCLUDED.body_snapshot;
    END IF;
    RETURN jsonb_build_object('blocked', v_reason);
  END IF;

  INSERT INTO spot_chat_messages (room_id, sender_id, body, created_at)
  VALUES (p_room_id, auth.uid(), v_body, clock_timestamp())
  RETURNING * INTO v_message;

  SELECT alias INTO v_alias FROM spot_chat_members WHERE room_id = p_room_id AND profile_id = auth.uid();
  SELECT * INTO v_profile FROM profiles WHERE profile_id = auth.uid();

  RETURN jsonb_build_object('message', jsonb_build_object(
    'message_id', v_message.message_id,
    'body', v_message.body,
    'created_at', v_message.created_at,
    'is_mine', true,
    'is_held', false,
    'sender_alias', v_alias,
    'sender_name', COALESCE(NULLIF(btrim(v_profile.display_name), ''), 'Skater'),
    'sender_avatar_url', v_profile.avatar_url
  ));
END;
$$;

-- Blocking by message, since clients never learn the sender's profile id.
-- Same global block as everywhere else (block_profile).
CREATE FUNCTION block_spot_chat_sender(p_message_id UUID) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_message spot_chat_messages;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  SELECT * INTO v_message FROM spot_chat_messages WHERE message_id = p_message_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'MESSAGE_NOT_FOUND';
  END IF;
  IF NOT _is_spot_chat_member(v_message.room_id, auth.uid()) THEN
    RAISE EXCEPTION 'NOT_A_MEMBER';
  END IF;
  IF v_message.sender_id = auth.uid() THEN
    RAISE EXCEPTION 'CANNOT_BLOCK_SELF';
  END IF;

  PERFORM block_profile(v_message.sender_id);
END;
$$;

CREATE FUNCTION report_spot_chat_message(
  p_message_id UUID,
  p_reason     TEXT,
  p_details    TEXT DEFAULT NULL,
  p_block      BOOLEAN DEFAULT false
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_message spot_chat_messages;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_reason NOT IN ('harassment', 'spam', 'inappropriate_content', 'personal_info', 'threat', 'self_harm', 'other') THEN
    RAISE EXCEPTION 'INVALID_REASON';
  END IF;
  SELECT * INTO v_message FROM spot_chat_messages WHERE message_id = p_message_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'MESSAGE_NOT_FOUND';
  END IF;
  IF NOT _is_spot_chat_member(v_message.room_id, auth.uid()) THEN
    RAISE EXCEPTION 'NOT_A_MEMBER';
  END IF;
  IF v_message.sender_id = auth.uid() THEN
    RAISE EXCEPTION 'CANNOT_REPORT_OWN_MESSAGE';
  END IF;

  INSERT INTO spot_chat_reports (source, message_id, room_id, sender_id, reported_by,
                                 body_snapshot, context_snapshot, reason, details)
  VALUES ('user', p_message_id, v_message.room_id, v_message.sender_id, auth.uid(),
          v_message.body, _spot_chat_context(v_message.room_id, v_message.created_at), p_reason,
          NULLIF(btrim(COALESCE(p_details, '')), ''))
  ON CONFLICT (message_id, reported_by) WHERE source = 'user' DO NOTHING;

  IF p_block THEN
    PERFORM block_profile(v_message.sender_id);
  END IF;
END;
$$;

-- ── Scan result (service role only, from moderate-spot-chat) ────────────
CREATE FUNCTION moderation_hold_spot_chat_message(p_message_id UUID, p_reason TEXT, p_scores JSONB)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_message spot_chat_messages;
BEGIN
  UPDATE spot_chat_messages SET status = 'held'
  WHERE message_id = p_message_id AND status = 'visible'
  RETURNING * INTO v_message;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  INSERT INTO spot_chat_reports (source, message_id, room_id, sender_id, body_snapshot,
                                 context_snapshot, reason, scores)
  VALUES ('scan', p_message_id, v_message.room_id, v_message.sender_id, v_message.body,
          _spot_chat_context(v_message.room_id, v_message.created_at), p_reason, p_scores)
  ON CONFLICT (message_id) WHERE source = 'scan' DO NOTHING;
END;
$$;

-- ── Admin ───────────────────────────────────────────────────────────────
-- Urgent reasons first. The text is left out here -- admin_open_spot_chat_report
-- returns it and writes the audit log, as with DM reports.
CREATE FUNCTION admin_list_spot_chat_reports()
RETURNS TABLE(
  report_id           UUID,
  source              TEXT,
  message_id          UUID,
  message_held        BOOLEAN,
  spot_name           TEXT,
  sender_id           UUID,
  sender_username     TEXT,
  sender_display_name TEXT,
  sender_banned       BOOLEAN,
  reason              TEXT,
  details             TEXT,
  hit_count           INTEGER,
  is_urgent           BOOLEAN,
  created_at          TIMESTAMPTZ,
  last_hit_at         TIMESTAMPTZ
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'NOT_ADMIN';
  END IF;

  RETURN QUERY
    SELECT r.report_id, r.source, r.message_id, COALESCE(m.status = 'held', false),
           COALESCE(us.name, os.name, 'Deleted spot')::TEXT,
           r.sender_id, p.username::TEXT, p.display_name::TEXT, is_banned(r.sender_id),
           r.reason, r.details, r.hit_count,
           r.reason IN ('threat', 'self_harm', 'sexual', 'phone_number', 'email', 'contact_handle'),
           r.created_at, r.last_hit_at
    FROM spot_chat_reports r
    JOIN profiles p ON p.profile_id = r.sender_id
    LEFT JOIN spot_chat_messages m ON m.message_id = r.message_id
    LEFT JOIN spot_chat_rooms room ON room.room_id = r.room_id
    LEFT JOIN user_spots us ON us.spot_id = room.spot_id
    LEFT JOIN osm_spots os ON os.place_id = room.osm_spot_place_id
    WHERE r.resolved_at IS NULL
    ORDER BY 13 DESC, r.created_at ASC;
END;
$$;

-- Logged. Context lines are labelled with usernames here, at read time, so
-- the stored copy holds profile ids only.
CREATE FUNCTION admin_open_spot_chat_report(p_report_id UUID)
RETURNS TABLE(body_snapshot TEXT, context JSONB)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'NOT_ADMIN';
  END IF;

  INSERT INTO admin_audit_log (admin_id, action, target_type, target_id)
  VALUES (auth.uid(), 'spot_chat_report_viewed', 'spot_chat_report', p_report_id::TEXT);

  RETURN QUERY
    SELECT r.body_snapshot,
           COALESCE((
             SELECT jsonb_agg(jsonb_build_object(
                      'sender_id', c->>'sender_id',
                      'sender_username', cp.username,
                      'body', c->>'body',
                      'created_at', c->>'created_at'
                    ) ORDER BY c->>'created_at')
             FROM jsonb_array_elements(COALESCE(r.context_snapshot, '[]'::JSONB)) c
             LEFT JOIN profiles cp ON cp.profile_id = (c->>'sender_id')::UUID
           ), '[]'::JSONB)
    FROM spot_chat_reports r
    WHERE r.report_id = p_report_id;
END;
$$;

-- Dismissing the last open report on a held message restores it.
CREATE FUNCTION admin_dismiss_spot_chat_report(p_report_id UUID) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_message_id UUID;
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'NOT_ADMIN';
  END IF;

  UPDATE spot_chat_reports SET resolved_at = now(), resolved_by = auth.uid(), resolution = 'dismissed'
  WHERE report_id = p_report_id AND resolved_at IS NULL
  RETURNING message_id INTO v_message_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'REPORT_NOT_PENDING';
  END IF;

  IF v_message_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM spot_chat_reports WHERE message_id = v_message_id AND resolved_at IS NULL
  ) THEN
    UPDATE spot_chat_messages SET status = 'visible' WHERE message_id = v_message_id AND status = 'held';
  END IF;

  INSERT INTO admin_audit_log (admin_id, action, target_type, target_id, notes)
  VALUES (auth.uid(), 'report_resolved', 'spot_chat_report', p_report_id::TEXT, 'dismissed');
END;
$$;

-- Deletes the message for everyone and resolves every open report on it
-- (first, since message_id is ON DELETE SET NULL).
CREATE FUNCTION admin_remove_spot_chat_message(p_message_id UUID) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'NOT_ADMIN';
  END IF;

  UPDATE spot_chat_reports SET resolved_at = now(), resolved_by = auth.uid(), resolution = 'message_removed'
  WHERE message_id = p_message_id AND resolved_at IS NULL;

  DELETE FROM spot_chat_messages WHERE message_id = p_message_id;

  INSERT INTO admin_audit_log (admin_id, action, target_type, target_id)
  VALUES (auth.uid(), 'spot_chat_message_removed', 'spot_chat_message', p_message_id::TEXT);
END;
$$;

-- admin_ban_user (20261009000000) also closes open spot chat reports
-- against the banned sender.
CREATE OR REPLACE FUNCTION admin_ban_user(p_profile_id UUID, p_reason TEXT) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_ban_id UUID;
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'NOT_ADMIN';
  END IF;
  IF is_admin(p_profile_id) THEN
    RAISE EXCEPTION 'CANNOT_BAN_ADMIN';
  END IF;
  IF is_banned(p_profile_id) THEN
    RAISE EXCEPTION 'ALREADY_BANNED';
  END IF;

  INSERT INTO user_bans (profile_id, reason, banned_by)
  VALUES (p_profile_id, p_reason, auth.uid())
  RETURNING ban_id INTO v_ban_id;

  UPDATE profile_reports SET resolved_at = now(), resolved_by = auth.uid(), resolution = 'banned'
  WHERE profile_id = p_profile_id AND resolved_at IS NULL;

  UPDATE message_reports SET resolved_at = now(), resolved_by = auth.uid(), resolution = 'banned'
  WHERE sender_id = p_profile_id AND resolved_at IS NULL;

  UPDATE spot_chat_reports SET resolved_at = now(), resolved_by = auth.uid(), resolution = 'banned'
  WHERE sender_id = p_profile_id AND resolved_at IS NULL;

  INSERT INTO admin_audit_log (admin_id, action, target_type, target_id, notes)
  VALUES (auth.uid(), 'user_banned', 'profile', p_profile_id::TEXT, p_reason);

  RETURN v_ban_id;
END;
$$;

-- ── Retention: report copies kept 90 days after resolution ──────────────
CREATE FUNCTION purge_resolved_spot_chat_report_snapshots() RETURNS VOID
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE spot_chat_reports
  SET body_snapshot = NULL, context_snapshot = NULL, details = NULL, scores = NULL
  WHERE resolved_at < now() - INTERVAL '90 days'
    AND (body_snapshot IS NOT NULL OR context_snapshot IS NOT NULL OR details IS NOT NULL OR scores IS NOT NULL);
$$;

SELECT cron.schedule(
  'purge-spot-chat-report-snapshots',
  '23 3 * * *',
  'SELECT public.purge_resolved_spot_chat_report_snapshots()'
);

-- ── Data export ─────────────────────────────────────────────────────────
-- export_my_data() gains the caller's spot chats and the spot chat reports
-- they filed. Patched in place, like 20261104170400_drop_clips.sql, rather
-- than restating the whole function.
--
-- Per room: everything the caller sent (including messages they deleted for
-- themselves or that moderation hid), plus other people's messages they can
-- still see in the app. Others are named the way the app names them -- by
-- display name, never @username -- and blocked or banned senders are left
-- out, so the export never reveals more than the chat does. Reports filed
-- against the caller (including filter and scan flags) are staff records
-- and aren't exported, the same as message_reports.
DO $$
DECLARE
  v_old TEXT := pg_get_functiondef('public.export_my_data'::regproc);
  v_new TEXT := replace(
    v_old,
    $r$'friends_and_requests', v_friends,$r$,
    $r$'friends_and_requests', v_friends,
    'spot_chats', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
               'spot', COALESCE(us.name, os.name, 'Deleted spot'),
               'joined_at', mem.joined_at,
               'left_at', mem.left_at,
               'cleared_at', mem.cleared_at,
               'messages', (
                 SELECT COALESCE(jsonb_agg(jsonb_build_object(
                          'from', CASE WHEN m.sender_id = v_uid THEN 'me'
                                       ELSE COALESCE(NULLIF(btrim(sp.display_name), ''), 'Skater') END,
                          'body', m.body,
                          'sent_at', m.created_at,
                          'hidden_by_moderation', m.sender_id = v_uid AND m.status = 'held',
                          'deleted_for_me', EXISTS (
                            SELECT 1 FROM spot_chat_hidden_messages h
                            WHERE h.profile_id = v_uid AND h.message_id = m.message_id
                          )
                        ) ORDER BY m.created_at), '[]'::JSONB)
                 FROM spot_chat_messages m
                 JOIN profiles sp ON sp.profile_id = m.sender_id
                 WHERE m.room_id = mem.room_id
                   AND (m.sender_id = v_uid OR (
                         m.status = 'visible'
                     AND m.created_at > COALESCE(mem.cleared_at, '-infinity'::TIMESTAMPTZ)
                     AND NOT EXISTS (
                           SELECT 1 FROM spot_chat_hidden_messages h
                           WHERE h.profile_id = v_uid AND h.message_id = m.message_id
                         )
                     AND NOT is_blocked_between(v_uid, m.sender_id)
                     AND NOT is_banned(m.sender_id)
                   ))
               )
             ) ORDER BY mem.joined_at), '[]'::JSONB)
      FROM spot_chat_members mem
      JOIN spot_chat_rooms room ON room.room_id = mem.room_id
      LEFT JOIN user_spots us ON us.spot_id = room.spot_id
      LEFT JOIN osm_spots os ON os.place_id = room.osm_spot_place_id
      WHERE mem.profile_id = v_uid
    ),$r$
  );
BEGIN
  IF v_new = v_old THEN
    RAISE EXCEPTION 'export_my_data no longer has the expected friends_and_requests entry';
  END IF;
  EXECUTE v_new;
END;
$$;

DO $$
DECLARE
  v_old TEXT := pg_get_functiondef('public.export_my_data'::regproc);
  v_new TEXT := replace(
    v_old,
    $r$'posts', _export_rows('post_reports', 'profile_id', v_uid, ARRAY['resolved_by'])$r$,
    $r$'posts', _export_rows('post_reports', 'profile_id', v_uid, ARRAY['resolved_by']),
      'spot_chat_messages', (
        SELECT COALESCE(jsonb_agg(jsonb_build_object(
                 'reason', r.reason, 'details', r.details, 'created_at', r.created_at, 'resolution', r.resolution
               )), '[]'::JSONB)
        FROM spot_chat_reports r WHERE r.reported_by = v_uid
      )$r$
  );
BEGIN
  IF v_new = v_old THEN
    RAISE EXCEPTION 'export_my_data no longer has the expected post_reports entry';
  END IF;
  EXECUTE v_new;
END;
$$;

-- ── Realtime ────────────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE spot_chat_rooms;

-- ── Execute privileges ──────────────────────────────────────────────────
DO $$
DECLARE
  fn REGPROCEDURE;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    '_spot_chat_eligible(uuid)', '_is_spot_chat_member(uuid,uuid)', '_spot_chat_filter(text)',
    '_spot_chat_context(uuid,timestamptz)', '_on_spot_chat_message_change()', '_request_spot_chat_scan()',
    'moderation_hold_spot_chat_message(uuid,text,jsonb)', 'purge_resolved_spot_chat_report_snapshots()'
  ]::REGPROCEDURE[] LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn);
  END LOOP;

  FOREACH fn IN ARRAY ARRAY[
    'is_my_spot_chat(uuid)', 'get_spot_chat_room(uuid,text)', 'join_spot_chat(uuid,text)',
    'leave_spot_chat(uuid)', 'clear_spot_chat(uuid)', 'hide_spot_chat_message(uuid)',
    'get_spot_chat_messages(uuid,timestamptz,integer)', 'send_spot_chat_message(uuid,text)',
    'block_spot_chat_sender(uuid)', 'report_spot_chat_message(uuid,text,text,boolean)',
    'admin_list_spot_chat_reports()', 'admin_open_spot_chat_report(uuid)',
    'admin_dismiss_spot_chat_report(uuid)', 'admin_remove_spot_chat_message(uuid)'
  ]::REGPROCEDURE[] LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', fn);
  END LOOP;
END;
$$;
