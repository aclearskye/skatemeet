-- Drops the never-used clips table (0 rows; superseded by posts +
-- post_media in 20261104170000). Nothing has a foreign key into it and it has
-- no Storage bucket.
--
-- export_my_data() named it through _export_rows' dynamic SQL, so it would
-- start failing once the table is gone. Its 'clips' entry is swapped for the
-- caller's post rows in place rather than restating the whole ~120-line
-- function. File links for post media still need signed URLs from an edge
-- function (md/media_posts.md §13); these are the rows only.

DO $$
DECLARE
  v_old TEXT := pg_get_functiondef('public.export_my_data'::regproc);
  v_new TEXT := replace(
    v_old,
    $r$'clips', _export_rows('clips', 'profile_id', v_uid),$r$,
    $r$'posts', _export_rows('posts', 'profile_id', v_uid),
    'post_tags_of_me', _export_rows('post_skater_tags', 'tagged_profile_id', v_uid),
    'post_likes', _export_rows('post_likes', 'profile_id', v_uid),
    'post_saves', _export_rows('post_saves', 'profile_id', v_uid),$r$
  );
BEGIN
  IF v_new = v_old THEN
    RAISE EXCEPTION 'export_my_data no longer has the expected clips entry';
  END IF;
  EXECUTE v_new;
END;
$$;

-- The only report reason a reporter wrote is theirs to export; resolver
-- identity is staff-side, same as the other report tables.
DO $$
DECLARE
  v_old TEXT := pg_get_functiondef('public.export_my_data'::regproc);
  v_new TEXT := replace(
    v_old,
    $r$'store_photos', _export_rows('store_photo_reports', 'profile_id', v_uid, ARRAY['resolved_by'])$r$,
    $r$'store_photos', _export_rows('store_photo_reports', 'profile_id', v_uid, ARRAY['resolved_by']),
      'posts', _export_rows('post_reports', 'profile_id', v_uid, ARRAY['resolved_by'])$r$
  );
BEGIN
  IF v_new = v_old THEN
    RAISE EXCEPTION 'export_my_data no longer has the expected report entries';
  END IF;
  EXECUTE v_new;
END;
$$;

DROP TABLE clips;
