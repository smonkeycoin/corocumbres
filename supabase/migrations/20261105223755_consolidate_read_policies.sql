-- Preserve the initial authorization model while avoiding overlapping SELECT policies.
-- Anon remains public-only, even when inspecting policy behavior with synthetic SQL claims.
begin;

drop policy masses_admin_all on public.masses;
create policy masses_admin_insert on public.masses for insert to authenticated
  with check ((select private.is_admin()));
create policy masses_admin_update on public.masses for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy masses_admin_delete on public.masses for delete to authenticated
  using ((select private.is_admin()));
-- masses_public_read already grants the same SELECT access to both roles.

drop policy playlists_admin_all on public.playlists;
alter policy playlists_public_read on public.playlists to anon;
create policy playlists_authenticated_read on public.playlists for select to authenticated
  using ((select private.is_admin()) or status = 'published');
create policy playlists_admin_insert on public.playlists for insert to authenticated
  with check ((select private.is_admin()));
create policy playlists_admin_update on public.playlists for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy playlists_admin_delete on public.playlists for delete to authenticated
  using ((select private.is_admin()));

drop policy playlist_items_admin_all on public.playlist_items;
alter policy playlist_items_public_read on public.playlist_items to anon;
create policy playlist_items_authenticated_read on public.playlist_items for select to authenticated
  using ((select private.is_admin()) or exists (
    select 1 from public.playlists p, jsonb_array_elements(p.sections) s
    where p.id = playlist_id and p.status = 'published'
      and s->>'id' = section_id and coalesce(s->>'isEnabled', 'true') <> 'false'
  ));
create policy playlist_items_admin_insert on public.playlist_items for insert to authenticated
  with check ((select private.is_admin()));
create policy playlist_items_admin_update on public.playlist_items for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy playlist_items_admin_delete on public.playlist_items for delete to authenticated
  using ((select private.is_admin()));

drop policy songs_admin_all on public.songs;
alter policy songs_public_read on public.songs to anon;
create policy songs_authenticated_read on public.songs for select to authenticated
  using ((select private.is_admin()) or exists (
    select 1 from public.playlist_items i join public.playlists p on p.id = i.playlist_id
    where i.song_id = songs.id and p.status = 'published'
  ));
create policy songs_admin_insert on public.songs for insert to authenticated
  with check ((select private.is_admin()));
create policy songs_admin_update on public.songs for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy songs_admin_delete on public.songs for delete to authenticated
  using ((select private.is_admin()));

commit;
