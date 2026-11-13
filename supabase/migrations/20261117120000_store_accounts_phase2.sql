-- Store accounts, Phase 2 (docs/ACCOUNT_TYPES.md, "Store"):
--   * the owner-managed store page (owner-only edits once a store is claimed)
--   * an approved Store's social features: feed posts, followers and DMs
--   * pending (unapproved) Store accounts refused by the social RPCs
--   * DM rules: any skater can message an approved store, and a store can
--     start a DM only with an Adult who follows it (never a Child)
--   * store posts can tag Adults only, and nobody tags a Store as a skater
--   * nearby stores, at each store's fixed location
--
-- Until the Child band lands, "Adult" means a skater account that has passed
-- the 18+ gate (age_confirmed_at). Everything else is treated as a Child.

-- ── 1. Helpers ─────────────────────────────────────────────────────────────

CREATE FUNCTION _is_adult(p_profile_id UUID) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE profile_id = p_profile_id AND account_type = 'user' AND age_confirmed_at IS NOT NULL
  );
$$;

-- A Store account whose claim isn't approved: dashboard only, no social.
CREATE FUNCTION _store_social_blocked(p_profile_id UUID) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _is_store_account(p_profile_id) AND NOT _is_approved_store(p_profile_id);
$$;

-- The approved owner of a store entity, or NULL.
CREATE FUNCTION _store_owner(p_store_id UUID, p_osm_place_id TEXT) RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT profile_id FROM store_claims
  WHERE status = 'approved'
    AND ((p_store_id IS NOT NULL AND store_id = p_store_id)
      OR (p_osm_place_id IS NOT NULL AND osm_place_id = p_osm_place_id))
  LIMIT 1;
$$;

-- Whether the owner can edit the whole page. Phase 3 narrows this for
-- unpaid stores (opening hours only).
CREATE FUNCTION _store_can_edit_page(p_profile_id UUID) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _is_approved_store(p_profile_id) AND NOT _is_banned(p_profile_id);
$$;

-- Who can DM whom. p_existing: the pair already has a conversation, which
-- is how a store replies to a skater (Adult or Child) who messaged it first.
CREATE FUNCTION _dm_allowed(p_from UUID, p_to UUID, p_existing BOOLEAN) RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_from_store BOOLEAN := _is_store_account(p_from);
  v_to_store   BOOLEAN := _is_store_account(p_to);
BEGIN
  IF v_from_store AND v_to_store THEN
    RETURN false;
  ELSIF NOT v_from_store AND NOT v_to_store THEN
    RETURN are_friends(p_from, p_to);
  ELSIF v_to_store THEN
    -- A skater writing to a store.
    RETURN _is_approved_store(p_to);
  ELSE
    -- A store writing to a skater.
    RETURN _is_approved_store(p_from) AND (
      p_existing
      OR (_is_adult(p_to)
          AND EXISTS (SELECT 1 FROM crew_follows WHERE follower_id = p_to AND following_id = p_from))
    );
  END IF;
END;
$$;

CREATE FUNCTION _dm_denied_code(p_from UUID, p_to UUID) RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN _is_store_account(p_from) OR _is_store_account(p_to) THEN 'DM_NOT_ALLOWED' ELSE 'NOT_FRIENDS' END;
$$;

-- Stores aren't skaters, so nobody tags one (tag its store entity instead),
-- and a store can only tag Adults.
CREATE FUNCTION _can_tag(p_tagger UUID, p_tagged UUID) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT NOT _is_store_account(p_tagged)
     AND (NOT _is_store_account(p_tagger) OR _is_adult(p_tagged));
$$;

-- ── 2. Owner-authored page fields ──────────────────────────────────────────
-- The owner's name, description and website. Address and location stay on
-- the store entity (an admin moves a store, not the owner).

ALTER TABLE store_public_details
  ADD COLUMN name        TEXT CHECK (char_length(btrim(name)) BETWEEN 2 AND 120),
  ADD COLUMN description TEXT CHECK (char_length(description) <= 2000),
  ADD COLUMN website     TEXT CHECK (char_length(website) <= 300);

