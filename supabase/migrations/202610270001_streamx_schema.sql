create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (char_length(username) between 3 and 32),
  display_name text not null default 'StreamX creator',
  avatar_url text,
  bio text not null default '' check (char_length(bio) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.videos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  description text not null default '' check (char_length(description) <= 10000),
  thumbnail_key text,
  category_id uuid references public.categories(id) on delete set null,
  duration_seconds integer not null default 0 check (duration_seconds >= 0),
  visibility text not null default 'private' check (visibility in ('public', 'unlisted', 'private')),
  processing_status text not null default 'uploading' check (processing_status in ('uploading', 'uploaded', 'processing', 'ready', 'failed', 'deleting')),
  source_object_key text not null unique,
  playback_manifest_key text,
  view_count bigint not null default 0 check (view_count >= 0),
  published_at timestamptz,
  search_vector tsvector generated always as (to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(description, ''))) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.video_tags (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.videos(id) on delete cascade,
  tag text not null check (char_length(tag) between 1 and 40),
  unique (video_id, tag)
);

create table if not exists public.watch_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  video_id uuid not null references public.videos(id) on delete cascade,
  progress_seconds integer not null default 0 check (progress_seconds >= 0),
  completed boolean not null default false,
  last_watched_at timestamptz not null default now(),
  unique (user_id, video_id)
);

create table if not exists public.playlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  description text not null default '' check (char_length(description) <= 2000),
  visibility text not null default 'private' check (visibility in ('public', 'private')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.playlist_videos (
  id uuid primary key default gen_random_uuid(),
  playlist_id uuid not null references public.playlists(id) on delete cascade,
  video_id uuid not null references public.videos(id) on delete cascade,
  position integer not null default 0 check (position >= 0),
  added_at timestamptz not null default now(),
  unique (playlist_id, video_id),
  unique (playlist_id, position)
);

create table if not exists public.video_likes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  video_id uuid not null references public.videos(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, video_id)
);

create table if not exists public.watch_later (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  video_id uuid not null references public.videos(id) on delete cascade,
  added_at timestamptz not null default now(),
  unique (user_id, video_id)
);

-- Internal upload state is accessible only to the server's service-role client.
create table if not exists public.upload_sessions (
  video_id uuid primary key references public.videos(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  object_key text not null unique,
  multipart_upload_id text,
  expected_size bigint not null check (expected_size > 0),
  expected_content_type text not null,
  created_at timestamptz not null default now()
);

create index if not exists videos_discovery_idx on public.videos (published_at desc, created_at desc) where visibility = 'public' and processing_status = 'ready';
create index if not exists videos_owner_idx on public.videos (user_id, created_at desc);
create index if not exists videos_category_idx on public.videos (category_id, published_at desc) where visibility = 'public' and processing_status = 'ready';
create index if not exists videos_views_idx on public.videos (view_count desc) where visibility = 'public' and processing_status = 'ready';
create index if not exists videos_title_search_idx on public.videos using gin (search_vector);
create index if not exists video_tags_tag_idx on public.video_tags (lower(tag));
create index if not exists watch_history_user_recent_idx on public.watch_history (user_id, last_watched_at desc);
create index if not exists watch_later_user_recent_idx on public.watch_later (user_id, added_at desc);
create index if not exists playlist_videos_order_idx on public.playlist_videos (playlist_id, position);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
drop trigger if exists videos_set_updated_at on public.videos;
create trigger videos_set_updated_at before update on public.videos for each row execute function public.set_updated_at();
drop trigger if exists playlists_set_updated_at on public.playlists;
create trigger playlists_set_updated_at before update on public.playlists for each row execute function public.set_updated_at();

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    'member_' || left(replace(new.id::text, '-', ''), 12),
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), nullif(split_part(new.email, '@', 1), ''), 'StreamX creator')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_streamx on auth.users;
create trigger on_auth_user_created_streamx after insert on auth.users for each row execute function public.create_profile_for_new_user();

insert into public.profiles (id, username, display_name)
select
  u.id,
  'member_' || left(replace(u.id::text, '-', ''), 12),
  coalesce(nullif(u.raw_user_meta_data ->> 'display_name', ''), nullif(split_part(u.email, '@', 1), ''), 'StreamX creator')
from auth.users u
on conflict (id) do nothing;

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.videos enable row level security;
alter table public.video_tags enable row level security;
alter table public.watch_history enable row level security;
alter table public.playlists enable row level security;
alter table public.playlist_videos enable row level security;
alter table public.video_likes enable row level security;
alter table public.watch_later enable row level security;
alter table public.upload_sessions enable row level security;

create policy "profiles are readable" on public.profiles for select using (true);
create policy "users update own profile" on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "categories are readable" on public.categories for select using (true);

create policy "discover ready published videos and own uploads" on public.videos for select using (
  user_id = (select auth.uid()) or
  (processing_status = 'ready' and visibility in ('public', 'unlisted') and published_at is not null and published_at <= now())
);
create policy "owners edit video metadata" on public.videos for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
revoke insert, delete on public.videos from anon, authenticated;
revoke update on public.videos from authenticated;

revoke all on public.upload_sessions from anon, authenticated;
grant all on public.upload_sessions to service_role;

create policy "tags follow video visibility" on public.video_tags for select using (
  exists (select 1 from public.videos v where v.id = video_id and (v.user_id = (select auth.uid()) or (v.processing_status = 'ready' and v.visibility in ('public', 'unlisted') and v.published_at is not null)))
);
create policy "owners manage tags" on public.video_tags for all to authenticated
  using (exists (select 1 from public.videos v where v.id = video_id and v.user_id = (select auth.uid())))
  with check (exists (select 1 from public.videos v where v.id = video_id and v.user_id = (select auth.uid())));

