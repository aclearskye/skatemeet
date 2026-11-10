-- Spots get three community data points, each rated 1–5 by skaters who
-- have checked in there, one rating per skater per data point:
--   rating      — overall quality (green)
--   difficulty  — sets the EASY / TRICKY / IMPOSSIBLE tape (orange)
--   smoothness  — sets the SMOOTH / ROUGH / CRUSTY tape (blue)
--
-- Generalises spot_difficulty_ratings (20261110163839) into spot_ratings
-- with a metric column. The rows that migration seeded from spot review
-- ratings were overall-quality ratings, so they move to 'rating'; anything
-- rated since stays 'difficulty'.

alter table public.spot_difficulty_ratings rename to spot_ratings;

alter table public.spot_ratings
  add column metric text not null default 'difficulty'
    check (metric in ('rating', 'difficulty', 'smoothness'));

-- The existing after-change trigger's function still names the old table
-- until it's replaced below, so keep it off for this relabel; the full
-- recompute at the end rebuilds every cache anyway.
alter table public.spot_ratings disable trigger after_spot_difficulty_rating_change;

update public.spot_ratings r
   set metric = 'rating'
 where exists (
   select 1 from public.spot_reviews v
    where v.profile_id = r.profile_id
      and coalesce(v.spot_id::text, v.osm_place_id) = coalesce(r.spot_id::text, r.osm_place_id)
      and v.created_at = r.created_at
      and v.rating is not null
 );

alter table public.spot_ratings enable trigger after_spot_difficulty_rating_change;

alter table public.spot_ratings alter column metric drop default;

drop index public.spot_difficulty_ratings_user_spot_uniq;
drop index public.spot_difficulty_ratings_osm_spot_uniq;
alter index public.spot_difficulty_ratings_spot_idx rename to spot_ratings_spot_idx;
alter index public.spot_difficulty_ratings_osm_idx rename to spot_ratings_osm_idx;
alter table public.spot_ratings rename constraint spot_difficulty_ratings_one_target to spot_ratings_one_target;
alter policy spot_difficulty_ratings_read on public.spot_ratings rename to spot_ratings_read;

create unique index spot_ratings_user_spot_uniq
  on public.spot_ratings (profile_id, metric, spot_id) where spot_id is not null;
create unique index spot_ratings_osm_spot_uniq
  on public.spot_ratings (profile_id, metric, osm_place_id) where osm_place_id is not null;