-- ── 3. The Store's public identity on approval ─────────────────────────────
-- A Store account never goes through skater onboarding, so on approval it
-- gets a display name (the store's), a username (for @mentions and
-- notifications) and a public, never-nearby profile.

CREATE FUNCTION _store_username_from(p_name TEXT, p_profile_id UUID) RETURNS TEXT
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_base TEXT := left(btrim(regexp_replace(lower(coalesce(p_name, 'store')), '[^a-z0-9]+', '_', 'g'), '_'), 20);
  v_candidate TEXT;
  i INT := 0;
BEGIN
  IF char_length(v_base) < 3 THEN
    v_base := 'store';
  END IF;
  v_candidate := v_base;
  WHILE EXISTS (SELECT 1 FROM profiles WHERE username = v_candidate AND profile_id <> p_profile_id) LOOP
    i := i + 1;
    v_candidate := v_base || '_' || substr(md5(p_profile_id::TEXT || i::TEXT), 1, 4);
  END LOOP;
  RETURN v_candidate;
END;
$$;

-- onboarding_completed doubles as "approved" for routing: an approved Store
-- gets the normal app, anything else only its dashboard. The server checks
-- approval itself, so a client that flips the flag gets nothing extra.
CREATE FUNCTION _on_store_claim_status() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_name TEXT;
BEGIN
  IF NEW.status <> 'approved' THEN
    -- Revoked (an ownership transfer): back to the dashboard.
    UPDATE profiles SET onboarding_completed = false WHERE profile_id = NEW.profile_id;
    RETURN NEW;
  END IF;

  SELECT coalesce(d.name, us.name, os.name) INTO v_name
  FROM (SELECT NEW.profile_id AS profile_id) x
  LEFT JOIN store_public_details d ON d.profile_id = x.profile_id
  LEFT JOIN user_stores us ON us.store_id = NEW.store_id
  LEFT JOIN osm_stores os ON os.place_id = NEW.osm_place_id;

  UPDATE profiles SET
    display_name = v_name,
    username = coalesce(username, _store_username_from(v_name, NEW.profile_id)),
    is_private = false,
    show_in_nearby = false,
    onboarding_completed = true
  WHERE profile_id = NEW.profile_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER store_claim_status_identity
  AFTER UPDATE OF status ON store_claims
  FOR EACH ROW WHEN ((NEW.status = 'approved') IS DISTINCT FROM (OLD.status = 'approved'))
  EXECUTE FUNCTION _on_store_claim_status();

-- Backfill any store approved before this migration.
UPDATE profiles p SET
  display_name = coalesce(d.name, us.name, os.name),
  username = coalesce(p.username, _store_username_from(coalesce(d.name, us.name, os.name), p.profile_id)),
  is_private = false,
  show_in_nearby = false,
  onboarding_completed = true
FROM store_claims c
LEFT JOIN store_public_details d ON d.profile_id = c.profile_id
LEFT JOIN user_stores us ON us.store_id = c.store_id
LEFT JOIN osm_stores os ON os.place_id = c.osm_place_id
WHERE c.status = 'approved' AND p.profile_id = c.profile_id;

-- ── 4. Store page RPCs ─────────────────────────────────────────────────────