create policy "users manage own watch history" on public.watch_history for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "owners and public playlists are readable" on public.playlists for select using (user_id = (select auth.uid()) or visibility = 'public');
create policy "users manage own playlists" on public.playlists for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "playlist items follow playlist visibility" on public.playlist_videos for select using (
  exists (select 1 from public.playlists p where p.id = playlist_id and (p.user_id = (select auth.uid()) or p.visibility = 'public'))
);
create policy "playlist owners manage items" on public.playlist_videos for all to authenticated
  using (exists (select 1 from public.playlists p where p.id = playlist_id and p.user_id = (select auth.uid())))
  with check (exists (select 1 from public.playlists p where p.id = playlist_id and p.user_id = (select auth.uid())));

create policy "users read own likes" on public.video_likes for select to authenticated using (
  user_id = (select auth.uid())
);
create policy "users manage own likes" on public.video_likes for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "users manage own watch later" on public.watch_later for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

grant select on public.profiles, public.categories, public.video_tags to anon, authenticated;
grant select on public.video_likes to authenticated;
revoke all on public.videos from anon, authenticated;
grant select (id, user_id, title, description, thumbnail_key, category_id, duration_seconds, visibility, processing_status, view_count, published_at, created_at, updated_at, search_vector) on public.videos to anon, authenticated;
grant update (title, description, category_id, updated_at) on public.videos to authenticated;
grant select, insert, update, delete on public.profiles, public.watch_history, public.playlists, public.playlist_videos, public.video_likes, public.watch_later, public.video_tags to authenticated;
grant select on public.playlists, public.playlist_videos to anon;
grant all on public.profiles, public.categories, public.videos, public.video_tags, public.watch_history, public.playlists, public.playlist_videos, public.video_likes, public.watch_later to service_role;

create or replace function public.increment_video_view(p_video_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.videos
     set view_count = view_count + 1
   where id = p_video_id
     and processing_status = 'ready'
     and visibility in ('public', 'unlisted')
     and published_at is not null;
$$;
revoke all on function public.increment_video_view(uuid) from public, anon, authenticated;
grant execute on function public.increment_video_view(uuid) to service_role;

create or replace function public.search_public_videos(
  p_query text default '',
  p_category_slug text default null,
  p_sort text default 'relevance',
  p_limit integer default 24,
  p_offset integer default 0
)
returns table (
  id uuid,
  user_id uuid,
  title text,
  description text,
  thumbnail_key text,
  category_id uuid,
  duration_seconds integer,
  visibility text,
  processing_status text,
  view_count bigint,
  published_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  creator_display_name text,
  creator_username text,
  creator_avatar_url text,
  category_name text,
  category_slug text
)
language sql
stable
security invoker
set search_path = ''
as $$
  select v.id, v.user_id, v.title, v.description, v.thumbnail_key, v.category_id,
         v.duration_seconds, v.visibility, v.processing_status, v.view_count,
         v.published_at, v.created_at, v.updated_at,
         p.display_name, p.username, p.avatar_url, c.name, c.slug
    from public.videos v
    left join public.profiles p on p.id = v.user_id
    left join public.categories c on c.id = v.category_id
   where v.processing_status = 'ready'
     and v.visibility = 'public'
     and v.published_at is not null
     and v.published_at <= now()
     and (p_category_slug is null or c.slug = p_category_slug)
     and (
       nullif(trim(p_query), '') is null
       or v.search_vector @@ websearch_to_tsquery('simple', p_query)
       or p.display_name ilike '%' || p_query || '%'
       or p.username ilike '%' || p_query || '%'
       or c.name ilike '%' || p_query || '%'
       or exists (select 1 from public.video_tags t where t.video_id = v.id and t.tag ilike '%' || p_query || '%')
     )
   order by
     case when p_sort = 'popular' then v.view_count end desc nulls last,
     case when p_sort = 'newest' then v.published_at end desc nulls last,
     case when p_sort not in ('popular', 'newest') and nullif(trim(p_query), '') is not null
       then ts_rank(v.search_vector, websearch_to_tsquery('simple', p_query)) end desc nulls last,
     v.published_at desc
   limit greatest(1, least(coalesce(p_limit, 24), 50))
   offset greatest(coalesce(p_offset, 0), 0);
$$;
revoke all on function public.search_public_videos(text, text, text, integer, integer) from public;
grant execute on function public.search_public_videos(text, text, text, integer, integer) to anon, authenticated;

create or replace function public.creator_dashboard_metrics()
returns table (
  total_videos bigint,
  total_views numeric,
  published_videos bigint,
  unpublished_videos bigint,
  processing_videos bigint,
  failed_videos bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select count(*)::bigint,
         coalesce(sum(v.view_count), 0)::numeric,
         count(*) filter (where v.processing_status = 'ready' and v.visibility = 'public' and v.published_at is not null)::bigint,
         count(*) filter (where v.visibility <> 'public' or v.processing_status <> 'ready' or v.published_at is null)::bigint,
         count(*) filter (where v.processing_status in ('uploading', 'uploaded', 'processing'))::bigint,
         count(*) filter (where v.processing_status = 'failed')::bigint
    from public.videos v
   where v.user_id = (select auth.uid());
$$;
grant execute on function public.creator_dashboard_metrics() to authenticated;
revoke all on function public.creator_dashboard_metrics() from public, anon;

