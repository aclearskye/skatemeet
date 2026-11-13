-- Store accounts, Phase 1: separate Store sign-up, store claims with proof,
-- and the admin review queue. Decisions: docs/ACCOUNT_TYPES.md ("Store").
--
--   * A Store account is created only by the B2B sign-up: auth.signUp with
--     user_metadata.signup_kind = 'store'. handle_new_user sets the type.
--     Picking "store" grants nothing by itself -- every store power needs an
--     approved claim.
--   * One account claims one store (OSM or user-created). One approved owner
--     per store, enforced by partial unique indexes.
--   * Proof: documents in the private store-claim-evidence bucket, plus a
--     signal that the account's confirmed email domain matches the store's
--     website. An admin always decides. The match only sorts the queue.
--   * Disputes: claiming an owned store files a 'dispute'. Approving it
--     revokes the current owner's claim (a transfer).
--
-- All writes go through the SECURITY DEFINER RPCs below. Clients can read
-- their own rows, and nothing else.

-- ── 1. Retire the old "switch to business" model (test data only) ──────────

DROP TRIGGER IF EXISTS trg_sync_profile_on_request_status ON business_verification_requests;
DROP FUNCTION IF EXISTS sync_profile_on_request_status();
DROP TABLE IF EXISTS business_verification_requests;

UPDATE profiles SET account_type = 'user' WHERE account_type <> 'user';

ALTER TABLE profiles DROP CONSTRAINT profiles_account_type_check;
ALTER TABLE profiles
  DROP COLUMN business_name,
  DROP COLUMN business_verified_at;
ALTER TABLE profiles
  ADD CONSTRAINT profiles_account_type_check CHECK (account_type IN ('user', 'store')),
  -- Admin is a role on an Adult. A Store can never hold it.
  ADD CONSTRAINT profiles_store_never_admin CHECK (NOT (is_admin AND account_type = 'store'));

-- ── 2. Account creation and the age gate ───────────────────────────────────