-- The official layer of a store page, or NULL when nobody owns the store.
CREATE FUNCTION get_store_page(p_store_id UUID, p_osm_place_id TEXT) RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_owner UUID := _store_owner(p_store_id, p_osm_place_id);
  v_result JSONB;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;
  IF v_owner IS NULL OR _is_banned(v_owner) OR is_blocked_between(v_uid, v_owner) THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_build_object(
    'owner_id', v_owner,
    'username', p.username,
    -- Until the owner first saves the page, the listing's details show.
    'name', coalesce(d.name, us.name, os.name, p.display_name),
    'description', CASE WHEN d.name IS NULL THEN coalesce(us.description, os.description) ELSE d.description END,
    'website', CASE WHEN d.name IS NULL THEN coalesce(us.website, os.website) ELSE d.website END,
    'public_phone', CASE WHEN d.name IS NULL THEN coalesce(d.public_phone, us.phone, os.phone) ELSE d.public_phone END,
    'public_email', d.public_email,
    'logo_path', d.logo_path,
    'cover_path', d.cover_path,
    'follower_count', (SELECT count(*) FROM crew_follows WHERE following_id = v_owner),
    'is_owner', v_owner = v_uid,
    'is_following', EXISTS (SELECT 1 FROM crew_follows WHERE follower_id = v_uid AND following_id = v_owner),
    'can_message', v_owner <> v_uid AND NOT _is_store_account(v_uid) AND NOT _is_banned(v_uid)
  ) INTO v_result
  FROM profiles p
  JOIN store_claims c ON c.profile_id = p.profile_id AND c.status = 'approved'
  LEFT JOIN store_public_details d ON d.profile_id = p.profile_id
  LEFT JOIN user_stores us ON us.store_id = c.store_id
  LEFT JOIN osm_stores os ON os.place_id = c.osm_place_id
  WHERE p.profile_id = v_owner;

  RETURN v_result;
END;
$$;

-- Which store an approved Store account owns, so a profile link (a post
-- header, a follower list) can open the store page instead.
CREATE FUNCTION get_store_for_profile(p_profile_id UUID) RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object('store_id', store_id, 'osm_place_id', osm_place_id)
  FROM store_claims
  WHERE profile_id = p_profile_id AND status = 'approved' AND auth.uid() IS NOT NULL
  LIMIT 1;
$$;

