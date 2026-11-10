-- Spot difficulty becomes a community data point: every skater who has
-- checked in at a spot (or DIY) can rate it 1–5, one rating each, and the
-- spot shows the average. The creator no longer sets it on creation.
--
-- user_spots.difficulty (the creator's value) is left in place but no longer
-- written or read by the app. user_spots gets a cached average/count so map
-- cards can show the difficulty tier without an extra query; OSM spots read
-- the average straight from the ratings table on their detail page.

create table public.spot_difficulty_ratings (
  rating_id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(profile_id) on delete cascade,
  spot_id uuid references public.user_spots(spot_id) on delete cascade,
  osm_place_id text,
  rating smallint not null check (rating between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint spot_difficulty_ratings_one_target
    check ((spot_id is null) <> (osm_place_id is null))
);

create unique index spot_difficulty_ratings_user_spot_uniq
  on public.spot_difficulty_ratings (profile_id, spot_id) where spot_id is not null;
create unique index spot_difficulty_ratings_osm_spot_uniq
  on public.spot_difficulty_ratings (profile_id, osm_place_id) where osm_place_id is not null;
create index spot_difficulty_ratings_spot_idx
  on public.spot_difficulty_ratings (spot_id) where spot_id is not null;
create index spot_difficulty_ratings_osm_idx
  on public.spot_difficulty_ratings (osm_place_id) where osm_place_id is not null;

-- Readable by anyone (it's an aggregate input, like review ratings). No
-- write policies: every write goes through rate_spot_difficulty().
alter table public.spot_difficulty_ratings enable row level security;
create policy spot_difficulty_ratings_read on public.spot_difficulty_ratings
  for select using (true);

-- Cached community average on user spots.
alter table public.user_spots
  add column difficulty_avg numeric(3, 2),
  add column difficulty_count integer not null default 0;

-- The creator can update their own user_spots row, so guard the cache: only
-- the sync function below (which sets this flag for its own transaction)
-- may change it; anything else keeps the old values.
create or replace function public._guard_spot_difficulty_cache()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
  if coalesce(current_setting('skatemeet.syncing_difficulty', true), '') = 'on' then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.difficulty_avg := null;
    new.difficulty_count := 0;
  else
    new.difficulty_avg := old.difficulty_avg;
    new.difficulty_count := old.difficulty_count;
  end if;
  return new;
end;
$$;

create trigger before_user_spot_guard_difficulty
  before insert or update on public.user_spots
  for each row execute function public._guard_spot_difficulty_cache();

create or replace function public._sync_spot_difficulty(p_spot_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  perform set_config('skatemeet.syncing_difficulty', 'on', true);
  update user_spots s
     set difficulty_avg = agg.avg_rating,
         difficulty_count = agg.n
    from (
      select round(avg(rating)::numeric, 2) as avg_rating, count(*)::int as n
        from spot_difficulty_ratings
       where spot_id = p_spot_id
    ) agg
   where s.spot_id = p_spot_id;
  perform set_config('skatemeet.syncing_difficulty', 'off', true);
end;
$$;

create or replace function public._on_spot_difficulty_rating_change()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') and old.spot_id is not null then
    perform _sync_spot_difficulty(old.spot_id);
  end if;
  if tg_op in ('INSERT', 'UPDATE') and new.spot_id is not null
     and (tg_op = 'INSERT' or new.spot_id is distinct from old.spot_id) then
    perform _sync_spot_difficulty(new.spot_id);
  end if;
  return null;
end;
$$;

create trigger after_spot_difficulty_rating_change
  after insert or update or delete on public.spot_difficulty_ratings
  for each row execute function public._on_spot_difficulty_rating_change();

-- Set (1–5) or clear (null) the caller's rating. Same gate as reviews and
-- photos: the skater must have manually checked in here at least once.
create or replace function public.rate_spot_difficulty(
  p_spot_id uuid,
  p_osm_place_id text,
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
  if p_rating is not null and (p_rating < 1 or p_rating > 5) then
    raise exception 'Rating must be between 1 and 5';
  end if;
  if not has_manual_checkin(p_spot_id, p_osm_place_id, null, null) then
    raise exception 'NOT_CHECKED_IN';
  end if;

  if p_rating is null then
    delete from spot_difficulty_ratings
     where profile_id = auth.uid()
       and (spot_id = p_spot_id or osm_place_id = p_osm_place_id);
    return;
  end if;

  if p_spot_id is not null then
    insert into spot_difficulty_ratings (profile_id, spot_id, rating)
    values (auth.uid(), p_spot_id, p_rating)
    on conflict (profile_id, spot_id) where spot_id is not null
    do update set rating = excluded.rating, updated_at = now();
  else
    insert into spot_difficulty_ratings (profile_id, osm_place_id, rating)
    values (auth.uid(), p_osm_place_id, p_rating)
    on conflict (profile_id, osm_place_id) where osm_place_id is not null
    do update set rating = excluded.rating, updated_at = now();
  end if;
end;
$$;

revoke all on function public.rate_spot_difficulty(uuid, text, smallint) from public, anon;
grant execute on function public.rate_spot_difficulty(uuid, text, smallint) to authenticated;
revoke all on function public._sync_spot_difficulty(uuid) from public, anon, authenticated;

-- Seed from existing spot review ratings: those came from checked-in
-- skaters, so they're already community ratings. Latest one per skater per
-- spot wins. Creator-set user_spots.difficulty values are not carried over.
insert into public.spot_difficulty_ratings (profile_id, spot_id, osm_place_id, rating, created_at, updated_at)
select distinct on (profile_id, coalesce(spot_id::text, osm_place_id))
       profile_id,
       spot_id,
       osm_place_id,
       least(5, greatest(1, round(rating)))::smallint,
       created_at,
       created_at
  from public.spot_reviews
 where rating is not null
 order by profile_id, coalesce(spot_id::text, osm_place_id), created_at desc;

-- Backfill the cache for every user spot (the insert trigger above already
-- covered seeded ones; this also zeroes the rest explicitly).
do $$
declare r record;
begin
  for r in select spot_id from public.user_spots loop
    perform public._sync_spot_difficulty(r.spot_id);
  end loop;
end;
$$;

-- export_my_data() gains the caller's difficulty ratings, next to their
-- spot reviews (same in-place patch pattern as the spot chats migration).
DO $$
DECLARE
  v_old TEXT := pg_get_functiondef('public.export_my_data'::regproc);
  v_new TEXT := replace(
    v_old,
    $r$'spot_reviews', _export_rows('spot_reviews', 'profile_id', v_uid),$r$,
    $r$'spot_reviews', _export_rows('spot_reviews', 'profile_id', v_uid),
    'spot_difficulty_ratings', _export_rows('spot_difficulty_ratings', 'profile_id', v_uid),$r$
  );
BEGIN
  IF v_new = v_old THEN
    RAISE EXCEPTION 'export_my_data no longer has the expected spot_reviews entry';
  END IF;
  EXECUTE v_new;
END;
$$;
