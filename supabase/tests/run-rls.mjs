/** Uses real PostgreSQL compiled to WASM; no network, credentials or remote database. */
import { readFile, readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
try {
  // Minimal stand-in for Supabase-managed Auth and gateway JWT-to-role mapping.
  // OAuth signature/expiry validation itself is an Auth/API integration concern.
  await db.exec(`
    create role anon; create role authenticated;
    create schema auth;
    create table auth.users (
      id uuid primary key, email text, email_confirmed_at timestamptz,
      banned_until timestamptz, raw_user_meta_data jsonb
    );
    create table auth.identities (
      id uuid primary key, user_id uuid references auth.users(id) on delete cascade,
      provider text, identity_data jsonb
    );
    create table auth.sessions (
      id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade,
      not_after timestamptz
    );
    create function auth.jwt() returns jsonb language sql stable as $$
      select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
    $$;
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    grant usage on schema auth to anon, authenticated;
    grant execute on function auth.uid(), auth.jwt() to anon, authenticated;
  `);
  const migrations = new URL('../migrations/', import.meta.url);
  for (const name of (await readdir(migrations)).filter(name => name.endsWith('.sql')).sort()) {
    await db.exec(await readFile(new URL(name, migrations), 'utf8'));
    console.log(`Applied ${name}`);
  }
  const results = await db.exec(await readFile(new URL('./rls.sql', import.meta.url), 'utf8'));
  for (const result of results) {
    if (result.rows[0]?.passed) console.log(`PASS: ${result.rows[0].passed} ${result.rows[0].suite}`);
  }
} catch (error) {
  console.error(`FAIL: ${error.message}`);
  process.exitCode = 1;
} finally {
  await db.close();
}
