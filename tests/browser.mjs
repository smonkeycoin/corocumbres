/**
 * Local browser integration QA. Run against the isolated fixture server:
 * node --env-file=/private/tmp/coro-v2-e2e.env tests/browser.mjs
 * Uses signed offline NextAuth sessions; this does NOT verify Google's OAuth service.
 * Refuses non-local hosts and never reads production credentials.
 */
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { chromium } from 'playwright';
const require = createRequire(import.meta.url);
const { encode } = require('next-auth/jwt');

const baseURL = process.env.CORO_QA_URL || 'http://127.0.0.1:3100';
assert.ok(['127.0.0.1', 'localhost'].includes(new URL(baseURL).hostname), 'Browser fixture writes are restricted to localhost.');
const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
assert.ok(secret, 'Run with the isolated QA env file; AUTH_SECRET is required.');
const output = path.resolve(process.env.CORO_QA_OUTPUT || 'qa');
const screenshots = path.join(output, 'screenshots');
await mkdir(screenshots, { recursive: true });
const report = {
  baseURL,
  startedAt: new Date().toISOString(),
  authentication: 'Offline signed NextAuth fixture sessions with Google claims; no live Google OAuth login was performed.',
  scope: 'Isolated local QA data; no production data was changed.',
  tests: [], screenshots: [], pageErrors: [],
};
const browserPath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || [
  '/Users/smonkeycoin/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
  '/Users/smonkeycoin/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
].find(existsSync);
const browser = await chromium.launch({ headless: true, ...(browserPath ? { executablePath: browserPath } : {}) });
let admin;
let fixtureSetId;
let initial;
let songA;
let songB;
let published;
const contexts = [];

async function context(options = {}) {
  const value = await browser.newContext({ baseURL, viewport: { width: 1440, height: 1000 }, ...options });
  value.setDefaultTimeout(20000);
  value.setDefaultNavigationTimeout(60000);
  value.on('page', page => page.on('pageerror', error => report.pageErrors.push(error.message)));
  contexts.push(value);
  return value;
}
async function identity(context, claims) {
  const token = await encode({ secret, token: claims, maxAge: 3600 });
  await context.addCookies([{ name: 'next-auth.session-token', value: token, url: baseURL, httpOnly: true, secure: false, sameSite: 'Lax' }]);
}
async function step(name, run) {
  const start = Date.now();
  try {
    const details = await run();
    report.tests.push({ name, status: 'PASS', durationMs: Date.now() - start, ...(details ? { details } : {}) });
    console.log(`PASS ${name}`);
  } catch (error) {
    report.tests.push({ name, status: 'FAIL', durationMs: Date.now() - start, error: String(error.message || error) });
    console.error(`FAIL ${name}: ${String(error.message || error).slice(0, 800)}`);
    throw error;
  } finally { await writeFile(path.join(output, 'admin-browser.json'), JSON.stringify(report, null, 2)); }
}
async function capture(page, filename) {
  await page.screenshot({ path: path.join(screenshots, filename), fullPage: true, animations: 'disabled', style: 'nextjs-portal { display: none !important; }' });
  if (!report.screenshots.includes(filename)) report.screenshots.push(filename);
}
async function eventually(check, message, timeout = 15000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    if (await check()) return;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.fail(message);
}
async function workspace(context) {
  const response = await context.request.get('/api/admin/workspace');
  assert.equal(response.status(), 200, 'Authorized workspace read should succeed');
  return response.json();
}
async function publicPlaylist(context) {
  const response = await context.request.get('/api/public/masses/ninos');
  assert.equal(response.status(), 200);
  return (await response.json()).playlist;
}
async function writeViaUI(page, endpoint, click) {
  const awaited = page.waitForResponse(response => new URL(response.url()).pathname === endpoint && ['POST', 'PUT'].includes(response.request().method()), { timeout: 60000 });
  await click();
  const response = await awaited;
  assert.equal(response.status(), 200, `${endpoint} should save successfully: ${await response.text()}`);
  await eventually(async () => !(await page.locator('.admin-saving').count()), 'Saving indicator should settle');
  return response.json();
}
async function publishViaUI(page) {
  return writeViaUI(page, '/api/admin/publish', () => page.getByRole('button', { name: 'Guardar y publicar', exact: true }).click());
}
async function titles(page) { return page.locator('.admin-song-order .admin-song-label strong').allTextContents(); }
async function noOverflow(page, label) {
  const dimensions = await page.evaluate(() => ({ width: window.innerWidth, scroll: document.documentElement.scrollWidth }));
  assert.ok(dimensions.scroll <= dimensions.width + 1, `${label}: horizontal overflow ${dimensions.scroll} > ${dimensions.width}`);
}

