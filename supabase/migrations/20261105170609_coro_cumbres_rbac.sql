-- CORO CUMBRES: additive schema, private administrator provisioning, public repertoire RLS.
-- Apply ONLY to the verified CORO CUMBRES Supabase project after inspecting its schema.
begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to anon, authenticated;

create table private.admin_allowlist (
  email text primary key check (email = lower(email)),
  created_at timestamptz not null default now()
);
create table private.admin_memberships (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null references private.admin_allowlist(email) on delete cascade,
  role text not null default 'admin' check (role = 'admin'),
  created_at timestamptz not null default now()
);
alter table private.admin_allowlist enable row level security;
alter table private.admin_memberships enable row level security;
revoke all on private.admin_allowlist, private.admin_memberships from public, anon, authenticated;
insert into private.admin_allowlist(email) values ('trinopc1@gmail.com'), ('martrampomp@gmail.com');

-- identity_data is provider-controlled in auth.identities. Never consult user_metadata.
-- Called only by trusted auth table triggers and the migration, never exposed as an RPC.
create function private.sync_admin_membership(target_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  delete from private.admin_memberships m where m.user_id = target_user and not exists (
    select 1 from auth.users u
    join auth.identities i on i.user_id = u.id and i.provider = 'google'
    join private.admin_allowlist a on a.email = lower(i.identity_data->>'email')
    where u.id = target_user and u.email_confirmed_at is not null
      and lower(u.email) = a.email and a.email = m.email
      and i.identity_data->>'email_verified' = 'true'
  );
  insert into private.admin_memberships(user_id, email)
    select u.id, a.email from auth.users u
    join auth.identities i on i.user_id = u.id and i.provider = 'google'
    join private.admin_allowlist a on a.email = lower(i.identity_data->>'email')
    where u.id = target_user and u.email_confirmed_at is not null
      and lower(u.email) = a.email and i.identity_data->>'email_verified' = 'true'
    on conflict (user_id) do nothing;
end;
$$;
revoke all on function private.sync_admin_membership(uuid) from public, anon, authenticated;

create function private.sync_admin_from_auth() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_table_name = 'users' then
    perform private.sync_admin_membership(new.id);
  elsif tg_op = 'DELETE' then
    perform private.sync_admin_membership(old.user_id);
  else
    perform private.sync_admin_membership(new.user_id);
    if tg_op = 'UPDATE' and old.user_id is distinct from new.user_id then
      perform private.sync_admin_membership(old.user_id);
    end if;
  end if;
  return null;
end;
$$;
revoke all on function private.sync_admin_from_auth() from public, anon, authenticated;
create trigger coro_admin_user_sync after insert or update of email, email_confirmed_at on auth.users
  for each row execute function private.sync_admin_from_auth();
create trigger coro_admin_identity_sync after insert or update or delete on auth.identities
  for each row execute function private.sync_admin_from_auth();
select private.sync_admin_membership(id) from auth.users
where lower(email) in (select email from private.admin_allowlist);

-- Live checks revoke privileges immediately when membership, identity or session changes.
-- Supabase sign-out removes auth.sessions: a formerly valid access JWT then loses admin access.
create function private.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) is not null and exists (
    select 1 from private.admin_memberships m
    join private.admin_allowlist a on a.email = m.email
    join auth.users u on u.id = m.user_id
    join auth.identities i on i.user_id = u.id and i.provider = 'google'
    where m.user_id = (select auth.uid()) and m.role = 'admin'
      and u.email_confirmed_at is not null
      and (u.banned_until is null or u.banned_until <= now())
      and lower(u.email) = m.email and lower(i.identity_data->>'email') = m.email
      and i.identity_data->>'email_verified' = 'true'
      and exists (
        select 1 from auth.sessions session
        where session.user_id = u.id
          and session.id::text = (select auth.jwt()->>'session_id')
          and (session.not_after is null or session.not_after > now())
      )
  );
$$;
revoke all on function private.is_admin() from public;
grant execute on function private.is_admin() to anon, authenticated;
create function public.is_admin() returns boolean
language sql stable security invoker set search_path = '' as $$ select private.is_admin(); $$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

