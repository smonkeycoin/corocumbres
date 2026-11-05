-- REVIEW BEFORE RUNNING. Uses the real Supabase Auth schema, as inspected on CORO CUMBRES.
-- Synthetic identities exist ONLY in this transaction; no Auth endpoint/email/OAuth is invoked.
-- Entire script must be sent in one database connection. Never remove BEGIN or ROLLBACK.
begin;
set local statement_timeout = '30s';
set local lock_timeout = '5s';
create schema coro_live_check;
create table coro_live_check.results(label text not null);
grant usage on schema coro_live_check to anon, authenticated;
grant select, insert on coro_live_check.results to anon, authenticated;
create function coro_live_check.ok(condition boolean, label text) returns void language plpgsql as $$
begin
  if condition is distinct from true then raise exception 'FAIL: %', label; end if;
  insert into coro_live_check.results values(label);
end;
$$;
create function coro_live_check.denied(statement text, expected_code text, label text) returns void language plpgsql as $$
begin
  begin execute statement;
  exception when others then
    if sqlstate = any(string_to_array(expected_code, ',')) then insert into coro_live_check.results values(label); return; end if;
    raise exception 'FAIL: % (expected %, got %)', label, expected_code, sqlstate;
  end;
  raise exception 'FAIL: % (unexpected success)', label;
end;
$$;
grant execute on all functions in schema coro_live_check to anon, authenticated;

-- Fail safely if either real administrator has already signed in: never alter their account.
do $$ begin
  if exists(select 1 from auth.users where lower(email) in ('trinopc1@gmail.com','martrampomp@gmail.com')) then
    raise exception 'Real administrator exists: use authenticated browser verification; do not replace identities';
  end if;
end $$;
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values
 ('c0800000-0000-4000-8000-000000000001','trinopc1@gmail.com',now(),'{}'),
 ('c0800000-0000-4000-8000-000000000002','martrampomp@gmail.com',now(),'{}'),
 ('c0800000-0000-4000-8000-000000000003','coro-rls-visitor@example.invalid',now(),'{}'),
 ('c0800000-0000-4000-8000-000000000004','coro-rls-spoof@example.invalid',now(),'{"email":"trinopc1@gmail.com","email_verified":true,"provider":"google","role":"admin"}');
insert into auth.identities(provider_id,user_id,provider,identity_data) values
 ('coro-rollback-fixture-google1','c0800000-0000-4000-8000-000000000001','google','{"sub":"coro-rollback-fixture-google1","email":"trinopc1@gmail.com","email_verified":true}'),
 ('coro-rollback-fixture-google2','c0800000-0000-4000-8000-000000000002','google','{"sub":"coro-rollback-fixture-google2","email":"martrampomp@gmail.com","email_verified":true}'),
 ('coro-rollback-fixture-visitor','c0800000-0000-4000-8000-000000000003','google','{"sub":"coro-rollback-fixture-visitor","email":"coro-rls-visitor@example.invalid","email_verified":true}'),
 ('c0800000-0000-4000-8000-000000000004','c0800000-0000-4000-8000-000000000004','email','{"email":"coro-rls-spoof@example.invalid"}');
insert into auth.sessions(id,user_id) values
 ('c0900000-0000-4000-8000-000000000001','c0800000-0000-4000-8000-000000000001'),
 ('c0900000-0000-4000-8000-000000000002','c0800000-0000-4000-8000-000000000002'),
 ('c0900000-0000-4000-8000-000000000003','c0800000-0000-4000-8000-000000000003'),
 ('c0900000-0000-4000-8000-000000000004','c0800000-0000-4000-8000-000000000004');
select coro_live_check.ok((select count(*)=2 from private.admin_memberships where user_id::text like 'c0800000-%'),'Only two verified Google allowlist identities provision');