CREATE OR REPLACE FUNCTION handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (profile_id, account_type)
  VALUES (
    NEW.id,
    CASE WHEN NEW.raw_user_meta_data->>'signup_kind' = 'store' THEN 'store' ELSE 'user' END
  )
  ON CONFLICT (profile_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- A Store is a business, not a person. It has no age, so it can never pick
-- up age_confirmed_at, which is what gates spot chats and nearby search.
CREATE OR REPLACE FUNCTION confirm_age() RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE profiles SET age_confirmed_at = now()
  WHERE profile_id = auth.uid() AND age_confirmed_at IS NULL AND account_type = 'user';
END;
$$;

-- ── 3. Tables ──────────────────────────────────────────────────────────────

-- Private: only the Store account and admins (via RPC) ever read these.
CREATE TABLE store_business_details (
  profile_id          UUID PRIMARY KEY REFERENCES profiles(profile_id) ON DELETE CASCADE,
  legal_name          TEXT NOT NULL CHECK (char_length(btrim(legal_name)) BETWEEN 2 AND 200),
  registration_number TEXT NOT NULL CHECK (char_length(btrim(registration_number)) BETWEEN 2 AND 64),
  contact_name        TEXT NOT NULL CHECK (char_length(btrim(contact_name)) BETWEEN 2 AND 120),
  contact_role        TEXT NOT NULL CHECK (char_length(btrim(contact_role)) BETWEEN 2 AND 80),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Shown on the store page (Phase 2), and only once the claim is approved.
-- Images are paths in the public store-images bucket, under the account's
-- own folder.
CREATE TABLE store_public_details (
  profile_id   UUID PRIMARY KEY REFERENCES profiles(profile_id) ON DELETE CASCADE,
  public_phone TEXT CHECK (char_length(public_phone) <= 40),
  public_email TEXT CHECK (char_length(public_email) <= 254 AND public_email ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  logo_path    TEXT,
  cover_path   TEXT,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- osm_place_id has no ON DELETE action on purpose: an OSM reseed must fail
-- loudly rather than silently delete a store's ownership.
CREATE TABLE store_claims (
  claim_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id         UUID NOT NULL REFERENCES profiles(profile_id) ON DELETE CASCADE,
  store_id           UUID REFERENCES user_stores(store_id) ON DELETE CASCADE,
  osm_place_id       TEXT REFERENCES osm_stores(place_id),
  kind               TEXT NOT NULL DEFAULT 'claim' CHECK (kind IN ('claim', 'dispute')),
  status             TEXT NOT NULL DEFAULT 'draft'
                       CHECK (status IN ('draft', 'pending', 'approved', 'rejected', 'revoked')),
  evidence_paths     TEXT[] NOT NULL DEFAULT '{}',
  applicant_note     TEXT CHECK (char_length(applicant_note) <= 1000),
  email_domain_match BOOLEAN NOT NULL DEFAULT false,
  review_notes       TEXT CHECK (char_length(review_notes) <= 1000),
  reviewed_by        UUID REFERENCES profiles(profile_id) ON DELETE SET NULL,
  reviewed_at        TIMESTAMPTZ,
  submitted_at       TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT store_claims_one_entity CHECK (num_nonnulls(store_id, osm_place_id) = 1)
);

-- Exclusive claim (ACCOUNT_TYPES.md): at most one approved owner per store.
CREATE UNIQUE INDEX store_claims_one_owner_user_store ON store_claims (store_id) WHERE status = 'approved';
CREATE UNIQUE INDEX store_claims_one_owner_osm_store  ON store_claims (osm_place_id) WHERE status = 'approved';
-- One store per account: a single live claim (draft, pending or approved).
CREATE UNIQUE INDEX store_claims_one_live_per_account
  ON store_claims (profile_id) WHERE status IN ('draft', 'pending', 'approved');
CREATE INDEX store_claims_pending_idx ON store_claims (submitted_at) WHERE status = 'pending';

ALTER TABLE store_business_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_public_details   ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_claims           ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON store_business_details, store_public_details, store_claims FROM anon, authenticated;
GRANT SELECT ON store_business_details, store_public_details, store_claims TO authenticated;

CREATE POLICY store_business_details_own ON store_business_details
  FOR SELECT USING (profile_id = (SELECT auth.uid()));
CREATE POLICY store_claims_own ON store_claims
  FOR SELECT USING (profile_id = (SELECT auth.uid()));

-- ── 4. Helpers ─────────────────────────────────────────────────────────────

CREATE FUNCTION _is_store_account(p_profile_id UUID) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE profile_id = p_profile_id AND account_type = 'store');
$$;

CREATE FUNCTION _is_approved_store(p_profile_id UUID) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _is_store_account(p_profile_id) AND EXISTS (
    SELECT 1 FROM store_claims WHERE profile_id = p_profile_id AND status = 'approved'
  );
$$;

-- True while a store is owned or under review. A creator can't delete it then.
CREATE FUNCTION _store_has_live_claim(p_store_id UUID) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM store_claims WHERE store_id = p_store_id AND status IN ('pending', 'approved')
  );
$$;

-- Website or email to bare lower-case host: "https://www.Shop.com/x" -> "shop.com".
CREATE FUNCTION _bare_host(p_url TEXT) RETURNS TEXT
LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT NULLIF(regexp_replace(
           regexp_replace(lower(btrim(p_url)), '^[a-z][a-z0-9+.-]*://', ''),
           '^www\.|[/:?#].*$', '', 'g'
         ), '');
$$;

-- The caller, if it's a signed-in, unbanned Store account. Otherwise it raises.
CREATE FUNCTION _assert_store_caller() RETURNS UUID
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;
  IF NOT _is_store_account(v_uid) THEN
    RAISE EXCEPTION 'NOT_STORE_ACCOUNT';
  END IF;
  IF _is_banned(v_uid) THEN
    RAISE EXCEPTION 'BANNED';
  END IF;
  RETURN v_uid;
END;
$$;

CREATE POLICY store_public_details_visible ON store_public_details
  FOR SELECT USING (profile_id = (SELECT auth.uid()) OR _is_approved_store(profile_id));

-- ── 5. user_stores: hidden-until-approved stores and a column lock ────────

ALTER TABLE user_stores ADD COLUMN pending_claim BOOLEAN NOT NULL DEFAULT false;

-- A store created during Store onboarding stays invisible until its claim is
-- approved. Only its creator can see it before then.
DROP POLICY user_shops_public_read ON user_stores;
CREATE POLICY user_stores_public_read ON user_stores
  FOR SELECT USING (NOT pending_claim OR profile_id = (SELECT auth.uid()));

-- Same hole as profiles had: the creator could UPDATE any column, including
-- is_verified. Nothing in the client updates user_stores, so UPDATE goes.
-- INSERT is limited to the columns CreateStoreSheet sends. Phase 2 owner
-- edits will go through RPCs.
REVOKE INSERT, UPDATE, TRUNCATE, REFERENCES, TRIGGER ON user_stores FROM anon, authenticated;
REVOKE DELETE ON user_stores FROM anon;
GRANT INSERT (profile_id, name, latitude, longitude, address, phone, website, opening_hours, description, photo_url)
  ON user_stores TO authenticated;
DROP POLICY user_shops_owner_update ON user_stores;

-- Store accounts only ever create their store through create_store_for_claim.
DROP POLICY user_shops_owner_insert ON user_stores;
CREATE POLICY user_stores_creator_insert ON user_stores
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = profile_id AND NOT _is_store_account((SELECT auth.uid())));

DROP POLICY creator_delete_store ON user_stores;
CREATE POLICY creator_delete_store ON user_stores
  FOR DELETE USING (
    (SELECT auth.uid()) = profile_id
    AND is_verified = false
    AND NOT pending_claim
    AND NOT _store_has_live_claim(store_id)
  );

-- These counter/cover triggers ran with the voter's permissions, so the
-- UPDATE on user_stores/osm_stores silently matched zero rows for anyone but
-- the creator (one OSM store's count had already drifted). They now run with
-- server permissions, and the counts are resynced once.
ALTER FUNCTION sync_store_upvote_count() SECURITY DEFINER;
ALTER FUNCTION sync_store_cover_photo() SECURITY DEFINER;
REVOKE EXECUTE ON FUNCTION sync_store_upvote_count(), sync_store_cover_photo() FROM PUBLIC, anon, authenticated;

UPDATE user_stores s
SET upvote_count = (SELECT count(*) FROM store_votes v WHERE v.store_id = s.store_id)
WHERE upvote_count IS DISTINCT FROM (SELECT count(*) FROM store_votes v WHERE v.store_id = s.store_id);
UPDATE osm_stores s
SET upvote_count = (SELECT count(*) FROM store_votes v WHERE v.osm_place_id = s.place_id)
WHERE upvote_count IS DISTINCT FROM (SELECT count(*) FROM store_votes v WHERE v.osm_place_id = s.place_id);

-- A hidden onboarding store isn't a real check-in location.
CREATE OR REPLACE FUNCTION _check_in_on_store_created() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT NEW.pending_claim THEN
    PERFORM _perform_check_in(NEW.profile_id, NULL, NULL, NEW.store_id, NULL, 'entity_created');
  END IF;
  RETURN NEW;
END;
$$;

-- ── 6. Evidence bucket (private) ────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'store-claim-evidence', 'store-claim-evidence', false, 10485760,
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/heic', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY store_claim_evidence_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'store-claim-evidence'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::TEXT
    AND _is_store_account((SELECT auth.uid()))
  );
CREATE POLICY store_claim_evidence_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'store-claim-evidence'
    AND ((storage.foldername(name))[1] = (SELECT auth.uid())::TEXT OR is_admin((SELECT auth.uid())))
  );