try {
  const anonymous = await context({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const adminContext = await context();
  await identity(adminContext, { email: 'admin@coro.test', authProvider: 'google', googleVerified: true, googleSubject: 'qa-sub', name: 'Administrador QA' });
  admin = await adminContext.newPage();
  // Confirm intentional navigation-away dialogs only; test assertions never rely on dialogs.
  admin.on('dialog', dialog => dialog.accept());

  await step('B: anonymous cannot read or write the repertoire or directly enter admin', async () => {
    assert.equal((await anonymous.request.get('/api/admin/workspace')).status(), 401);
    assert.equal((await anonymous.request.put('/api/admin/workspace', { headers: { Origin: baseURL }, data: {} })).status(), 401);
    assert.equal((await anonymous.request.post('/api/admin/publish', { headers: { Origin: baseURL }, data: {} })).status(), 401);
    const page = await anonymous.newPage();
    await page.goto('/admin/repertorio');
    assert.match(new URL(page.url()).pathname, /^\/login$/);
    await page.goto('/presenter');
    assert.match(new URL(page.url()).pathname, /^\/login$/);
    await page.goto('/display');
    assert.match(new URL(page.url()).pathname, /^\/login$/);
    await page.close();
  });

  await step('C: signed Google identity outside allowlist is denied; client role claims cannot grant admin', async () => {
    const attempts = [
      { name: 'Google verified but not allowlisted', claims: { email: 'outsider@coro.test', authProvider: 'google', googleVerified: true, googleSubject: 'outsider' } },
      { name: 'Unverified Google with forged ADMIN role', claims: { email: 'admin@coro.test', authProvider: 'google', googleVerified: false, googleSubject: 'qa-sub', role: 'ADMIN' } },
      { name: 'Missing Google provenance with forged ADMIN role', claims: { email: 'admin@coro.test', role: 'ADMIN' } },
    ];
    for (const attempt of attempts) {
      const denied = await context();
      await identity(denied, attempt.claims);
      assert.equal((await denied.request.get('/api/admin/workspace')).status(), 403, attempt.name);
      assert.equal((await denied.request.post('/api/admin/publish', { headers: { Origin: baseURL }, data: {} })).status(), 403, attempt.name);
      const page = await denied.newPage();
      await page.goto('/admin/repertorio');
      assert.match(new URL(page.url()).pathname, /^\/login$/);
      await denied.close();
    }
    return { liveGoogleOAuth: 'NOT EXECUTED', authorizationWithSignedFixtures: 'PASS' };
  });

  await step('Authorized dashboard and server origin protection', async () => {
    initial = await workspace(adminContext);
    assert.ok(initial.state.songs.length >= 2, 'Historical repertoire must contain at least two songs');
    [songA, songB] = initial.state.songs.slice(0, 2);
    assert.equal((await adminContext.request.put('/api/admin/workspace', { headers: { Origin: 'https://untrusted.example' }, data: { state: initial.state, etag: initial.etag } })).status(), 403);
    await admin.goto('/admin');
    await admin.locator('.admin-mass-card').first().waitFor();
    assert.equal(await admin.locator('.admin-mass-card').count(), 4);
    await noOverflow(admin, 'admin desktop');
    await capture(admin, 'administracion.png');
    return { historicalSongs: initial.state.songs.length };
  });

  const initialPublic = await publicPlaylist(anonymous);
  await step('Admin creates a children mass playlist with two historical songs through UI and saves a private draft', async () => {
    await admin.goto('/admin/playlists?misa=ninos');
    await admin.getByRole('button', { name: 'Nueva playlist', exact: true }).waitFor();
    await admin.getByRole('button', { name: 'Nueva playlist', exact: true }).click();
    await admin.getByLabel('Nombre de la playlist', { exact: true }).fill('Misa de Niños · QA de publicación');
    await admin.getByLabel('Momento litúrgico', { exact: true }).selectOption('entrance');
    await admin.getByRole('button', { name: `Agregar ${songA.title}`, exact: true }).click();
    await admin.getByLabel('Momento litúrgico', { exact: true }).selectOption('communion');
    await admin.getByRole('button', { name: `Agregar ${songB.title}`, exact: true }).click();
    assert.deepEqual(await titles(admin), [songA.title, songB.title]);
    const result = await writeViaUI(admin, '/api/admin/workspace', () => admin.getByRole('button', { name: 'Guardar borrador', exact: true }).click());
    fixtureSetId = result.state.assignments.ninos;
    assert.ok(fixtureSetId);
    assert.deepEqual(await publicPlaylist(anonymous), initialPublic, 'Saving draft must not change public version');
  });

  await step('Admin reorders with accessible controls and drag-and-drop, then publishes', async () => {
    await admin.getByRole('button', { name: `Bajar ${songA.title}`, exact: true }).click();
    assert.deepEqual(await titles(admin), [songB.title, songA.title]);
    await admin.locator('.admin-song-order > li').first().dragTo(admin.locator('.admin-song-order > li').nth(1));
    await eventually(async () => JSON.stringify(await titles(admin)) === JSON.stringify([songA.title, songB.title]), 'Drag-and-drop should reorder both entries');
    await publishViaUI(admin);
    published = await publicPlaylist(anonymous);
    assert.deepEqual(published.items.map(item => item.title), [songA.title, songB.title]);
    assert.ok(published.items.every(item => typeof item.lyrics === 'string' && item.lyrics.length));
  });

  await step('D: an independent anonymous browser sees the same published playlist', async () => {
    const reader = await context({ viewport: { width: 1280, height: 950 } });
    const page = await reader.newPage();
    assert.equal((await reader.cookies()).length, 0);
    await page.goto('/');
    await page.locator('a.v2-mass-card[href="/misa/ninos"]').click();
    await page.locator('.v2-public-song-row').first().waitFor();
    assert.deepEqual(await page.locator('.v2-public-song-title').allTextContents(), [songA.title, songB.title]);
    assert.deepEqual(await publicPlaylist(reader), published);
    await noOverflow(page, 'public playlist desktop');
    await capture(page, 'playlist-publica.png');
    await reader.close();
  });

  await step('A: mobile anonymous home → children mass → lyrics → next → previous → playlist; font adjustment', async () => {
    const page = await anonymous.newPage();
    await page.goto('/');
    await page.locator('a.v2-mass-card[href="/misa/ninos"]').click();
    await page.locator('.v2-public-song-row').first().click();
    await page.locator('#letra').waitFor();
    assert.equal(await page.locator('h1').innerText(), songA.title);
    assert.equal(await page.locator('#letra').innerText(), published.items[0].lyrics);
    const oldSize = await page.locator('#letra').evaluate(element => parseFloat(getComputedStyle(element).fontSize));
    await page.getByRole('button', { name: 'Aumentar tamaño de letra', exact: true }).click();
    const newSize = await page.locator('#letra').evaluate(element => parseFloat(getComputedStyle(element).fontSize));
    assert.equal(newSize, oldSize + 2);
    await noOverflow(page, 'mobile lyrics');
    await capture(page, 'letra-mobile.png');
    await page.getByRole('link', { name: `Canción siguiente: ${songB.title}`, exact: true }).click();
    await page.getByRole('heading', { name: songB.title, exact: true }).waitFor();
    assert.equal(await page.locator('h1').innerText(), songB.title);
    await page.getByRole('link', { name: `Canción anterior: ${songA.title}`, exact: true }).click();
    await page.getByRole('heading', { name: songA.title, exact: true }).waitFor();
    assert.equal(await page.locator('h1').innerText(), songA.title);
    await page.getByRole('link', { name: 'Regresar a la playlist', exact: true }).click();
    await page.locator('.v2-public-song-row').first().waitFor();
    assert.equal(await page.locator('.v2-public-song-row').count(), 2);
    assert.equal(await page.getByRole('button', { name: /editar/i }).count(), 0);
    return { interactionsToFirstLyrics: 2, viewport: '390×844' };
  });

  await step('Removing a playlist item preserves repertoire; saved draft stays private until published', async () => {
    const before = await publicPlaylist(anonymous);
    const beforeCount = (await workspace(adminContext)).state.songs.length;
    await admin.getByRole('button', { name: `Quitar ${songB.title} de la playlist`, exact: true }).click();
    await writeViaUI(admin, '/api/admin/workspace', () => admin.getByRole('button', { name: 'Guardar borrador', exact: true }).click());
    assert.equal((await workspace(adminContext)).state.songs.length, beforeCount);
    assert.deepEqual(await publicPlaylist(anonymous), before);
    await publishViaUI(admin);
    assert.deepEqual((await publicPlaylist(anonymous)).items.map(item => item.title), [songA.title]);
    // Restore the second historical song for the reader/Presenter tests and final captures.
    if (!await admin.locator('.admin-song-picker').isVisible()) await admin.getByRole('button', { name: 'Agregar canción', exact: true }).click();
    await admin.getByRole('button', { name: `Agregar ${songB.title}`, exact: true }).click();
    await publishViaUI(admin);
    published = await publicPlaylist(anonymous);
    assert.equal(published.items.length, 2);
  });

  await step('Public API projects only published songs and unknown/unpublished lyric routes return 404', async () => {
    const publicJson = await publicPlaylist(anonymous);
    for (const item of publicJson.items) assert.deepEqual(Object.keys(item).sort(), ['id', 'lyrics', 'moment', 'songId', 'title']);
    const hidden = initial.state.songs.find(song => !publicJson.items.some(item => item.songId === song.id));
    assert.ok(hidden, 'Need an unpublished historical song for private boundary test');
    assert.equal((await anonymous.request.get(`/misa/ninos/cancion/${encodeURIComponent(hidden.id)}`)).status(), 404);
    assert.equal((await anonymous.request.get('/api/public/masses/no-existe')).status(), 404);
    assert.equal((await anonymous.request.get('/api/admin/workspace')).status(), 401);
  });

  await step('Repertoire creates and edits a QA-only song through UI; a new admin page reads saved changes', async () => {
    const title = `Canción QA ${Date.now()}`;
    await admin.goto('/admin/repertorio');
    await admin.getByRole('button', { name: 'Nueva canción', exact: true }).waitFor();
    await admin.getByRole('button', { name: 'Nueva canción', exact: true }).click();
    await admin.getByLabel('Título de la canción', { exact: true }).fill(title);
    await admin.getByLabel('Letra y acordes', { exact: true }).fill('[Verso 1]\n\nTexto de prueba exclusivo para QA local.');
    await writeViaUI(admin, '/api/admin/workspace', () => admin.getByRole('button', { name: 'Guardar', exact: true }).click());
    const saved = (await workspace(adminContext)).state.songs.find(song => song.title === title);
    assert.ok(saved, 'New QA song must persist in shared workspace');
    await admin.getByRole('button', { name: 'Editar', exact: true }).click();
    await admin.getByLabel('Título de la canción', { exact: true }).fill(`${title} editada`);
    await writeViaUI(admin, '/api/admin/workspace', () => admin.getByRole('button', { name: 'Guardar', exact: true }).click());
    const secondAdmin = await adminContext.newPage();
    await secondAdmin.goto('/admin/repertorio');
    await secondAdmin.getByLabel('Buscar en el repertorio', { exact: true }).fill(`${title} editada`);
    await eventually(async () => (await secondAdmin.locator('.admin-library-list li strong').allTextContents()).includes(`${title} editada`), 'Separate admin page should see saved edit');
    await secondAdmin.close();
    await admin.locator('.admin-library-list li > button').filter({ has: admin.getByText(songA.title, { exact: true }) }).click();
    await capture(admin, 'repertorio.png');
  });

  await step('Presenter and Display retain song navigation, live synchronization and blackout', async () => {
    await admin.goto(`/presenter?set=${encodeURIComponent(fixtureSetId)}`);
    await admin.locator('.presenter-list-panel button.row').first().waitFor();
    assert.equal(await admin.locator('.presenter-list-panel button.row').count(), 2);
    const display = await adminContext.newPage();
    await display.goto('/display');
    await display.locator('.presentation-text').waitFor();
    await eventually(async () => (await display.locator('.presentation-text').innerText()).includes(published.items[0].lyrics.split('\n')[0]), 'Display should show current song');
    await admin.getByRole('button', { name: 'Siguiente canción', exact: true }).click();
    await eventually(async () => (await display.locator('.presentation-text').innerText()).includes(published.items[1].lyrics.split('\n')[0]), 'Display should update from Presenter channel');
    await admin.getByRole('button', { name: 'BLACKOUT', exact: true }).click();
    await display.locator('[data-blackout="true"]').waitFor();
    await admin.getByRole('button', { name: 'BLACKOUT', exact: true }).click();
    await display.locator('.presentation-text').waitFor();
    await capture(admin, 'presenter.png');
    await capture(display, 'display.png');
    await display.close();
  });

  await step('Admin and repertoire layouts have no horizontal overflow on small iPhone, modern iPhone, Android, tablet and desktop', async () => {
    const viewports = [
      { width: 320, height: 568 }, { width: 390, height: 844 }, { width: 412, height: 915 }, { width: 768, height: 1024 }, { width: 1440, height: 1000 },
    ];
    for (const viewport of viewports) {
      await admin.setViewportSize(viewport);
      for (const route of ['/admin', '/admin/playlists?misa=ninos', '/admin/repertorio']) {
        await admin.goto(route);
        await admin.locator('.admin-page-title').waitFor();
        await noOverflow(admin, `${route} at ${viewport.width}`);
        if (viewport.width === 390) {
          const label = route === '/admin' ? 'administracion-mobile.png' : route.startsWith('/admin/playlists') ? 'playlist-admin-mobile.png' : 'repertorio-mobile.png';
          await capture(admin, label);
        }
      }
    }
    await admin.goto('/admin');
    await admin.locator('.admin-mass-card').first().waitFor();
    await capture(admin, 'administracion.png');
    await admin.goto('/admin/repertorio');
    await admin.locator('.admin-library-list li > button').first().waitFor();
    await capture(admin, 'repertorio.png');
  });

  await step('E: every historical song remains byte-for-byte equivalent to its initial structured content', async () => {
    const final = await workspace(adminContext);
    for (const original of initial.state.songs) {
      const current = final.state.songs.find(song => song.id === original.id);
      assert.deepEqual(current, original, `Historical song changed: ${original.id}`);
    }
    assert.ok(final.state.songs.length > initial.state.songs.length, 'Only a QA song should have been added');
    return { originalSongsVerified: initial.state.songs.length, finalSongs: final.state.songs.length };
  });
  await step('No uncaught browser JavaScript errors', async () => { assert.deepEqual(report.pageErrors, []); });
  report.status = 'PASS';
} catch (error) {
  report.status = 'FAIL';
  report.failure = String(error.message || error);
  if (admin && !admin.isClosed()) await capture(admin, 'failure-admin.png').catch(() => {});
  process.exitCode = 1;
} finally {
  report.completedAt = new Date().toISOString();
  await writeFile(path.join(output, 'admin-browser.json'), JSON.stringify(report, null, 2));
  await Promise.allSettled(contexts.map(value => value.close()));
  await browser.close();
  console.log(`QA report: ${path.join(output, 'admin-browser.json')}`);
}