-- The owner's editor: everything on the page except opening hours and
-- facilities (those stay in store_metadata, see upsert_store_metadata).
-- p_logo_url is the logo's public URL, used as the account's avatar so post
-- headers show it. It must be the public URL of p_logo_path.
CREATE FUNCTION update_store_page(
  p_name         TEXT,
  p_description  TEXT,
  p_website      TEXT,
  p_public_phone TEXT,
  p_public_email TEXT,
  p_logo_path    TEXT,
  p_cover_path   TEXT,
  p_logo_url     TEXT
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := _assert_store_caller();
  v_prefix TEXT := v_uid::TEXT || '/';
  v_claim store_claims%ROWTYPE;
  v_name TEXT := btrim(coalesce(p_name, ''));
  v_website TEXT := NULLIF(btrim(p_website), '');
BEGIN
  IF NOT _store_can_edit_page(v_uid) THEN
    RAISE EXCEPTION 'STORE_NOT_APPROVED';
  END IF;
  SELECT * INTO v_claim FROM store_claims WHERE profile_id = v_uid AND status = 'approved';

  IF char_length(v_name) NOT BETWEEN 2 AND 120 THEN
    RAISE EXCEPTION 'INVALID_NAME';
  END IF;
  IF (p_logo_path IS NOT NULL AND left(p_logo_path, length(v_prefix)) <> v_prefix)
     OR (p_cover_path IS NOT NULL AND left(p_cover_path, length(v_prefix)) <> v_prefix) THEN
    RAISE EXCEPTION 'INVALID_IMAGE_PATH';
  END IF;
  IF p_logo_path IS NOT NULL AND (p_logo_url IS NULL OR right(p_logo_url, length('/store-images/' || p_logo_path)) <> '/store-images/' || p_logo_path) THEN
    RAISE EXCEPTION 'INVALID_IMAGE_PATH';
  END IF;
  IF v_website IS NOT NULL AND v_website !~* '^https?://[^\s/]+\.[^\s]+$' THEN
    RAISE EXCEPTION 'INVALID_WEBSITE';
  END IF;

  INSERT INTO store_public_details (profile_id, name, description, website, public_phone, public_email, logo_path, cover_path)
  VALUES (v_uid, v_name, NULLIF(btrim(p_description), ''), v_website,
          NULLIF(btrim(p_public_phone), ''), NULLIF(btrim(p_public_email), ''), p_logo_path, p_cover_path)
  ON CONFLICT (profile_id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    website = EXCLUDED.website,
    public_phone = EXCLUDED.public_phone,
    public_email = EXCLUDED.public_email,
    logo_path = EXCLUDED.logo_path,
    cover_path = EXCLUDED.cover_path,
    updated_at = now();

  UPDATE profiles SET
    display_name = v_name,
    avatar_url = CASE WHEN p_logo_path IS NULL THEN NULL ELSE p_logo_url END
  WHERE profile_id = v_uid;

  -- A user-created store's own row is what the map and search show, so it
  -- follows the owner's page. OSM rows are reseeded, so they're left alone
  -- and the page layer overrides them on the store page.
  IF v_claim.store_id IS NOT NULL THEN
    UPDATE user_stores SET
      name = v_name,
      description = NULLIF(btrim(p_description), ''),
      website = v_website,
      phone = NULLIF(btrim(p_public_phone), ''),
      updated_at = now()
    WHERE store_id = v_claim.store_id;
  END IF;
END;
$$;

-- The approved owner's page as the editor loads it.
CREATE FUNCTION get_my_store_page() RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := _assert_store_caller();
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'store_id', c.store_id,
    'osm_place_id', c.osm_place_id,
    'entity_name', coalesce(us.name, os.name),
    'address', coalesce(us.address, os.address),
    'name', coalesce(d.name, us.name, os.name),
    'description', CASE WHEN d.name IS NULL THEN coalesce(us.description, os.description) ELSE d.description END,
    'website', CASE WHEN d.name IS NULL THEN coalesce(us.website, os.website) ELSE d.website END,
    'public_phone', CASE WHEN d.name IS NULL THEN coalesce(d.public_phone, us.phone, os.phone) ELSE d.public_phone END,
    'public_email', d.public_email,
    'logo_path', d.logo_path,
    'cover_path', d.cover_path,
    'follower_count', (SELECT count(*) FROM crew_follows WHERE following_id = v_uid),
    'can_edit', _store_can_edit_page(v_uid)
  ) INTO v_result
  FROM store_claims c
  LEFT JOIN store_public_details d ON d.profile_id = c.profile_id
  LEFT JOIN user_stores us ON us.store_id = c.store_id
  LEFT JOIN osm_stores os ON os.place_id = c.osm_place_id
  WHERE c.profile_id = v_uid AND c.status = 'approved';

  RETURN v_result;
END;
$$;

-- Approved stores near a point, at the store's fixed location (a store
-- never reports a live location).
CREATE FUNCTION search_nearby_stores(p_lat DOUBLE PRECISION, p_lng DOUBLE PRECISION)
RETURNS TABLE (
  profile_id   UUID,
  name         TEXT,
  logo_path    TEXT,
  store_id     UUID,
  osm_place_id TEXT,
  meters       DOUBLE PRECISION
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
#variable_conflict use_column
DECLARE
  c_radius_m CONSTANT DOUBLE PRECISION := 50000;
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;
  IF p_lat IS NULL OR p_lng IS NULL OR p_lat NOT BETWEEN -90 AND 90 OR p_lng NOT BETWEEN -180 AND 180 THEN
    RAISE EXCEPTION 'INVALID_LOCATION';
  END IF;

  RETURN QUERY
  SELECT * FROM (
    SELECT c.profile_id,
           coalesce(d.name, us.name, os.name),
           d.logo_path,
           c.store_id,
           c.osm_place_id,
           _haversine_meters(p_lat, p_lng, coalesce(us.latitude, os.latitude), coalesce(us.longitude, os.longitude)) AS meters
    FROM store_claims c
    LEFT JOIN store_public_details d ON d.profile_id = c.profile_id
    LEFT JOIN user_stores us ON us.store_id = c.store_id
    LEFT JOIN osm_stores os ON os.place_id = c.osm_place_id
    WHERE c.status = 'approved'
      AND NOT _is_banned(c.profile_id)
      AND NOT is_blocked_between(v_uid, c.profile_id)
  ) s
  WHERE s.meters <= c_radius_m
  ORDER BY s.meters
  LIMIT 20;
END;
$$;

-- ── 5. Page authority: community metadata edits stop once a store is owned ──

CREATE OR REPLACE FUNCTION upsert_store_metadata(
  p_store_id UUID, p_osm_place_id TEXT, p_opening_hours JSONB, p_facilities TEXT[],
  p_parking TEXT, p_pet_friendly BOOLEAN, p_paid BOOLEAN, p_well_lit BOOLEAN
) RETURNS store_metadata
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_owner UUID;
  v_row store_metadata;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF (p_store_id IS NULL) = (p_osm_place_id IS NULL) THEN
    RAISE EXCEPTION 'Exactly one of p_store_id or p_osm_place_id must be provided';
  END IF;

  v_owner := _store_owner(p_store_id, p_osm_place_id);
  IF v_owner IS NOT NULL AND v_owner <> v_uid THEN
    RAISE EXCEPTION 'OWNER_MANAGED';
  END IF;
  -- A Store account edits only its own store, and only once approved.
  IF _is_store_account(v_uid) AND (v_owner IS NULL OR _is_banned(v_uid)) THEN
    RAISE EXCEPTION 'OWNER_MANAGED';
  END IF;

  IF p_store_id IS NOT NULL THEN
    UPDATE store_metadata SET
      opening_hours = p_opening_hours, facilities = p_facilities, parking = p_parking,
      pet_friendly = p_pet_friendly, paid = p_paid, well_lit = p_well_lit,
      last_updated_by = v_uid, updated_at = now()
    WHERE store_id = p_store_id
    RETURNING * INTO v_row;

    IF v_row IS NULL THEN
      INSERT INTO store_metadata (store_id, opening_hours, facilities, parking, pet_friendly, paid, well_lit, last_updated_by, updated_at)
        VALUES (p_store_id, p_opening_hours, p_facilities, p_parking, p_pet_friendly, p_paid, p_well_lit, v_uid, now())
        RETURNING * INTO v_row;
    END IF;
  ELSE
    UPDATE store_metadata SET
      opening_hours = p_opening_hours, facilities = p_facilities, parking = p_parking,
      pet_friendly = p_pet_friendly, paid = p_paid, well_lit = p_well_lit,
      last_updated_by = v_uid, updated_at = now()
    WHERE osm_place_id = p_osm_place_id
    RETURNING * INTO v_row;

    IF v_row IS NULL THEN
      INSERT INTO store_metadata (osm_place_id, opening_hours, facilities, parking, pet_friendly, paid, well_lit, last_updated_by, updated_at)
        VALUES (p_osm_place_id, p_opening_hours, p_facilities, p_parking, p_pet_friendly, p_paid, p_well_lit, v_uid, now())
        RETURNING * INTO v_row;
    END IF;
  END IF;

  RETURN v_row;
END;
$$;

-- Stores don't review stores (a competitor's or their own).
CREATE OR REPLACE FUNCTION create_store_review(
  p_store_id UUID, p_osm_place_id TEXT, p_heading TEXT, p_rating NUMERIC, p_comment TEXT
) RETURNS store_reviews
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_review store_reviews;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF _is_store_account(auth.uid()) THEN
    RAISE EXCEPTION 'STORE_ACCOUNT';
  END IF;
  IF NOT has_manual_checkin(NULL, NULL, p_store_id, p_osm_place_id) THEN
    RAISE EXCEPTION 'NOT_CHECKED_IN';
  END IF;

  INSERT INTO store_reviews (profile_id, store_id, osm_place_id, heading, rating, comment)
  VALUES (auth.uid(), p_store_id, p_osm_place_id, p_heading, p_rating, p_comment)
  RETURNING * INTO v_review;

  RETURN v_review;
