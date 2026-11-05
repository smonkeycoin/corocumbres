/** Live bootstrap RLS checks. Uses only a public key; never creates test records. */
import assert from 'node:assert/strict';

const args = process.argv.slice(2);
const position = args.indexOf('--project-ref');
const ref = position >= 0 ? args[position + 1] : null;
const checkDenials = args.includes('--check-denials');
const expectPrivateLibrary = args.includes('--expect-private-library');

try {
  assert.match(ref ?? '', /^[a-z0-9]+$/, 'An explicit project ref is required');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  assert.equal(url, `https://${ref}.supabase.co`, 'Project URL must exactly match the explicit project ref');
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  assert.ok(key && (key.startsWith('sb_publishable_') || (() => {
    try { return JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString('utf8')).role === 'anon'; }
    catch { return false; }
  })()), 'Only a publishable or anon key is accepted');

  async function request(path, options = {}) {
    const response = await fetch(`${url}/rest/v1/${path}`, {
      ...options,
      headers: { apikey: key, ...(key.startsWith('sb_publishable_') ? {} : { Authorization: `Bearer ${key}` }),
        'Content-Type': 'application/json', ...options.headers },
      cache: 'no-store', signal: AbortSignal.timeout(20_000),
    });
    const body = await response.json().catch(() => null);
    return { status: response.status, ok: response.ok, body };
  }

  const [masses, songs, playlists, drafts, items, admin, privateSchema] = await Promise.all([
    request('masses?select=id,time&order=sort_order'),
    request('songs?select=id&limit=1'),
    request('playlists?select=id,status&limit=1'),
    request('playlists?select=id&status=eq.draft&limit=1'),
    request('playlist_items?select=id&limit=1'),
    request('rpc/is_admin', { method: 'POST', body: '{}' }),
    request('admin_memberships?select=user_id&limit=1', { headers: { 'Accept-Profile': 'private' } }),
  ]);
  for (const [label, result] of Object.entries({ masses, songs, playlists, drafts, items, admin })) {
    assert.ok(result.ok, `${label}: HTTP ${result.status}`);
  }
  assert.equal(masses.body.length, 4, 'Exactly four public masses');
  assert.equal(masses.body.find(mass => mass.id === 'noche')?.time, null, 'No invented night mass time');
  assert.equal(admin.body, false, 'Anonymous has no administrator privileges');
  assert.deepEqual(drafts.body, [], 'Draft playlists must be invisible');
  assert.ok([401, 403, 404, 406].includes(privateSchema.status), 'Private membership schema must not be publicly readable');
  if (expectPrivateLibrary) {
    assert.deepEqual(playlists.body, [], 'Bootstrap has no publications');
    assert.deepEqual(songs.body, [], 'Full private library is hidden through direct REST');
    assert.deepEqual(items.body, [], 'Private playlist items are hidden');
  }
  let denials = 0;
  if (checkDenials) {
    // Primary keys are NOT NULL: these predicates cannot ever match a real row.
    // They verify write permission denial without risking a persisted test mutation.
    for (const [table, body] of [['songs', { title: 'RLS permission probe' }], ['playlists', { status: 'published' }]]) {
      const response = await request(`${table}?id=is.null`, { method: 'PATCH', body: JSON.stringify(body) });
      assert.ok([401, 403].includes(response.status), `${table}: anonymous PATCH must be denied, got HTTP ${response.status}`);
      denials++;
    }
  }
  console.log(JSON.stringify({ projectRef: ref, result: 'PASS', publicMasses: masses.body.length,
    privateLibraryHidden: expectPrivateLibrary, anonymousWriteDenials: denials, persistentTestRecords: 0 }));
} catch (error) {
  console.error(error instanceof assert.AssertionError ? `FAIL: ${error.message.split('\n')[0]}` : 'FAIL: Live REST verification could not complete; credentials and transport details are withheld.');
  process.exitCode = 1;
}
