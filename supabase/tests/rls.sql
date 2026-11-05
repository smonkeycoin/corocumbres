-- Executable PostgreSQL integration suite. Run only against a disposable local database.
begin;
create schema test;
create table test.results(label text not null);
grant usage on schema test to anon, authenticated;
grant insert, select on test.results to anon, authenticated;
create function test.ok(condition boolean, label text) returns void language plpgsql as $$
begin
  if condition is distinct from true then raise exception 'FAIL: %', label; end if;
  insert into test.results values (label);
end;
$$;
create function test.denied(statement text, expected_code text, label text) returns void language plpgsql as $$
begin
  begin
    execute statement;
  exception when others then
    if sqlstate = expected_code then insert into test.results values (label); return; end if;
    raise exception 'FAIL: % (expected %, got %: %)', label, expected_code, sqlstate, sqlerrm;
  end;
  raise exception 'FAIL: % (statement unexpectedly succeeded)', label;
end;
$$;
grant execute on all functions in schema test to anon, authenticated;

-- Supabase Auth owns these records. These inserts emulate provider-verified records, not browser claims.
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values
 ('10000000-0000-0000-0000-000000000001','trinopc1@gmail.com',now(),'{}'),
 ('10000000-0000-0000-0000-000000000002','martrampomp@gmail.com',null,'{}'),
 ('10000000-0000-0000-0000-000000000003','visitor@gmail.com',now(),'{}'),
 ('10000000-0000-0000-0000-000000000004','attacker@gmail.com',now(),'{"email":"trinopc1@gmail.com","email_verified":true,"provider":"google","role":"admin"}'),
 ('10000000-0000-0000-0000-000000000005','trinopc1@gmail.com',now(),'{"email_verified":true,"provider":"google"}'),
 ('10000000-0000-0000-0000-000000000006','martrampomp@gmail.com',now(),'{}');
insert into auth.sessions(id, user_id)
select ('30000000' || substring(id::text from 9))::uuid, id from auth.users;
insert into auth.identities(id,user_id,provider,identity_data) values
 ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','google','{"sub":"real-google-1","email":"trinopc1@gmail.com","email_verified":true}'),
 ('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000002','google','{"sub":"real-google-2","email":"martrampomp@gmail.com","email_verified":true}'),
 ('20000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000003','google','{"sub":"real-google-3","email":"visitor@gmail.com","email_verified":true}'),
 ('20000000-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000004','email','{"email":"attacker@gmail.com"}'),
 ('20000000-0000-0000-0000-000000000005','10000000-0000-0000-0000-000000000005','email','{"email":"trinopc1@gmail.com","email_verified":true}'),
 ('20000000-0000-0000-0000-000000000006','10000000-0000-0000-0000-000000000006','google','{"sub":"unverified-google","email":"martrampomp@gmail.com","email_verified":false}');
select test.ok((select count(*) = 1 from private.admin_memberships), 'Identity trigger provisions only confirmed verified Google admin');
update auth.users set email_confirmed_at=now() where id='10000000-0000-0000-0000-000000000002';
select test.ok((select count(*) = 2 from private.admin_memberships), 'Confirmation after identity triggers second admin provisioning');
select test.ok((select count(*) = 4 from public.masses), 'Exactly four initial masses');
select test.ok((select time is null from public.masses where id='noche'), 'Night mass time remains unspecified');
select test.ok((select count(*) = 6 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('private','public') and c.relname in ('songs','masses','playlists','playlist_items','admin_allowlist','admin_memberships') and c.relrowsecurity), 'Every application table has RLS enabled');