END;
$$;

-- ── 6. Social RPCs ─────────────────────────────────────────────────────────

-- Spot chats: skaters only (no advertising), on top of the 18+ gate.
CREATE OR REPLACE FUNCTION _spot_chat_eligible(p_profile_id UUID) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE profile_id = p_profile_id AND account_type = 'user' AND age_confirmed_at IS NOT NULL
  ) AND NOT _is_banned(p_profile_id);
$$;

-- Follows: a pending Store can't follow, and only an approved Store can be
-- followed. Unfollowing always works.
CREATE OR REPLACE FUNCTION toggle_follow(p_profile_id UUID) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;
  IF p_profile_id = auth.uid() THEN
    RAISE EXCEPTION 'CANNOT_FOLLOW_SELF';
  END IF;

  DELETE FROM crew_follows WHERE follower_id = auth.uid() AND following_id = p_profile_id;
  IF FOUND THEN
    RETURN false;
  END IF;

  IF _store_social_blocked(auth.uid()) THEN
    RAISE EXCEPTION 'STORE_NOT_APPROVED';
  END IF;
  IF NOT can_view_profile(auth.uid(), p_profile_id) OR _store_social_blocked(p_profile_id) THEN
    RAISE EXCEPTION 'PROFILE_NOT_FOUND';
  END IF;
  IF (SELECT is_private FROM profiles WHERE profile_id = p_profile_id) THEN
    RAISE EXCEPTION 'PROFILE_PRIVATE';
  END IF;
  INSERT INTO crew_follows (follower_id, following_id) VALUES (auth.uid(), p_profile_id);
  RETURN true;