set local role authenticated;
select set_config('request.jwt.claim.sub','c0800000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"c0800000-0000-4000-8000-000000000001","role":"authenticated","session_id":"c0900000-0000-4000-8000-000000000001"}',true);
select coro_live_check.ok(public.is_admin(),'Admin one authorized with real auth.sessions lookup');
insert into public.songs(id,title) values ('__coro_rls_public','Temporary public fixture'),('__coro_rls_private','Temporary private fixture');
update public.songs set title='Temporary edited fixture' where id='__coro_rls_public';
select coro_live_check.ok((select title='Temporary edited fixture' from public.songs where id='__coro_rls_public'),'Admin CRUD song update');
select public.save_playlist('{"id":"__coro_rls_ninos","title":"Temporary draft","mass_id":"ninos","sunday_date":"2099-01-04","sections":[{"id":"entrance","type":"entrance","items":[{"id":"item","songId":"__coro_rls_public","position":0}]}]}');
select public.save_playlist('{"id":"__coro_rls_noon","title":"Temporary noon","mass_id":"dominical-12","sunday_date":"2099-01-04","sections":[{"id":"free","type":"free","items":[{"id":"item","songId":"__coro_rls_private","position":0}]}]}');
select public.save_playlist('{"id":"__coro_rls_afternoon","title":"Temporary afternoon","mass_id":"dominical-1330","sunday_date":"2099-01-04","sections":[]}');
select public.save_playlist('{"id":"__coro_rls_night","title":"Temporary night","mass_id":"noche","sunday_date":"2099-01-04","sections":[]}');
select coro_live_check.ok((select count(distinct mass_id)=4 from public.playlists where id like '__coro_rls_%'),'Four masses remain independent on same Sunday');
select coro_live_check.denied($q$delete from public.songs where id='__coro_rls_public'$q$,'23001,23503','Referenced song deletion rejected');
select coro_live_check.denied($q$select public.save_playlist('{"id":"__coro_rls_ninos","title":"Stale","sections":[]}',99)$q$,'40001','Optimistic concurrency rejects stale save');
select coro_live_check.denied('select * from private.admin_memberships','42501','Admin cannot enumerate private memberships');
reset role;

set local role anon;
select set_config('request.jwt.claim.sub','',true);
select set_config('request.jwt.claims','{}',true);
select coro_live_check.ok(not public.is_admin(),'Anonymous is not admin');
select coro_live_check.ok(not exists(select 1 from public.songs where id like '__coro_rls_%'),'Anonymous full query hides both draft songs');
select coro_live_check.ok(not exists(select 1 from public.playlists where id like '__coro_rls_%'),'Anonymous cannot read draft playlists');
select coro_live_check.denied($q$insert into public.songs(id,title) values ('__coro_rls_attack','Denied')$q$,'42501','Anonymous insert denied');
select coro_live_check.denied($q$update public.playlists set status='published' where id='__coro_rls_ninos'$q$,'42501','Anonymous publication denied');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','c0800000-0000-4000-8000-000000000002',true);
select set_config('request.jwt.claims','{"sub":"c0800000-0000-4000-8000-000000000002","role":"authenticated","session_id":"c0900000-0000-4000-8000-000000000002"}',true);
select coro_live_check.ok(public.is_admin(),'Admin two has equal access');
select coro_live_check.ok((select count(*)=2 from public.songs where id like '__coro_rls_%'),'Admin two sees private fixture songs');
select public.save_playlist('{"id":"__coro_rls_ninos","title":"Temporary published","mass_id":"ninos","sunday_date":"2099-01-04","status":"published","sections":[{"id":"entrance","type":"entrance","items":[{"id":"item","songId":"__coro_rls_public","position":0}]}]}',1);
select coro_live_check.ok((select status='published' and version=2 from public.playlists where id='__coro_rls_ninos'),'Admin two publishes admin one playlist');
reset role;