CREATE POLICY store_claim_evidence_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'store-claim-evidence'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::TEXT
  );

-- ── 7. Store-side RPCs ──────────────────────────────────────────────────────

CREATE FUNCTION save_store_business_details(
  p_legal_name          TEXT,
  p_registration_number TEXT,
  p_contact_name        TEXT,
  p_contact_role        TEXT,
  p_public_phone        TEXT,
  p_public_email        TEXT,
  p_logo_path           TEXT,
  p_cover_path          TEXT
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := _assert_store_caller();
  v_prefix TEXT := v_uid::TEXT || '/';
BEGIN
  IF (p_logo_path IS NOT NULL AND left(p_logo_path, length(v_prefix)) <> v_prefix)
     OR (p_cover_path IS NOT NULL AND left(p_cover_path, length(v_prefix)) <> v_prefix) THEN
    RAISE EXCEPTION 'INVALID_IMAGE_PATH';
  END IF;

  INSERT INTO store_business_details (profile_id, legal_name, registration_number, contact_name, contact_role)
  VALUES (v_uid, btrim(p_legal_name), btrim(p_registration_number), btrim(p_contact_name), btrim(p_contact_role))
  ON CONFLICT (profile_id) DO UPDATE SET
    legal_name = EXCLUDED.legal_name,
    registration_number = EXCLUDED.registration_number,
    contact_name = EXCLUDED.contact_name,
    contact_role = EXCLUDED.contact_role,
    updated_at = now();

  INSERT INTO store_public_details (profile_id, public_phone, public_email, logo_path, cover_path)
  VALUES (v_uid, NULLIF(btrim(p_public_phone), ''), NULLIF(btrim(p_public_email), ''), p_logo_path, p_cover_path)
  ON CONFLICT (profile_id) DO UPDATE SET
    public_phone = EXCLUDED.public_phone,
    public_email = EXCLUDED.public_email,
    logo_path = EXCLUDED.logo_path,
    cover_path = EXCLUDED.cover_path,
    updated_at = now();
END;
$$;

-- Stores a business can claim, with whether each already has an owner (a
-- claim on an owned store becomes a dispute). Other businesses' pending
-- claims are never revealed.
CREATE FUNCTION search_claimable_stores(p_query TEXT)
RETURNS TABLE (
  store_id     UUID,
  osm_place_id TEXT,
  name         TEXT,
  address      TEXT,
  website      TEXT,
  latitude     DOUBLE PRECISION,
  longitude    DOUBLE PRECISION,
  is_owned     BOOLEAN
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
#variable_conflict use_column
DECLARE
  v_uid UUID := _assert_store_caller();
  v_pattern TEXT;
BEGIN
  IF char_length(btrim(coalesce(p_query, ''))) < 2 THEN
    RETURN;
  END IF;
  v_pattern := '%' || replace(replace(replace(btrim(p_query), '\', '\\'), '%', '\%'), '_', '\_') || '%';

  RETURN QUERY
  (SELECT NULL::UUID, o.place_id, o.name, o.address, o.website, o.latitude, o.longitude,
          EXISTS (SELECT 1 FROM store_claims c WHERE c.osm_place_id = o.place_id AND c.status = 'approved')
   FROM osm_stores o
   WHERE o.name ILIKE v_pattern
   ORDER BY o.upvote_count DESC
   LIMIT 25)
  UNION ALL
  (SELECT u.store_id, NULL::TEXT, u.name, u.address, u.website, u.latitude, u.longitude,
          EXISTS (SELECT 1 FROM store_claims c WHERE c.store_id = u.store_id AND c.status = 'approved')
   FROM user_stores u
   WHERE u.name ILIKE v_pattern AND (NOT u.pending_claim OR u.profile_id = v_uid)
   ORDER BY u.upvote_count DESC
   LIMIT 25);
END;
$$;

-- Points the caller's draft claim at a store (exactly one of the two ids).
-- Switching away from a hidden store the caller created deletes that store.
CREATE FUNCTION choose_store_to_claim(p_store_id UUID, p_osm_place_id TEXT) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := _assert_store_caller();
  v_claim store_claims%ROWTYPE;
  v_claim_id UUID;
BEGIN
  IF num_nonnulls(p_store_id, p_osm_place_id) <> 1 THEN
    RAISE EXCEPTION 'INVALID_TARGET';
  END IF;

  SELECT * INTO v_claim FROM store_claims
  WHERE profile_id = v_uid AND status IN ('draft', 'pending', 'approved')
  FOR UPDATE;

  IF v_claim.status = 'approved' THEN
    RAISE EXCEPTION 'ALREADY_OWNS_STORE';
  ELSIF v_claim.status = 'pending' THEN
    RAISE EXCEPTION 'CLAIM_PENDING';
  END IF;

  IF p_store_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM user_stores WHERE store_id = p_store_id AND (NOT pending_claim OR profile_id = v_uid)
  ) THEN
    RAISE EXCEPTION 'STORE_NOT_FOUND';
  END IF;
  IF p_osm_place_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM osm_stores WHERE place_id = p_osm_place_id) THEN
    RAISE EXCEPTION 'STORE_NOT_FOUND';
  END IF;

  IF v_claim.claim_id IS NOT NULL THEN
    UPDATE store_claims
    SET store_id = p_store_id, osm_place_id = p_osm_place_id, updated_at = now()
    WHERE claim_id = v_claim.claim_id
    RETURNING claim_id INTO v_claim_id;
  ELSE
    INSERT INTO store_claims (profile_id, store_id, osm_place_id)
    VALUES (v_uid, p_store_id, p_osm_place_id)
    RETURNING claim_id INTO v_claim_id;
  END IF;

  DELETE FROM user_stores
  WHERE profile_id = v_uid AND pending_claim AND store_id IS DISTINCT FROM p_store_id
    AND NOT EXISTS (SELECT 1 FROM store_claims c WHERE c.store_id = user_stores.store_id AND c.claim_id <> v_claim_id);

  RETURN v_claim_id;
END;
$$;

-- "My store isn't listed": creates the store hidden and points the draft
-- claim at it. Calling it again edits the same hidden store.
CREATE FUNCTION create_store_for_claim(
  p_name      TEXT,
  p_address   TEXT,
  p_latitude  DOUBLE PRECISION,
  p_longitude DOUBLE PRECISION,
  p_website   TEXT,
  p_phone     TEXT
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := _assert_store_caller();
  v_store_id UUID;
BEGIN
  IF char_length(btrim(coalesce(p_name, ''))) NOT BETWEEN 2 AND 120 THEN
    RAISE EXCEPTION 'INVALID_NAME';
  END IF;
  IF p_latitude IS NULL OR p_longitude IS NULL
     OR p_latitude NOT BETWEEN -90 AND 90 OR p_longitude NOT BETWEEN -180 AND 180 THEN
    RAISE EXCEPTION 'INVALID_LOCATION';
  END IF;
  IF EXISTS (SELECT 1 FROM store_claims WHERE profile_id = v_uid AND status IN ('pending', 'approved')) THEN
    RAISE EXCEPTION 'CLAIM_LOCKED';
  END IF;

  SELECT store_id INTO v_store_id FROM user_stores WHERE profile_id = v_uid AND pending_claim LIMIT 1;

  IF v_store_id IS NULL THEN
    INSERT INTO user_stores (profile_id, name, address, latitude, longitude, website, phone, pending_claim)
    VALUES (v_uid, btrim(p_name), coalesce(btrim(p_address), ''), p_latitude, p_longitude,
            NULLIF(btrim(p_website), ''), NULLIF(btrim(p_phone), ''), true)
    RETURNING store_id INTO v_store_id;
  ELSE
    UPDATE user_stores SET
      name = btrim(p_name), address = coalesce(btrim(p_address), ''),
      latitude = p_latitude, longitude = p_longitude,
      website = NULLIF(btrim(p_website), ''), phone = NULLIF(btrim(p_phone), ''),
      updated_at = now()
    WHERE store_id = v_store_id;
  END IF;

  PERFORM choose_store_to_claim(v_store_id, NULL);
  RETURN v_store_id;
END;
$$;

-- Sends the draft for review. The email-domain signal only counts when the
-- website wasn't typed in by the applicant (an OSM store, or one someone
-- else created), and never for free webmail domains.
CREATE FUNCTION submit_store_claim(p_evidence_paths TEXT[], p_note TEXT) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := _assert_store_caller();
  v_claim store_claims%ROWTYPE;
  v_prefix TEXT := v_uid::TEXT || '/';
  v_path TEXT;
  v_email_domain TEXT;
  v_website TEXT;
  v_website_creator UUID;
  v_host TEXT;
  v_match BOOLEAN := false;
  v_owned BOOLEAN;
BEGIN
  SELECT * INTO v_claim FROM store_claims WHERE profile_id = v_uid AND status = 'draft' FOR UPDATE;
  IF v_claim.claim_id IS NULL THEN
    RAISE EXCEPTION 'NO_DRAFT_CLAIM';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM store_business_details WHERE profile_id = v_uid) THEN
    RAISE EXCEPTION 'BUSINESS_DETAILS_MISSING';
  END IF;
  IF coalesce(array_length(p_evidence_paths, 1), 0) NOT BETWEEN 1 AND 5 THEN
    RAISE EXCEPTION 'EVIDENCE_REQUIRED';
  END IF;
  FOREACH v_path IN ARRAY p_evidence_paths LOOP
    IF left(v_path, length(v_prefix)) <> v_prefix OR NOT EXISTS (
      SELECT 1 FROM storage.objects WHERE bucket_id = 'store-claim-evidence' AND name = v_path
    ) THEN
      RAISE EXCEPTION 'EVIDENCE_NOT_FOUND';
    END IF;
  END LOOP;

  SELECT lower(split_part(email, '@', 2)) INTO v_email_domain
  FROM auth.users WHERE id = v_uid AND email_confirmed_at IS NOT NULL;

  IF v_claim.osm_place_id IS NOT NULL THEN
    SELECT website INTO v_website FROM osm_stores WHERE place_id = v_claim.osm_place_id;
    v_owned := EXISTS (SELECT 1 FROM store_claims WHERE osm_place_id = v_claim.osm_place_id AND status = 'approved');
  ELSE
    SELECT website, profile_id INTO v_website, v_website_creator FROM user_stores WHERE store_id = v_claim.store_id;
    v_owned := EXISTS (SELECT 1 FROM store_claims WHERE store_id = v_claim.store_id AND status = 'approved');
  END IF;

  v_host := _bare_host(v_website);
  IF v_email_domain IS NOT NULL AND v_host IS NOT NULL
     AND v_website_creator IS DISTINCT FROM v_uid
     AND v_email_domain NOT IN (
       'gmail.com', 'googlemail.com', 'outlook.com', 'hotmail.com', 'hotmail.co.uk', 'live.com',
       'yahoo.com', 'yahoo.co.uk', 'icloud.com', 'me.com', 'aol.com', 'proton.me', 'protonmail.com',
       'pm.me', 'gmx.com', 'mail.com', 'zoho.com', 'yandex.com'
     ) THEN
    v_match := v_host = v_email_domain OR right(v_host, length(v_email_domain) + 1) = '.' || v_email_domain;
  END IF;

  UPDATE store_claims SET
    status = 'pending',
    kind = CASE WHEN v_owned THEN 'dispute' ELSE 'claim' END,
    evidence_paths = p_evidence_paths,
    applicant_note = NULLIF(btrim(p_note), ''),
    email_domain_match = v_match,
    review_notes = NULL,
    submitted_at = now(),
    updated_at = now()
  WHERE claim_id = v_claim.claim_id;
END;
$$;

-- Pulls a pending claim back to draft so it can be edited.
CREATE FUNCTION withdraw_store_claim() RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := _assert_store_caller();
BEGIN
  UPDATE store_claims SET status = 'draft', updated_at = now()
  WHERE profile_id = v_uid AND status = 'pending';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NO_PENDING_CLAIM';
  END IF;
END;
$$;

-- After a rejection or a revoke, the next draft starts from the same store.
CREATE FUNCTION restart_store_claim() RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := _assert_store_caller();
  v_last store_claims%ROWTYPE;
BEGIN
  IF EXISTS (SELECT 1 FROM store_claims WHERE profile_id = v_uid AND status IN ('draft', 'pending', 'approved')) THEN
    RAISE EXCEPTION 'CLAIM_ALREADY_LIVE';
  END IF;
  SELECT * INTO v_last FROM store_claims WHERE profile_id = v_uid ORDER BY created_at DESC LIMIT 1;
  IF v_last.claim_id IS NULL THEN
    RAISE EXCEPTION 'NO_PREVIOUS_CLAIM';
  END IF;
  RETURN choose_store_to_claim(v_last.store_id, v_last.osm_place_id);
END;
$$;

-- The Store dashboard's whole state in one call.
CREATE FUNCTION get_my_store_onboarding() RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := _assert_store_caller();
  v_claim store_claims%ROWTYPE;
BEGIN
  SELECT * INTO v_claim FROM store_claims WHERE profile_id = v_uid ORDER BY created_at DESC LIMIT 1;

  RETURN jsonb_build_object(
    'business', (SELECT to_jsonb(b) - 'profile_id' FROM store_business_details b WHERE b.profile_id = v_uid),
    'public', (SELECT to_jsonb(p) - 'profile_id' FROM store_public_details p WHERE p.profile_id = v_uid),
    'claim', CASE WHEN v_claim.claim_id IS NULL THEN NULL ELSE jsonb_build_object(
      'claim_id', v_claim.claim_id,
      'status', v_claim.status,
      'kind', v_claim.kind,
      'store_id', v_claim.store_id,
      'osm_place_id', v_claim.osm_place_id,
      'evidence_paths', to_jsonb(v_claim.evidence_paths),
      'applicant_note', v_claim.applicant_note,
      'review_notes', v_claim.review_notes,
      'submitted_at', v_claim.submitted_at,
      'reviewed_at', v_claim.reviewed_at,
      'store', COALESCE(
        (SELECT jsonb_build_object('name', u.name, 'address', u.address, 'website', u.website,
                                   'created_by_me', u.profile_id = v_uid, 'pending_claim', u.pending_claim)
         FROM user_stores u WHERE u.store_id = v_claim.store_id),
        (SELECT jsonb_build_object('name', o.name, 'address', o.address, 'website', o.website,
                                   'created_by_me', false, 'pending_claim', false)
         FROM osm_stores o WHERE o.place_id = v_claim.osm_place_id)
      )
    ) END
  );
END;
$$;

-- ── 8. Admin RPCs ───────────────────────────────────────────────────────────

CREATE FUNCTION admin_list_store_claims()
RETURNS TABLE (
  claim_id              UUID,
  kind                  TEXT,
  profile_id            UUID,
  account_email         TEXT,
  legal_name            TEXT,
  registration_number   TEXT,
  contact_name          TEXT,
  contact_role          TEXT,
  public_phone          TEXT,
  public_email          TEXT,
  store_id              UUID,
  osm_place_id          TEXT,
  store_name            TEXT,
  store_address         TEXT,
  store_website         TEXT,
  latitude              DOUBLE PRECISION,
  longitude             DOUBLE PRECISION,
  store_created_by_applicant BOOLEAN,
  email_domain_match    BOOLEAN,
  evidence_paths        TEXT[],
  applicant_note        TEXT,
  current_owner_email   TEXT,
  submitted_at          TIMESTAMPTZ
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
#variable_conflict use_column
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'NOT_ADMIN';
  END IF;

  RETURN QUERY
  SELECT c.claim_id, c.kind, c.profile_id, au.email::TEXT,
         b.legal_name, b.registration_number, b.contact_name, b.contact_role,
         pd.public_phone, pd.public_email,
         c.store_id, c.osm_place_id,
         COALESCE(u.name, o.name), COALESCE(u.address, o.address), COALESCE(u.website, o.website),
         COALESCE(u.latitude, o.latitude), COALESCE(u.longitude, o.longitude),
         COALESCE(u.profile_id = c.profile_id, false),
         c.email_domain_match, c.evidence_paths, c.applicant_note,
         (SELECT oau.email::TEXT FROM store_claims oc JOIN auth.users oau ON oau.id = oc.profile_id
          WHERE oc.status = 'approved'
            AND (oc.store_id = c.store_id OR oc.osm_place_id = c.osm_place_id)
          LIMIT 1),
         c.submitted_at
  FROM store_claims c
  JOIN auth.users au ON au.id = c.profile_id
  LEFT JOIN store_business_details b ON b.profile_id = c.profile_id
  LEFT JOIN store_public_details pd ON pd.profile_id = c.profile_id
  LEFT JOIN user_stores u ON u.store_id = c.store_id
  LEFT JOIN osm_stores o ON o.place_id = c.osm_place_id
  WHERE c.status = 'pending'
  ORDER BY c.email_domain_match DESC, c.submitted_at ASC;
END;
$$;

-- Approve: becomes the owner. Revokes any current owner (dispute ->
-- transfer), rejects rival pending claims, and unhides a store created in
-- onboarding. Reject: needs notes, which the applicant sees.
CREATE FUNCTION admin_review_store_claim(p_claim_id UUID, p_approve BOOLEAN, p_notes TEXT) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_admin UUID := auth.uid();
  v_claim store_claims%ROWTYPE;
  v_notes TEXT := NULLIF(btrim(p_notes), '');
  v_revoked INT;
BEGIN
  IF NOT is_admin(v_admin) THEN
    RAISE EXCEPTION 'NOT_ADMIN';
  END IF;

  SELECT * INTO v_claim FROM store_claims WHERE claim_id = p_claim_id FOR UPDATE;
  IF v_claim.claim_id IS NULL OR v_claim.status <> 'pending' THEN
    RAISE EXCEPTION 'CLAIM_NOT_PENDING';
  END IF;

  IF NOT p_approve THEN
    IF v_notes IS NULL THEN
      RAISE EXCEPTION 'NOTES_REQUIRED';
    END IF;
    UPDATE store_claims SET status = 'rejected', review_notes = v_notes,
      reviewed_by = v_admin, reviewed_at = now(), updated_at = now()
    WHERE claim_id = p_claim_id;

    INSERT INTO admin_audit_log (admin_id, action, target_type, target_id, notes)
    VALUES (v_admin, 'store_claim_rejected', 'store_claim', p_claim_id::TEXT, v_notes);
    RETURN;
  END IF;

  UPDATE store_claims SET status = 'revoked',
    review_notes = 'Ownership was transferred to another business after a dispute.',
    reviewed_by = v_admin, reviewed_at = now(), updated_at = now()
  WHERE status = 'approved'
    AND (store_id = v_claim.store_id OR osm_place_id = v_claim.osm_place_id);
  -- Counted rather than read from kind: ownership can change between submit
  -- and review, and a transfer must be logged as one either way.
  GET DIAGNOSTICS v_revoked = ROW_COUNT;

  UPDATE store_claims SET status = 'rejected',
    review_notes = 'Another business''s claim to this store was approved. You can file a dispute with your proof.',
    reviewed_by = v_admin, reviewed_at = now(), updated_at = now()
  WHERE status = 'pending' AND claim_id <> p_claim_id
    AND (store_id = v_claim.store_id OR osm_place_id = v_claim.osm_place_id);

  UPDATE store_claims SET status = 'approved', review_notes = v_notes,
    reviewed_by = v_admin, reviewed_at = now(), updated_at = now()
  WHERE claim_id = p_claim_id;

  IF v_claim.store_id IS NOT NULL THEN
    UPDATE user_stores SET pending_claim = false, is_verified = true, updated_at = now()
    WHERE store_id = v_claim.store_id;
  END IF;

  INSERT INTO admin_audit_log (admin_id, action, target_type, target_id, notes)
  VALUES (v_admin,
          CASE WHEN v_revoked > 0 THEN 'store_claim_transferred' ELSE 'store_claim_approved' END,
          'store_claim', p_claim_id::TEXT, v_notes);
END;
$$;

-- ── 9. Data export: swap the dropped table for the new store tables ────────
-- Rewrites only that one entry of the live export_my_data definition, so
-- this migration doesn't have to restate the whole ~150-line function.

DO $do$
DECLARE
  v_def TEXT := pg_get_functiondef('export_my_data()'::REGPROCEDURE);
BEGIN
  v_def := replace(
    v_def,
    $old$'business_verification_requests', _export_rows('business_verification_requests', 'profile_id', v_uid),$old$,
    $new$'store_claims', _export_rows('store_claims', 'profile_id', v_uid, ARRAY['reviewed_by']),
    'store_business_details', _export_rows('store_business_details', 'profile_id', v_uid),
    'store_public_details', _export_rows('store_public_details', 'profile_id', v_uid),$new$
  );
  IF position('business_verification_requests' IN v_def) > 0 THEN
    RAISE EXCEPTION 'export_my_data rewrite did not apply';
  END IF;
  EXECUTE v_def;
END;
$do$;

-- ── 10. Function access (same rules as 20261012000000_lock_down_function_access) ──

REVOKE EXECUTE ON FUNCTION
  _is_store_account(UUID), _is_approved_store(UUID), _store_has_live_claim(UUID),
  _bare_host(TEXT), _assert_store_caller(),
  save_store_business_details(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT),
  search_claimable_stores(TEXT),
  choose_store_to_claim(UUID, TEXT),
  create_store_for_claim(TEXT, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, TEXT, TEXT),
  submit_store_claim(TEXT[], TEXT),
  withdraw_store_claim(),
  restart_store_claim(),
  get_my_store_onboarding(),
  admin_list_store_claims(),
  admin_review_store_claim(UUID, BOOLEAN, TEXT)
FROM PUBLIC, anon;

-- Used inside RLS policies, so the calling role needs them.
GRANT EXECUTE ON FUNCTION _is_store_account(UUID), _is_approved_store(UUID), _store_has_live_claim(UUID)
  TO authenticated;

GRANT EXECUTE ON FUNCTION
  save_store_business_details(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT),
  search_claimable_stores(TEXT),
  choose_store_to_claim(UUID, TEXT),
  create_store_for_claim(TEXT, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, TEXT, TEXT),
  submit_store_claim(TEXT[], TEXT),
  withdraw_store_claim(),
  restart_store_claim(),
  get_my_store_onboarding(),
  admin_list_store_claims(),
  admin_review_store_claim(UUID, BOOLEAN, TEXT)
TO authenticated;