END;
$$;

-- DMs: friends between skaters, plus the store rules in _dm_allowed.
CREATE OR REPLACE FUNCTION open_conversation(p_other_profile_id UUID) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_conversation_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_other_profile_id = auth.uid() THEN
    RAISE EXCEPTION 'CANNOT_MESSAGE_SELF';
  END IF;
  IF is_blocked_between(auth.uid(), p_other_profile_id) THEN
    RAISE EXCEPTION 'BLOCKED';
  END IF;

  -- Serializes concurrent opens for the same pair, so two taps (or both
  -- users at once) can't create two conversations.
  PERFORM pg_advisory_xact_lock(
    hashtext(LEAST(auth.uid(), p_other_profile_id)::TEXT || GREATEST(auth.uid(), p_other_profile_id)::TEXT)
  );

  SELECT a.conversation_id INTO v_conversation_id
  FROM conversation_members a
  JOIN conversation_members b ON b.conversation_id = a.conversation_id
  WHERE a.profile_id = auth.uid() AND b.profile_id = p_other_profile_id
  LIMIT 1;

  IF NOT _dm_allowed(auth.uid(), p_other_profile_id, v_conversation_id IS NOT NULL) THEN
    RAISE EXCEPTION '%', _dm_denied_code(auth.uid(), p_other_profile_id);
  END IF;

  IF v_conversation_id IS NOT NULL THEN
    RETURN v_conversation_id;
  END IF;

  INSERT INTO conversations DEFAULT VALUES RETURNING conversation_id INTO v_conversation_id;
  INSERT INTO conversation_members (conversation_id, profile_id)
  VALUES (v_conversation_id, auth.uid()), (v_conversation_id, p_other_profile_id);

  RETURN v_conversation_id;
END;
$$;

-- The rest are small edits to long live functions, applied in place so
-- this migration doesn't restate them. Each one fails loudly if the text it
-- expects has changed.
DO $do$
DECLARE
  v_def TEXT;