set local role anon;
select set_config('request.jwt.claim.sub','',true);
select set_config('request.jwt.claims','{}',true);
select test.ok(not public.is_admin(), 'Anonymous is not admin');
select test.ok((select count(*)=4 from public.masses), 'Anonymous reads official masses');
select test.denied('select * from private.admin_memberships','42501','Anonymous cannot read private memberships');
select test.denied('select * from private.admin_allowlist','42501','Anonymous cannot read allowlist');
select test.denied($q$select private.sync_admin_membership('10000000-0000-0000-0000-000000000001')$q$,'42501','Anonymous cannot call provisioning helper');
select test.denied($q$insert into public.songs(id,title) values ('attack','Attack')$q$,'42501','Anonymous cannot insert a song');
select test.denied($q$select public.save_playlist('{}')$q$,'42501','Anonymous cannot call playlist save');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
select set_config('request.jwt.claims','{"session_id":"30000000-0000-0000-0000-000000000001"}',true);
select test.ok(public.is_admin(), 'Admin one is authorized');
select test.denied('select * from private.admin_allowlist','42501','Even admins cannot expose allowlist through Data API');
insert into public.songs(id,title,sections,source,notes,tags,liturgical_moments) values
 ('song-a','Entrada','[{"id":"verse-1","type":"verse","label":"Verso","slides":[["Letra completa"]],"lines":[{"id":"line1","lyrics":"Letra completa","chords":[{"symbol":"C","position":0}]}]}]','archivo.pdf','Notas originales','{entrada}','{entrance}'),
 ('song-b','Comunión','[]',null,null,'{}','{communion}'),
 ('song-private','Ensayo privado','[]',null,null,'{}','{}');
