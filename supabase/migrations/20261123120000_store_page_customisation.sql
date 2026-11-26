-- Store page customisation (docs/ACCOUNT_TYPES.md, "Store", Page authority):
-- options only the owning Store account can set, on top of the page fields
-- from Phase 2.
--
--   store_kind        what the hero's type tape says: SKATE STORE,
--                     SKATEPARK, or STORE + PARK.
--   tape_labels       up to 5 of the store's own duct-tape labels in the
--                     hero, same rules as spot and profile labels
--                     (spot_labels_valid).
--   accent            the page's accent colour, a tape palette key (as
--                     labels store it), so a palette change recolours it.
--   announcement      a short pinned notice ("Closed Sat for a comp").
--   instagram/tiktok/ handles, without the @ or a URL.
--   youtube
--   featured_section  which comes first on the page: tickets or the shop.
--
-- A community (unclaimed) listing has none of these: it keeps the default
-- look, so nobody but the owner can change how a store's page appears.

ALTER TABLE store_public_details
  ADD COLUMN store_kind TEXT NOT NULL DEFAULT 'store'
    CHECK (store_kind IN ('store', 'skatepark', 'store_and_park')),
  ADD COLUMN tape_labels JSONB NOT NULL DEFAULT '[]'::JSONB
    CHECK (spot_labels_valid(tape_labels)),
  ADD COLUMN accent TEXT NOT NULL DEFAULT 'secondary'
    CHECK (accent IN ('primary', 'secondary', 'tertiary', 'gold', 'tape')),
  ADD COLUMN announcement TEXT CHECK (char_length(announcement) BETWEEN 1 AND 140),
  ADD COLUMN instagram TEXT CHECK (instagram ~ '^[A-Za-z0-9._]{1,30}$'),
  ADD COLUMN tiktok TEXT CHECK (tiktok ~ '^[A-Za-z0-9._]{2,24}$'),
  ADD COLUMN youtube TEXT CHECK (youtube ~ '^[A-Za-z0-9._-]{3,30}$'),
  ADD COLUMN featured_section TEXT NOT NULL DEFAULT 'tickets'
    CHECK (featured_section IN ('tickets', 'shop'));

-- The style block both page reads return. A store that has never saved its
-- page has no row, so every field falls back to the default look.
CREATE FUNCTION _store_page_style(p_details store_public_details) RETURNS JSONB
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT jsonb_build_object(
    'store_kind', coalesce(p_details.store_kind, 'store'),
    'tape_labels', coalesce(p_details.tape_labels, '[]'::JSONB),
    'accent', coalesce(p_details.accent, 'secondary'),
    'announcement', p_details.announcement,
    'instagram', p_details.instagram,
    'tiktok', p_details.tiktok,
    'youtube', p_details.youtube,
    'featured_section', coalesce(p_details.featured_section, 'tickets')
  );
$$;

-- Both page reads gain the style block, next to the cover.
DO $do$
DECLARE
  v_fn TEXT;
  v_def TEXT;
BEGIN
  FOREACH v_fn IN ARRAY ARRAY['get_store_page(uuid, text)', 'get_my_store_page()'] LOOP
    v_def := pg_get_functiondef(v_fn::REGPROCEDURE);
    v_def := replace(v_def,
      $old$'cover_path', d.cover_path,$old$,
      $new$'cover_path', d.cover_path,
    'style', _store_page_style(d),$new$);
    IF position('_store_page_style' IN v_def) = 0 THEN
      RAISE EXCEPTION '% rewrite did not apply', v_fn;
    END IF;
    EXECUTE v_def;
  END LOOP;
END;
$do$;

-- Saved alongside update_store_page by the editor's one Save button.
CREATE FUNCTION update_store_page_style(
  p_store_kind       TEXT,
  p_tape_labels      JSONB,
  p_accent           TEXT,
  p_announcement     TEXT,
  p_instagram        TEXT,
  p_tiktok           TEXT,
  p_youtube          TEXT,
  p_featured_section TEXT
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID := _assert_store_caller();
  v_labels JSONB := coalesce(p_tape_labels, '[]'::JSONB);
BEGIN
  IF NOT _store_can_edit_page(v_uid) THEN
    RAISE EXCEPTION '%', CASE WHEN _is_approved_store(v_uid) THEN 'STORE_UNPAID' ELSE 'STORE_NOT_APPROVED' END;
  END IF;
  IF NOT spot_labels_valid(v_labels) THEN
    RAISE EXCEPTION 'INVALID_LABELS';
  END IF;

  INSERT INTO store_public_details (profile_id, store_kind, tape_labels, accent, announcement,
                                    instagram, tiktok, youtube, featured_section)
  VALUES (v_uid, p_store_kind, v_labels, p_accent, NULLIF(btrim(p_announcement), ''),
          NULLIF(btrim(p_instagram), ''), NULLIF(btrim(p_tiktok), ''), NULLIF(btrim(p_youtube), ''),
          p_featured_section)
  ON CONFLICT (profile_id) DO UPDATE SET
    store_kind = EXCLUDED.store_kind,
    tape_labels = EXCLUDED.tape_labels,
    accent = EXCLUDED.accent,
    announcement = EXCLUDED.announcement,
    instagram = EXCLUDED.instagram,
    tiktok = EXCLUDED.tiktok,
    youtube = EXCLUDED.youtube,
    featured_section = EXCLUDED.featured_section,
    updated_at = now();
EXCEPTION
  -- A bad kind, colour, notice length or handle fails a column CHECK.
  WHEN check_violation OR not_null_violation THEN
    RAISE EXCEPTION 'INVALID_STYLE';
END;
$$;

REVOKE EXECUTE ON FUNCTION
  _store_page_style(store_public_details),
  update_store_page_style(TEXT, JSONB, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION
  update_store_page_style(TEXT, JSONB, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT)
TO authenticated;