create table public.songs (
  id text primary key check (length(id) between 1 and 300),
  title text not null check (length(btrim(title)) > 0),
  subtitle text,
  category text,
  tags text[] not null default '{}',
  liturgical_moments text[] not null default '{}',
  source text,
  notes text,
  sections jsonb not null default '[]' check (jsonb_typeof(sections) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.masses (
  id text primary key,
  name text not null check (length(btrim(name)) > 0),
  time time,
  sort_order integer not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
insert into public.masses(id, name, time, sort_order) values
 ('ninos', 'MISA DE NIÑOS', '10:00', 0),
 ('dominical-12', 'MISA DOMINICAL', '12:00', 1),
 ('dominical-1330', 'MISA DOMINICAL', '13:30', 2),
 ('noche', 'MISA NOCHE DOMINICAL', null, 3);
create table public.playlists (
  id text primary key check (length(id) between 1 and 300),
  title text not null check (length(btrim(title)) > 0),
  type text not null default 'sunday_mass' check (type in ('playlist', 'mass', 'sunday_mass')),
  mass_id text references public.masses(id) on delete restrict,
  sunday_date date check (extract(dow from sunday_date) = 0),
  status text not null default 'draft' check (status in ('draft', 'published')),
  notes text,
  sections jsonb not null default '[]' check (jsonb_typeof(sections) = 'array'),
  is_archived boolean not null default false,
  share_id text,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  version bigint not null default 1 check (version > 0),
  constraint published_requires_mass_date check (status <> 'published' or (mass_id is not null and sunday_date is not null and not is_archived)),
  constraint one_playlist_per_mass_sunday unique (mass_id, sunday_date)
);
create table public.playlist_items (
  playlist_id text not null references public.playlists(id) on delete cascade,
  id text not null check (length(id) between 1 and 300),
  section_id text not null,
  song_id text not null references public.songs(id) on delete restrict,
  position integer not null check (position >= 0),
  note text,
  liturgical_moment text not null,
  primary key (playlist_id, id),
  unique (playlist_id, section_id, position)
);
create index playlist_items_song_idx on public.playlist_items(song_id);
create index playlists_public_date_idx on public.playlists(sunday_date, mass_id) where status = 'published';
create index playlists_created_by_idx on public.playlists(created_by);
create index playlists_updated_by_idx on public.playlists(updated_by);
create index admin_memberships_email_idx on private.admin_memberships(email);

create function private.stamp_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.created_at := old.created_at;
  new.updated_at := clock_timestamp();
  return new;
end;
$$;
revoke all on function private.stamp_updated_at() from public, anon, authenticated;
create trigger songs_updated before update on public.songs for each row execute function private.stamp_updated_at();
create trigger masses_updated before update on public.masses for each row execute function private.stamp_updated_at();

create function private.stamp_playlist() returns trigger
language plpgsql set search_path = '' as $$
begin
  if exists (select 1 from jsonb_array_elements(new.sections) s
    where jsonb_typeof(s) <> 'object' or coalesce(s->>'id', '') = ''
      or coalesce(s->>'type', '') = '' or s ? 'items')
    or (select count(*) <> count(distinct s->>'id') from jsonb_array_elements(new.sections) s) then
    raise exception 'Playlist sections require unique ids and types; items belong in playlist_items' using errcode = '23514';
  end if;
  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
    new.version := 1;
  else
    new.created_by := old.created_by;
    new.created_at := old.created_at;
    new.version := old.version + 1;
  end if;
  new.updated_by := auth.uid();
  new.updated_at := clock_timestamp();
  if new.status = 'published' then
    if tg_op = 'UPDATE' and old.status = 'published' then
      new.published_at := old.published_at;
    else
      new.published_at := clock_timestamp();
    end if;
  else
    new.published_at := null;
  end if;
  return new;
end;
$$;
revoke all on function private.stamp_playlist() from public, anon, authenticated;
create trigger playlists_stamp before insert or update on public.playlists for each row execute function private.stamp_playlist();

-- Validate relational items against the section metadata, even for direct Data API writes.
create function private.validate_playlist_item() returns trigger
language plpgsql set search_path = '' as $$
begin
  if not exists (
    select 1 from public.playlists p, jsonb_array_elements(p.sections) s
    where p.id = new.playlist_id and s->>'id' = new.section_id and s->>'type' = new.liturgical_moment
  ) then
    raise exception 'Playlist item must belong to an existing section' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function private.validate_playlist_item() from public, anon, authenticated;
create trigger playlist_item_section before insert or update on public.playlist_items
  for each row execute function private.validate_playlist_item();

-- Deferred so an atomic save can replace section metadata before replacing its items.
create function private.validate_playlist_sections() returns trigger
language plpgsql set search_path = '' as $$
begin
  if exists (
    select 1 from public.playlist_items i join public.playlists p on p.id = i.playlist_id
    where p.id = new.id and not exists (
      select 1 from jsonb_array_elements(p.sections) s
      where s->>'id' = i.section_id and s->>'type' = i.liturgical_moment
    )
  ) then
    raise exception 'Playlist sections must retain all referenced items' using errcode = '23514';
  end if;
  return null;
end;
$$;
revoke all on function private.validate_playlist_sections() from public, anon, authenticated;
create constraint trigger playlist_sections_integrity after insert or update on public.playlists
  deferrable initially deferred for each row execute function private.validate_playlist_sections();

alter table public.songs enable row level security;
alter table public.masses enable row level security;
alter table public.playlists enable row level security;
alter table public.playlist_items enable row level security;
revoke all on public.songs, public.masses, public.playlists, public.playlist_items from public, anon, authenticated;
grant select on public.songs, public.masses, public.playlists, public.playlist_items to anon, authenticated;
grant insert, update, delete on public.songs, public.masses, public.playlists, public.playlist_items to authenticated;

create policy masses_public_read on public.masses for select to anon, authenticated using (true);
create policy masses_admin_all on public.masses for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy playlists_public_read on public.playlists for select to anon, authenticated using (status = 'published');
create policy playlists_admin_all on public.playlists for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy playlist_items_public_read on public.playlist_items for select to anon, authenticated using (
  exists (select 1 from public.playlists p, jsonb_array_elements(p.sections) s
    where p.id = playlist_id and p.status = 'published'
      and s->>'id' = section_id and coalesce(s->>'isEnabled', 'true') <> 'false')
);
create policy playlist_items_admin_all on public.playlist_items for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy songs_public_read on public.songs for select to anon, authenticated using (
  exists (select 1 from public.playlist_items i join public.playlists p on p.id = i.playlist_id
    where i.song_id = songs.id and p.status = 'published')
);
create policy songs_admin_all on public.songs for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

-- Atomic save. Whole CoroSet-compatible sections in; metadata and relational items persisted.
-- Invoker privileges ensure RLS remains the authority. No service-role key is needed.
create function public.save_playlist(p_playlist jsonb, p_expected_version bigint default null, p_import boolean default false)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  saved public.playlists;
  existing public.playlists;
  part jsonb;
  item jsonb;
  section_metadata jsonb;
  desired_status text;
begin
  if not private.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  if jsonb_typeof(p_playlist->'sections') is distinct from 'array' then
    raise exception 'sections must be an array' using errcode = '22023';
  end if;
  if exists (select 1 from jsonb_array_elements(p_playlist->'sections') s
    where coalesce(s->>'id', '') = '' or coalesce(s->>'type', '') = ''
      or jsonb_typeof(s->'items') is distinct from 'array') then
    raise exception 'Every section requires id, type and items' using errcode = '22023';
  end if;
  if (select count(*) <> count(distinct s->>'id') from jsonb_array_elements(p_playlist->'sections') s) then
    raise exception 'Duplicate section ids' using errcode = '22023';
  end if;
  select coalesce(jsonb_agg(s - 'items' order by ordinal), '[]'::jsonb) into section_metadata
    from jsonb_array_elements(p_playlist->'sections') with ordinality as e(s, ordinal);
  desired_status := case when p_import then 'draft' else coalesce(p_playlist->>'status', 'draft') end;
  select * into existing from public.playlists where id = p_playlist->>'id' for update;
  if found then
    if p_import then
      raise exception 'Import would overwrite an existing playlist' using errcode = '23505';
    end if;
    if p_expected_version is null or existing.version <> p_expected_version then
      raise exception 'Playlist changed; reload before saving' using errcode = '40001';
    end if;
    update public.playlists set
      title = p_playlist->>'title', type = coalesce(p_playlist->>'type', 'sunday_mass'),
      mass_id = nullif(p_playlist->>'mass_id', ''), sunday_date = nullif(p_playlist->>'sunday_date', '')::date,
      status = desired_status, notes = p_playlist->>'notes', sections = section_metadata,
      is_archived = coalesce((p_playlist->>'is_archived')::boolean, false), share_id = p_playlist->>'share_id'
    where id = existing.id returning * into saved;
    delete from public.playlist_items where playlist_id = saved.id;
  else
    if p_expected_version is not null then
      raise exception 'Playlist no longer exists; reload before saving' using errcode = '40001';
    end if;
    insert into public.playlists(id, title, type, mass_id, sunday_date, status, notes, sections, is_archived, share_id, created_at)
      values (p_playlist->>'id', p_playlist->>'title', coalesce(p_playlist->>'type', 'sunday_mass'),
        nullif(p_playlist->>'mass_id', ''), nullif(p_playlist->>'sunday_date', '')::date,
        desired_status, p_playlist->>'notes', section_metadata,
        coalesce((p_playlist->>'is_archived')::boolean, false), p_playlist->>'share_id',
        coalesce((p_playlist->>'created_at')::timestamptz, now())) returning * into saved;
  end if;
  for part in select value from jsonb_array_elements(p_playlist->'sections') loop
    for item in select value from jsonb_array_elements(part->'items') loop
      insert into public.playlist_items(playlist_id, id, section_id, song_id, position, note, liturgical_moment)
        values (saved.id, item->>'id', part->>'id', item->>'songId', (item->>'position')::integer, item->>'note', part->>'type');
    end loop;
  end loop;
  return to_jsonb(saved);
end;
$$;
revoke all on function public.save_playlist(jsonb, bigint, boolean) from public, anon;
grant execute on function public.save_playlist(jsonb, bigint, boolean) to authenticated;

commit;
