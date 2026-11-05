import assert from 'node:assert/strict';

const base = process.env.CORO_TEST_URL || 'http://localhost:3028';
const origin = new URL(base).origin;
const outcomes = [];
async function check(name, run) { await run(); outcomes.push(name); }
async function request(path, options = {}) { return fetch(new URL(path, base), {redirect: 'manual', signal: AbortSignal.timeout(15000), ...options}); }

await check('portal público sin biblioteca ni contenido histórico', async () => {
  const response = await request('/');
  assert.equal(response.status, 200);
  const body = await response.text();
  for (const label of ['MISA DE NIÑOS', '10:00 AM', '12:00 PM', '1:30 PM', 'MISA NOCHE DOMINICAL']) assert.ok(body.includes(label));
  assert.ok(!body.includes('Desde ahora en adelante he comprendido'));
  assert.ok(!body.includes('coro-cumbres:songs'));
});
for (const path of ['/admin', '/presenter', '/display']) await check(`anónimo bloqueado: ${path}`, async () => {
  const response = await request(path);
  assert.ok([302,303,307,308].includes(response.status));
  const redirect = new URL(response.headers.get('location'), base);
  assert.equal(redirect.origin, origin);
  assert.equal(redirect.pathname, '/login');
});
for (const path of ['/auth/signin', '/auth/signout']) for (const suppliedOrigin of [undefined, 'https://foreign.invalid']) {
  await check(`POST rechazado: ${path} (${suppliedOrigin ? 'origen ajeno' : 'sin origen'})`, async () => {
    const response = await request(path, {method: 'POST', headers: suppliedOrigin ? {Origin: suppliedOrigin} : {}});
    assert.equal(response.status, 403);
  });
}
await check('callback inválido no redirige fuera del sitio', async () => {
  const response = await request('/auth/callback?next=https://foreign.invalid');
  assert.ok([302,303,307].includes(response.status));
  assert.equal(new URL(response.headers.get('location'), base).origin, origin);
});
for (const path of ['/src/lib/seed-songs.ts', '/.env.local', '/api/admin/workspace']) await check(`archivo/datos no expuestos: ${path}`, async () => {
  assert.ok([401,403,404,503].includes((await request(path)).status));
});
await check('evangelio separado de autenticación y playlists', async () => {
  const response = await request('/api/gospel');
  assert.equal(response.status,200);
  assert.match(response.headers.get('cache-control') || '', /no-store/);
  const value = await response.json();
  assert.match(value.date, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(value.title === null || typeof value.title === 'string');
});
console.log(JSON.stringify({base, passed: outcomes.length, outcomes, limitation: 'HTTP anónimo. No sustituye OAuth Google ni escrituras y RLS en Supabase remoto.'}, null, 2));