-- Cached averages for the other two data points (difficulty's exist).
alter table public.user_spots
  add column rating_avg numeric(3, 2),
  add column rating_count integer not null default 0,
  add column smoothness_avg numeric(3, 2),
  add column smoothness_count integer not null default 0;

create or replace function public._guard_spot_difficulty_cache()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
  if coalesce(current_setting('skatemeet.syncing_ratings', true), '') = 'on' then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.rating_avg := null;
    new.rating_count := 0;
    new.difficulty_avg := null;
    new.difficulty_count := 0;
    new.smoothness_avg := null;
    new.smoothness_count := 0;
  else
    new.rating_avg := old.rating_avg;
    new.rating_count := old.rating_count;
    new.difficulty_avg := old.difficulty_avg;
    new.difficulty_count := old.difficulty_count;
    new.smoothness_avg := old.smoothness_avg;
    new.smoothness_count := old.smoothness_count;
  end if;
  return new;
end;
$$;
alter function public._guard_spot_difficulty_cache() rename to _guard_spot_ratings_cache;

create or replace function public._sync_spot_ratings(p_spot_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  perform set_config('skatemeet.syncing_ratings', 'on', true);
  update user_spots s
     set rating_avg = agg.rating_avg,
         rating_count = agg.rating_count,
         difficulty_avg = agg.difficulty_avg,
         difficulty_count = agg.difficulty_count,
         smoothness_avg = agg.smoothness_avg,
         smoothness_count = agg.smoothness_count
    from (
      select
        round(avg(rating) filter (where metric = 'rating')::numeric, 2) as rating_avg,
        (count(*) filter (where metric = 'rating'))::int as rating_count,
        round(avg(rating) filter (where metric = 'difficulty')::numeric, 2) as difficulty_avg,
        (count(*) filter (where metric = 'difficulty'))::int as difficulty_count,
        round(avg(rating) filter (where metric = 'smoothness')::numeric, 2) as smoothness_avg,
        (count(*) filter (where metric = 'smoothness'))::int as smoothness_count
        from spot_ratings
       where spot_id = p_spot_id
    ) agg
   where s.spot_id = p_spot_id;
  perform set_config('skatemeet.syncing_ratings', 'off', true);
end;
$$;
revoke all on function public._sync_spot_ratings(uuid) from public, anon, authenticated;

create or replace function public._on_spot_difficulty_rating_change()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') and old.spot_id is not null then
    perform _sync_spot_ratings(old.spot_id);
  end if;
  if tg_op in ('INSERT', 'UPDATE') and new.spot_id is not null
     and (tg_op = 'INSERT' or new.spot_id is distinct from old.spot_id) then
    perform _sync_spot_ratings(new.spot_id);
  end if;
  return null;
end;
$$;
alter function public._on_spot_difficulty_rating_change() rename to _on_spot_rating_change;
alter trigger after_spot_difficulty_rating_change on public.spot_ratings rename to after_spot_rating_change;
alter trigger before_user_spot_guard_difficulty on public.user_spots rename to before_user_spot_guard_ratings;

drop function public._sync_spot_difficulty(uuid);
drop function public.rate_spot_difficulty(uuid, text, smallint);

-- Set (1–5) or clear (null) the caller's rating for one data point. Same
-- gate as reviews and photos: a manual check-in here at least once.
create or replace function public.rate_spot(
  p_spot_id uuid,
  p_osm_place_id text,
  p_metric text,
  p_rating smallint
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if (p_spot_id is null) = (p_osm_place_id is null) then
    raise exception 'Exactly one of p_spot_id / p_osm_place_id is required';
  end if;
  if p_metric is null or p_metric not in ('rating', 'difficulty', 'smoothness') then
    raise exception 'Unknown metric';
  end if;
  if p_rating is not null and (p_rating < 1 or p_rating > 5) then
    raise exception 'Rating must be between 1 and 5';
  end if;
  if not has_manual_checkin(p_spot_id, p_osm_place_id, null, null) then
    raise exception 'NOT_CHECKED_IN';
  end if;

  if p_rating is null then
    delete from spot_ratings
     where profile_id = auth.uid()
       and metric = p_metric
       and (spot_id = p_spot_id or osm_place_id = p_osm_place_id);
    return;
  end if;

  if p_spot_id is not null then
    insert into spot_ratings (profile_id, metric, spot_id, rating)
    values (auth.uid(), p_metric, p_spot_id, p_rating)
    on conflict (profile_id, metric, spot_id) where spot_id is not null
    do update set rating = excluded.rating, updated_at = now();
  else
    insert into spot_ratings (profile_id, metric, osm_place_id, rating)
    values (auth.uid(), p_metric, p_osm_place_id, p_rating)
    on conflict (profile_id, metric, osm_place_id) where osm_place_id is not null
    do update set rating = excluded.rating, updated_at = now();
  end if;
end;
$$;

revoke all on function public.rate_spot(uuid, text, text, smallint) from public, anon;
grant execute on function public.rate_spot(uuid, text, text, smallint) to authenticated;

-- Recompute every cache with the moved rows.
do $$
declare r record;
begin
  for r in select spot_id from public.user_spots loop
    perform public._sync_spot_ratings(r.spot_id);
  end loop;
end;
$$;

-- The data export referenced the old table name.
DO $$
DECLARE
  v_old TEXT := pg_get_functiondef('public.export_my_data'::regproc);
  v_new TEXT := replace(
    v_old,
    $r$'spot_difficulty_ratings', _export_rows('spot_difficulty_ratings', 'profile_id', v_uid),$r$,
    $r$'spot_ratings', _export_rows('spot_ratings', 'profile_id', v_uid),$r$
  );
BEGIN
  IF v_new = v_old THEN
    RAISE EXCEPTION 'export_my_data no longer has the expected spot_difficulty_ratings entry';
  END IF;
  EXECUTE v_new;
END;
$$;