BEGIN
  -- send_message: same rule as open_conversation (the pair is in a
  -- conversation already, so a store can reply).
  v_def := pg_get_functiondef('send_message(uuid, text)'::REGPROCEDURE);
  v_def := replace(v_def, $a$IF NOT are_friends(auth.uid(), v_other_id) THEN$a$,
                          $b$IF NOT _dm_allowed(auth.uid(), v_other_id, true) THEN$b$);
  v_def := replace(v_def, $a$RAISE EXCEPTION 'NOT_FRIENDS';$a$,
                          $b$RAISE EXCEPTION '%', _dm_denied_code(auth.uid(), v_other_id);$b$);
  IF position('_dm_allowed' IN v_def) = 0 OR position('_dm_denied_code' IN v_def) = 0 THEN
    RAISE EXCEPTION 'send_message rewrite did not apply';
  END IF;
  EXECUTE v_def;

  -- send_friend_request: stores don't have friends.
  v_def := pg_get_functiondef('send_friend_request(uuid)'::REGPROCEDURE);
  v_def := replace(v_def, $a$IF p_recipient_id = auth.uid() THEN$a$,
                          $b$IF _is_store_account(auth.uid()) OR _is_store_account(p_recipient_id) THEN
    RAISE EXCEPTION 'STORE_NO_FRIENDS';
  END IF;
  IF p_recipient_id = auth.uid() THEN$b$);
  IF position('STORE_NO_FRIENDS' IN v_def) = 0 THEN
    RAISE EXCEPTION 'send_friend_request rewrite did not apply';
  END IF;
  EXECUTE v_def;

  -- create_post_draft: a pending Store can't post, and tags follow _can_tag.
  v_def := pg_get_functiondef('create_post_draft(text, integer, text, uuid, text, uuid, text, uuid[])'::REGPROCEDURE);
  v_def := replace(v_def, $a$IF p_media_type NOT IN ('photo', 'video') THEN$a$,
                          $b$IF _store_social_blocked(v_uid) THEN
    RAISE EXCEPTION 'STORE_NOT_APPROVED';
  END IF;
  IF p_media_type NOT IN ('photo', 'video') THEN$b$);
  v_def := replace(v_def, $a$OR NOT can_view_profile(v_uid, v_tag) THEN$a$,
                          $b$OR NOT can_view_profile(v_uid, v_tag) OR NOT _can_tag(v_uid, v_tag) THEN$b$);
  IF position('STORE_NOT_APPROVED' IN v_def) = 0 OR position('_can_tag' IN v_def) = 0 THEN
    RAISE EXCEPTION 'create_post_draft rewrite did not apply';
  END IF;
  EXECUTE v_def;

  -- update_post: new tags follow _can_tag.
  v_def := pg_get_functiondef('update_post(uuid, text, uuid, text, uuid, text, uuid[])'::REGPROCEDURE);
  v_def := replace(v_def, $a$OR NOT can_view_profile(v_uid, v_tag) THEN$a$,
                          $b$OR NOT can_view_profile(v_uid, v_tag) OR NOT _can_tag(v_uid, v_tag) THEN$b$);
  IF position('_can_tag' IN v_def) = 0 THEN
    RAISE EXCEPTION 'update_post rewrite did not apply';
  END IF;
  EXECUTE v_def;
END;
$do$;

-- ── 7. Function access (same rules as 20261012000000_lock_down_function_access) ──

REVOKE EXECUTE ON FUNCTION
  _is_adult(UUID), _store_social_blocked(UUID), _store_owner(UUID, TEXT), _store_can_edit_page(UUID),
  _dm_allowed(UUID, UUID, BOOLEAN), _dm_denied_code(UUID, UUID), _can_tag(UUID, UUID),
  _store_username_from(TEXT, UUID), _on_store_claim_status(),
  get_store_page(UUID, TEXT), get_store_for_profile(UUID), get_my_store_page(),
  update_store_page(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT),
  search_nearby_stores(DOUBLE PRECISION, DOUBLE PRECISION)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION
  get_store_page(UUID, TEXT), get_store_for_profile(UUID), get_my_store_page(),
  update_store_page(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT),
  search_nearby_stores(DOUBLE PRECISION, DOUBLE PRECISION)
TO authenticated;