set local role anon;
select set_config('request.jwt.claim.sub','',true);
select set_config('request.jwt.claims','{}',true);
select coro_live_check.ok((select count(*)=1 from public.songs where id like '__coro_rls_%'),'Anonymous reads only the published fixture song');
select coro_live_check.ok(not exists(select 1 from public.songs where id='__coro_rls_private'),'Unpublished song remains hidden');
select coro_live_check.ok((select count(*)=1 from public.playlists where id like '__coro_rls_%'),'Other three mass drafts remain hidden');
select coro_live_check.ok((select count(*)=1 from public.playlist_items where playlist_id like '__coro_rls_%'),'Items never mix across mass publications');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','c0800000-0000-4000-8000-000000000003',true);
select set_config('request.jwt.claims','{"sub":"c0800000-0000-4000-8000-000000000003","role":"authenticated","session_id":"c0900000-0000-4000-8000-000000000003"}',true);
select coro_live_check.ok(not public.is_admin(),'Nonallowlisted Google identity denied');
select coro_live_check.ok((select count(*)=1 from public.songs where id like '__coro_rls_%'),'Authenticated visitor reads only published song');
select coro_live_check.denied($q$select public.save_playlist('{"id":"__coro_rls_attack","title":"Denied","sections":[]}')$q$,'42501','Nonadmin cannot save playlist');
with changed as(update public.songs set title='Denied' where id='__coro_rls_public' returning id) select coro_live_check.ok((select count(*)=0 from changed),'Nonadmin cannot update even public song');
select set_config('request.jwt.claim.sub','c0800000-0000-4000-8000-000000000004',true);
select set_config('request.jwt.claims','{"sub":"c0800000-0000-4000-8000-000000000004","role":"authenticated","session_id":"c0900000-0000-4000-8000-000000000004"}',true);
select coro_live_check.ok(not public.is_admin(),'Spoofed user metadata never grants permissions');
reset role;

-- These are fixture-only sessions, never sessions belonging to real users.
update auth.sessions set not_after=now()-interval '1 second' where id='c0900000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub','c0800000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"c0800000-0000-4000-8000-000000000001","role":"authenticated","session_id":"c0900000-0000-4000-8000-000000000001"}',true);
select coro_live_check.ok(not public.is_admin(),'Expired real-schema session denies administration');
reset role;
delete from auth.sessions where id='c0900000-0000-4000-8000-000000000001';
set local role authenticated;
select coro_live_check.ok(not public.is_admin(),'Removed session revokes still-present JWT subject');
select coro_live_check.denied($q$insert into public.songs(id,title) values ('__coro_rls_revoked','Denied')$q$,'42501','Revoked session cannot insert');
select set_config('request.jwt.claim.sub','c0800000-0000-4000-8000-000000000002',true);
select set_config('request.jwt.claims','{"sub":"c0800000-0000-4000-8000-000000000002","role":"authenticated","session_id":"c0900000-0000-4000-8000-000000000002"}',true);
select public.save_playlist('{"id":"__coro_rls_ninos","title":"Temporary unpublished","mass_id":"ninos","sunday_date":"2099-01-04","status":"draft","sections":[{"id":"entrance","type":"entrance","items":[{"id":"item","songId":"__coro_rls_public","position":0}]}]}',2);
reset role;
set local role anon;
select set_config('request.jwt.claim.sub','',true);
select set_config('request.jwt.claims','{}',true);
select coro_live_check.ok(not exists(select 1 from public.songs where id like '__coro_rls_%'),'Unpublish immediately removes public song access');
select coro_live_check.ok(not exists(select 1 from public.playlist_items where playlist_id like '__coro_rls_%'),'Unpublish removes public item access');
reset role;
set constraints all immediate;
select count(*) as live_assertions_passed, 'ALL FIXTURES WILL BE ROLLED BACK' as persistence from coro_live_check.results;
rollback;
-- After rollback, verify separately that no c0800000-* auth users or __coro_rls_* songs exist.