select test.ok((select count(*)=3 from public.songs), 'Admin sees full library');
update public.songs set title='Entrada editada' where id='song-a';
select test.ok((select title='Entrada editada' and sections#>>'{0,lines,0,chords,0,symbol}'='C' from public.songs where id='song-a'), 'Song edit preserves lyrics chords and source structure');
update public.songs set created_at='1970-01-01',updated_at='1970-01-01' where id='song-a';
select test.ok((select created_at > '2000-01-01' and updated_at > '2000-01-01' from public.songs where id='song-a'), 'Song edits preserve creation time and server controls update time');
insert into public.songs(id,title) values ('deletable','Temporary');
delete from public.songs where id='deletable';
select test.ok(not exists(select 1 from public.songs where id='deletable'), 'Admin can delete an unreferenced song');
update public.masses set name='MISA DE NIÑOS' where id='ninos';
select test.ok((select name='MISA DE NIÑOS' from public.masses where id='ninos'), 'Admin can manage mass metadata');
select public.save_playlist('{"id":"set-a","title":"Domingo niños","mass_id":"ninos","sunday_date":"2026-11-08","status":"draft","sections":[{"id":"entrance","type":"entrance","label":"Entrada","position":0,"items":[{"id":"item-a","songId":"song-a","position":0},{"id":"item-b","songId":"song-b","position":1}]}]}');
select test.ok((select status='draft' and version=1 and published_at is null and not (sections->0 ? 'items') from public.playlists where id='set-a'), 'Draft save stores metadata without duplicated items');
select test.ok((select count(*)=2 from public.playlist_items where playlist_id='set-a'), 'Draft save atomically stores relational items');
select test.denied($q$update public.playlists set sections='[{"id":"s","type":"free","items":[]}]' where id='set-a'$q$,'23514','Direct metadata writes cannot embed a second items source');
select test.denied($q$update public.playlists set sections='[]' where id='set-a'; set constraints all immediate$q$,'23514','Direct metadata edits cannot orphan existing items');
select test.denied($q$delete from public.songs where id='song-a'$q$,'23001','Referenced songs cannot be deleted');
select test.denied($q$delete from public.masses where id='ninos'$q$,'23001','Referenced masses cannot be deleted');
select test.denied($q$select public.save_playlist('{"id":"duplicate","title":"Duplicate","mass_id":"ninos","sunday_date":"2026-11-08","sections":[]}')$q$,'23505','One playlist per mass and Sunday');
select test.denied($q$select public.save_playlist('{"id":"weekday","title":"Wrong day","sunday_date":"2026-11-09","sections":[]}')$q$,'23514','Sunday date cannot be a Monday');
select test.denied($q$select public.save_playlist('{"id":"missing-assignment","title":"Wrong publication","status":"published","sections":[]}')$q$,'23514','Publishing requires an assigned mass and date');
select test.denied($q$select public.save_playlist('{"id":"set-a","title":"Stale","sections":[]}',99)$q$,'40001','Stale update rejected');
select test.denied($q$select public.save_playlist('{"id":"set-a","title":"Missing version","sections":[]}')$q$,'40001','Existing playlist requires optimistic version');
select test.denied($q$select public.save_playlist('{"id":"missing","title":"Deleted","sections":[]}',1)$q$,'40001','Stale update cannot recreate deleted playlist');
select test.denied($q$select public.save_playlist('{"id":"set-a","title":"Invalid update","sections":[{"id":"s","type":"free","items":[{"id":"i","songId":"missing","position":0}]}]}',1)$q$,'23503','Missing song rejects transaction');
select test.ok((select title='Domingo niños' and version=1 from public.playlists where id='set-a') and (select count(*)=2 from public.playlist_items where playlist_id='set-a'), 'Failed save restores previous playlist and all items');
select test.denied($q$insert into public.playlist_items(playlist_id,id,section_id,song_id,position,liturgical_moment) values ('set-a','bad-section','does-not-exist','song-a',0,'free')$q$,'23514','Direct item writes cannot invent sections');

select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
select set_config('request.jwt.claims','{"session_id":"30000000-0000-0000-0000-000000000002"}',true);
select test.ok(public.is_admin(), 'Admin two has equal access');
select test.ok((select count(*)=3 from public.songs), 'Admin two sees same library');
select public.save_playlist('{"id":"set-a","title":"Domingo niños","mass_id":"ninos","sunday_date":"2026-11-08","status":"published","sections":[{"id":"entrance","type":"entrance","label":"Entrada","position":0,"items":[{"id":"item-b","songId":"song-b","position":0},{"id":"item-a","songId":"song-a","position":1}]}]}',1);
select test.ok((select status='published' and version=2 and published_at is not null and updated_by='10000000-0000-0000-0000-000000000002' from public.playlists where id='set-a'), 'Admin two can publish admin one playlist');
select test.ok((select song_id='song-b' from public.playlist_items where playlist_id='set-a' and position=0), 'Reorder persists correct song positions');
select public.save_playlist('{"id":"set-b","title":"Domingo mediodía","mass_id":"dominical-12","sunday_date":"2026-11-08","status":"draft","sections":[{"id":"s","type":"free","items":[{"id":"private-item","songId":"song-private","position":0}]}]}');
select public.save_playlist('{"id":"set-c","title":"Domingo tarde","mass_id":"dominical-1330","sunday_date":"2026-11-08","status":"published","sections":[]}');
select public.save_playlist('{"id":"set-d","title":"Domingo noche","mass_id":"noche","sunday_date":"2026-11-08","status":"draft","sections":[]}');
select test.ok((select count(distinct mass_id)=4 from public.playlists), 'Four independent mass playlists share the same Sunday');
select public.save_playlist('{"id":"set-c","title":"Domingo tarde","mass_id":"dominical-1330","sunday_date":"2026-11-08","status":"published","sections":[{"id":"disabled","type":"free","isEnabled":false,"items":[{"id":"disabled-song","songId":"song-private","position":0}]}]}',1);
select public.save_playlist('{"id":"imported","title":"Imported local","status":"published","sections":[]}',null,true);
select test.ok((select status='draft' and published_at is null from public.playlists where id='imported'), 'Import can never auto publish');
select test.denied($q$select public.save_playlist('{"id":"set-a","title":"Overwrite import","sections":[]}',2,true)$q$,'23505','Import cannot overwrite existing playlist');
reset role;

set local role anon;
select set_config('request.jwt.claim.sub','',true);
select set_config('request.jwt.claims','{}',true);
select test.ok((select count(*)=2 from public.playlists), 'Anonymous sees only published playlists');
select test.ok(not exists(select 1 from public.playlists where id='set-b'), 'Direct draft lookup returns zero rows');
select test.ok((select count(*)=2 from public.songs), 'Direct full library lookup returns only published songs');
select test.ok(not exists(select 1 from public.songs where id='song-private'), 'Private songs in disabled published sections remain hidden');
select test.ok(not exists(select 1 from public.playlist_items where id='disabled-song'), 'Disabled section items remain private');
select test.ok((select count(*)=2 from public.playlist_items), 'Private draft items are hidden');
select test.denied($q$update public.songs set title='Defaced' where id='song-a'$q$,'42501','Anonymous cannot modify public songs');
select test.denied($q$update public.playlists set status='published' where id='set-b'$q$,'42501','Anonymous cannot publish draft');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000003',true);
select set_config('request.jwt.claims','{"session_id":"30000000-0000-0000-0000-000000000003"}',true);
select test.ok(not public.is_admin(), 'Google visitor is not administrator');
select test.ok((select count(*)=2 from public.songs), 'Unauthorized Google sees only public repertoire');
select test.denied($q$insert into public.songs(id,title) values ('unauthorized','Bad')$q$,'42501','Unauthorized Google cannot insert');
with changed as (update public.songs set title='Bad' where id='song-a' returning id) select test.ok((select count(*)=0 from changed),'Unauthorized Google updates zero rows');
with removed as (delete from public.playlists where id='set-a' returning id) select test.ok((select count(*)=0 from removed),'Unauthorized Google deletes zero rows');
select test.denied($q$select public.save_playlist('{"id":"unauthorized","title":"Bad","sections":[]}')$q$,'42501','Unauthorized Google cannot save or publish');
select test.denied('select * from private.admin_memberships','42501','Unauthorized user cannot enumerate administrators');
select test.denied($q$insert into private.admin_memberships(user_id,email) values ('10000000-0000-0000-0000-000000000003','trinopc1@gmail.com')$q$,'42501','Unauthorized user cannot grant themselves membership');
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000004',true);
select set_config('request.jwt.claims','{"session_id":"30000000-0000-0000-0000-000000000004"}',true);
select test.ok(not public.is_admin(), 'Spoofed user_metadata never grants admin');
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000005',true);
select set_config('request.jwt.claims','{"session_id":"30000000-0000-0000-0000-000000000005"}',true);
select test.ok(not public.is_admin(), 'Allowlisted confirmed email without Google identity is denied');
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000006',true);
select set_config('request.jwt.claims','{"session_id":"30000000-0000-0000-0000-000000000006"}',true);
select test.ok(not public.is_admin(), 'Unverified Google identity cannot provision admin');
select set_config('request.jwt.claim.sub','',true);
select set_config('request.jwt.claims','{}',true);
select test.ok(not public.is_admin(), 'Missing session subject is denied even with authenticated role');
reset role;

-- Revocation is immediate even with a formerly valid subject/JWT.
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
select set_config('request.jwt.claims','{}',true);
select test.ok(not public.is_admin(), 'Admin subject without session claim is denied');
select set_config('request.jwt.claims','{"session_id":"malformed"}',true);
select test.ok(not public.is_admin(), 'Malformed session id fails closed without cast errors');
select set_config('request.jwt.claims','{"session_id":"30000000-0000-0000-0000-000000000002"}',true);
select test.ok(not public.is_admin(), 'Another user session cannot authorize the subject');
reset role;
update auth.sessions set not_after=now()-interval '1 second' where user_id='10000000-0000-0000-0000-000000000001';
set local role authenticated;
select set_config('request.jwt.claims','{"session_id":"30000000-0000-0000-0000-000000000001"}',true);
select test.ok(not public.is_admin(), 'Expired session immediately loses admin');
select test.denied($q$insert into public.songs(id,title) values ('expired','Expired session')$q$,'42501','Expired session cannot write directly through Data API');
reset role;
update auth.sessions set not_after=now()+interval '1 hour' where user_id='10000000-0000-0000-0000-000000000001';
set local role authenticated;
select test.ok(public.is_admin(), 'Unexpired session remains valid');
reset role;
delete from auth.sessions where user_id='10000000-0000-0000-0000-000000000001';
set local role authenticated;
select test.ok(not public.is_admin(), 'Revoked logout session blocks the previous access token');
select test.denied($q$select public.save_playlist('{"id":"revoked","title":"Revoked session","sections":[]}')$q$,'42501','Revoked session cannot save or publish playlists');
reset role;
insert into auth.sessions(id,user_id) values ('30000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001');
update auth.users set banned_until=now()+interval '1 hour' where id='10000000-0000-0000-0000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
select set_config('request.jwt.claims','{"session_id":"30000000-0000-0000-0000-000000000001"}',true);
select test.ok(not public.is_admin(), 'Banned user loses admin immediately');
reset role;
update auth.users set banned_until=null where id='10000000-0000-0000-0000-000000000001';
update auth.identities set identity_data=identity_data || '{"email_verified":false}' where user_id='10000000-0000-0000-0000-000000000001';
select test.ok(not exists(select 1 from private.admin_memberships where user_id='10000000-0000-0000-0000-000000000001'), 'Identity change removes membership');
set local role authenticated;
select test.ok(not public.is_admin(), 'Unverified identity revokes previous JWT access');
reset role;
update auth.identities set identity_data=identity_data || '{"email_verified":true}' where user_id='10000000-0000-0000-0000-000000000001';
set local role authenticated;
select test.ok(public.is_admin(), 'Reverified trusted Google identity provisions again');
select public.save_playlist('{"id":"set-a","title":"Domingo niños","mass_id":"ninos","sunday_date":"2026-11-08","status":"draft","sections":[{"id":"entrance","type":"entrance","label":"Entrada","position":0,"items":[{"id":"item-b","songId":"song-b","position":0},{"id":"item-a","songId":"song-a","position":1}]}]}',2);
select test.ok((select status='draft' and published_at is null and version=3 from public.playlists where id='set-a'), 'Unpublish clears publication timestamp and increments version');
reset role;
set local role anon;
select set_config('request.jwt.claim.sub','',true);
select set_config('request.jwt.claims','{}',true);
select test.ok((select count(*)=0 from public.songs), 'Unpublishing immediately revokes public song access');
select test.ok((select count(*)=0 from public.playlist_items), 'Unpublishing immediately revokes public item access');
select test.ok((select count(*)=1 from public.playlists), 'Other mass publication remains independent');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
select set_config('request.jwt.claims','{"session_id":"30000000-0000-0000-0000-000000000001"}',true);
delete from public.playlists where id='set-a';
select test.ok(not exists(select 1 from public.playlist_items where playlist_id='set-a'), 'Deleting playlist cascades only its own items');
select test.ok((select count(*)=1 from public.playlist_items where playlist_id='set-b'), 'Other mass items survive playlist deletion');
delete from public.songs where id='song-a';
select test.ok(not exists(select 1 from public.songs where id='song-a'), 'Unreferenced song becomes deletable after playlist removal');
reset role;
delete from auth.identities where user_id='10000000-0000-0000-0000-000000000002';
select test.ok(not exists(select 1 from private.admin_memberships where user_id='10000000-0000-0000-0000-000000000002'), 'Removing Google identity removes membership');
delete from private.admin_allowlist where email='trinopc1@gmail.com';
set local role authenticated;
select test.ok(not public.is_admin(), 'Removing allowlist entry immediately revokes existing admin');
reset role;
set constraints all immediate;
select test.ok(true, 'All deferred section constraints validate the completed transactions');
select count(*) as passed, 'PostgreSQL RLS / transaction / integrity assertions' as suite from test.results;
rollback;
