import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Session } from "next-auth";
import { seedSongs } from "../src/lib/seed-songs";
import type { CoroSet, Song } from "../src/lib/types";
import { authOptions, getAdminSession, getAuthConfigurationStatus, isAllowedAdminEmail, requireAdmin } from "../src/lib/server/auth";
import { assertSameOrigin, errorResponse, HttpError, readJsonBody } from "../src/lib/server/http";
import { importRequestSchema, validateWorkspace } from "../src/lib/server/schema";
import { buildPublicSnapshot, getStorageConfigurationStatus, getStorageNamespace, importWorkspace, initialWorkspace, mergeImportedWorkspace, publishPlaylist, readPublicPlaylist, readPublishedShare, readWorkspace, saveWorkspace } from "../src/lib/server/workspace";
import { GET as getPublicMass } from "../src/app/api/public/masses/[massId]/route";

// Run with: node --conditions=react-server --import tsx --test tests/backend.test.ts
// The explicit filesystem adapter exercises the same business operations with
// actual persisted bytes. It does not claim to validate a remote Blob service or Google OAuth.
const envKeys = ["NODE_ENV", "CORO_DATA_FILE", "CORO_BLOB_TEST_PREFIX", "BLOB_STORE_ID", "BLOB_READ_WRITE_TOKEN", "AUTH_GOOGLE_ID", "AUTH_GOOGLE_SECRET", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "AUTH_SECRET", "NEXTAUTH_SECRET", "NEXTAUTH_URL", "CORO_ADMIN_EMAILS"];
const originalEnvironment = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));
let testDirectory: string;

function setEnv(key: string, value: string | undefined) {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}

beforeEach(async () => {
  for (const key of envKeys) delete process.env[key];
  testDirectory = await mkdtemp(join(tmpdir(), "coro-backend-test-"));
  setEnv("NODE_ENV", "test");
  setEnv("CORO_DATA_FILE", join(testDirectory, "workspace.json"));
  setEnv("AUTH_GOOGLE_ID", "test-google-id");
  setEnv("AUTH_GOOGLE_SECRET", "test-google-secret");
  setEnv("AUTH_SECRET", "test-only-session-secret-never-deployed");
  setEnv("NEXTAUTH_URL", "http://localhost:3000");
  setEnv("CORO_ADMIN_EMAILS", "admin@example.test");
});

afterEach(async () => {
  for (const key of envKeys) setEnv(key, originalEnvironment[key]);
  // Remove only disposable fixtures created by this test suite.
  await rm(testDirectory, { recursive: true, force: true });
});

function song(id = "fixture-song"): Song {
  return {
    id, title: "Canto de prueba", category: "Prueba", tags: ["privado"],
    source: "private-metadata-source", notes: "private-metadata-notes",
    createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z",
    sections: [{ id: "fixture-section", type: "verse", label: "Verso", slides: [["Respaldo de letra"]], lines: [{ id: "fixture-line", lyrics: "Una letra íntegra", chords: [{ symbol: "D/F#", position: 4 }] }] }],
  };
}

function playlist(songId: string, id = "fixture-set"): CoroSet {
  return {
    id, name: "Playlist de prueba", type: "mass", isArchived: false, shareId: `${id}-share`,
    createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z",
    sections: [{ id: `${id}-section`, type: "entrance", label: "Entrada", position: 0, isEnabled: true, items: [{ id: `${id}-item`, songId, position: 0, note: "private-metadata-item" }] }],
  };
}

function hasCode(code: string) {
  return (error: unknown) => error instanceof HttpError && error.code === code;
}

test("historical seed is preserved byte-for-byte in initialized workspace and remains private", () => {
  const original = JSON.stringify(seedSongs);
  const state = initialWorkspace();
  assert.equal(state.songs.length, 26);
  assert.equal(JSON.stringify(state.songs), original);
  assert.deepEqual(state.sets, []);
  assert.deepEqual(Object.values(state.published), [null, null, null, null]);
  assert.deepEqual(Object.values(state.assignments), [null, null, null, null]);
  state.songs[0].title = "Changed copy";
  assert.equal(JSON.stringify(seedSongs), original);
});

test("public projection excludes unrelated/disabled songs, metadata and chords while preserving order and lyrics", () => {
  const first = song("one");
  const second = { ...song("two"), sections: [{ id: "slides", type: "verse" as const, label: "Verso", slides: [["Línea uno", "Línea dos"], ["Otro párrafo"]] }] };
  const hidden = song("hidden");
  const set = playlist(first.id);
  set.sections = [
    { id: "second", type: "communion", label: "Comunión", position: 2, items: [{ id: "second-item", songId: second.id, position: 0 }] },
    { id: "hidden", type: "free", label: "Oculta", position: 0, isEnabled: false, items: [{ id: "hidden-item", songId: hidden.id, position: 0 }] },
    { id: "first", type: "entrance", label: "Entrada", position: 1, items: [{ id: "first-item", songId: first.id, position: 0 }] },
  ];
  const state = { ...initialWorkspace(), songs: [first, second, hidden], sets: [set] };
  const snapshot = buildPublicSnapshot(state, "ninos", set.id);
  assert.deepEqual(snapshot.items.map((item) => item.songId), ["one", "two"]);
  assert.deepEqual(Object.keys(snapshot.items[0]).sort(), ["id", "lyrics", "moment", "songId", "title"]);
  assert.equal(snapshot.items[0].lyrics, "Una letra íntegra");
  assert.equal(snapshot.items[1].lyrics, "Línea uno\nLínea dos\n\nOtro párrafo");
  assert.equal(snapshot.items[0].moment, "Entrada");
  assert.equal(JSON.stringify(snapshot).includes("private-metadata"), false);
  assert.equal(JSON.stringify(snapshot).includes("D/F#"), false);
});

test("import preserves conflicts, chords/slides and remaps playlist references; re-import is idempotent", () => {
  const existing = song();
  const set = playlist(existing.id);
  const state = { ...initialWorkspace(), songs: [existing], sets: [set] };
  const variant = structuredClone(existing);
  variant.sections[0].lines![0].lyrics = "Versión local que no debe perderse";
  const imported = mergeImportedWorkspace(state, [variant], [set]);
  assert.equal(imported.state.songs.length, 2);
  assert.equal(imported.state.sets.length, 2);
  assert.deepEqual(imported.state.songs[0], existing);
  assert.deepEqual(imported.state.sets[0], set);
  const retained = imported.state.songs[1];
  assert.notEqual(retained.id, variant.id);
  assert.deepEqual(retained.sections, variant.sections);
  assert.equal(imported.state.sets[1].sections[0].items[0].songId, retained.id);
  assert.equal(imported.summary.songConflicts, 1);
  const again = mergeImportedWorkspace(imported.state, [variant], [set]);
  assert.deepEqual(again.state, imported.state);
  assert.equal(again.summary.addedSongs, 0);
  assert.equal(again.summary.addedSets, 0);
});

test("an edited imported variant and subsequent re-import retain all versions with valid references", () => {
  const original = song();
  const local = { ...original, title: "Local version" };
  const first = mergeImportedWorkspace({ ...initialWorkspace(), songs: [original] }, [local], [playlist(local.id)]);
  first.state.songs[1].title = "Edited imported version";
  const next = mergeImportedWorkspace(first.state, [local], [playlist(local.id)]);
  assert.equal(next.state.songs.length, 3);
  assert.equal(next.state.songs[1].title, "Edited imported version");
  assert.equal(next.state.songs[2].title, "Local version");
  assert.equal(next.state.sets[1].sections[0].items[0].songId, next.state.songs[2].id);
  validateWorkspace(next.state);
});

test("invalid nested metadata, duplicated IDs and unresolved references are rejected instead of dropped", () => {
  const fixture = song();
  const invalid = structuredClone(fixture);
  invalid.sections[0].lines![0].chords[0].position = -1;
  assert.throws(() => importRequestSchema.parse({ songs: [invalid], sets: [], etag: "missing" }));
  assert.throws(() => validateWorkspace({ ...initialWorkspace(), songs: [fixture, fixture] }), hasCode("DUPLICATE_ID"));
  assert.throws(() => validateWorkspace({ ...initialWorkspace(), sets: [playlist("nonexistent")] }), hasCode("MISSING_SONG"));
  assert.throws(() => importRequestSchema.parse({ songs: [{ ...fixture, unknownImportantMetadata: "preserve by rejecting" }], sets: [], etag: "missing" }));
  const set = playlist(fixture.id);
  set.sections[0].items.push({ ...set.sections[0].items[0] });
  assert.throws(() => validateWorkspace({ ...initialWorkspace(), songs: [fixture], sets: [set] }), hasCode("DUPLICATE_ID"));
});

test("first-write races have exactly one winner and retain a backup of the original data", async () => {
  const initial = await readWorkspace();
  const left = playlist(initial.state.songs[0].id, "left");
  const right = playlist(initial.state.songs[0].id, "right");
  const results = await Promise.allSettled([
    saveWorkspace({ sets: [left] }, initial.etag, "admin@example.test"),
    saveWorkspace({ sets: [right] }, initial.etag, "admin@example.test"),
  ]);
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  const failed = results.find((result) => result.status === "rejected");
  assert.ok(failed && failed.status === "rejected" && hasCode("REVISION_CONFLICT")(failed.reason));
  const current = await readWorkspace();
  assert.equal(current.state.revision, 1);
  assert.equal(current.state.sets.length, 1);
  assert.deepEqual(current.state.songs, initial.state.songs);
  const files = await readdir(`${process.env.CORO_DATA_FILE}.history`);
  assert.equal(files.length, 1);
  const backup = JSON.parse(await readFile(join(`${process.env.CORO_DATA_FILE}.history`, files[0]), "utf8"));
  assert.deepEqual(backup.state, initial.state);
});

test("stale save/publish/import cannot overwrite a committed revision", async () => {
  const before = await readWorkspace();
  const set = playlist(before.state.songs[0].id);
  const saved = await saveWorkspace({ sets: [set] }, before.etag, "admin@example.test");
  await assert.rejects(saveWorkspace({ sets: [] }, before.etag, "admin@example.test"), hasCode("REVISION_CONFLICT"));
  await assert.rejects(publishPlaylist("ninos", set.id, before.etag, "admin@example.test"), hasCode("REVISION_CONFLICT"));
  await assert.rejects(importWorkspace([song()], [], before.etag, "admin@example.test"), hasCode("REVISION_CONFLICT"));
  assert.deepEqual(await readWorkspace(), saved);
});

test("published snapshot is immutable across draft edits and reads from another request; explicit empty publication withdraws songs", async () => {
  const before = await readWorkspace();
  const fixture = song();
  const set = playlist(fixture.id);
  const saved = await saveWorkspace({ songs: [...before.state.songs, fixture], sets: [set] }, before.etag, "admin@example.test");
  assert.equal(await readPublicPlaylist("ninos"), null);
  const published = await publishPlaylist("ninos", set.id, saved.etag, "admin@example.test");
  const response = await getPublicMass(new Request("http://localhost:3000/api/public/masses/ninos"), { params: Promise.resolve({ massId: "ninos" }) });
  assert.equal(response.status, 200);
  const publicData = await response.json();
  assert.deepEqual(Object.keys(publicData), ["playlist"]);
  assert.deepEqual(publicData.playlist, published.state.published.ninos);
  assert.equal(publicData.playlist.items.length, 1);
  assert.equal(JSON.stringify(publicData).includes("private-metadata"), false);
  const changed = structuredClone(published.state);
  changed.songs.find((candidate) => candidate.id === fixture.id)!.sections[0].lines![0].lyrics = "Letra editada en borrador";
  changed.sets[0].sections[0].items = [];
  // A forged client-side publication is ignored, even for an authenticated admin.
  changed.published.ninos!.items[0].lyrics = "FORGED SNAPSHOT";
  const draft = await saveWorkspace(changed, published.etag, "admin@example.test");
  assert.deepEqual(await readPublicPlaylist("ninos"), published.state.published.ninos);
  const empty = await publishPlaylist("ninos", set.id, draft.etag, "admin@example.test");
  assert.deepEqual(empty.state.published.ninos!.items, []);
  assert.deepEqual((await readPublicPlaylist("ninos"))!.items, []);
});

test("legacy shares follow published provenance, never a newly assigned draft", async () => {
  const initial = await readWorkspace();
  const a = playlist(initial.state.songs[0].id, "set-a");
  const b = playlist(initial.state.songs[1].id, "set-b");
  const saved = await saveWorkspace({ sets: [a, b] }, initial.etag, "admin@example.test");
  const published = await publishPlaylist("ninos", a.id, saved.etag, "admin@example.test");
  await saveWorkspace({ assignments: { ...published.state.assignments, ninos: b.id } }, published.etag, "admin@example.test");
  assert.deepEqual(await readPublishedShare(a.shareId!), published.state.published.ninos);
  assert.equal(await readPublishedShare(b.shareId!), null);
});

test("destructive omission is rejected and import preserves all historical songs and sets", async () => {
  const initial = await readWorkspace();
  const set = playlist(initial.state.songs[0].id);
  const saved = await saveWorkspace({ sets: [set] }, initial.etag, "admin@example.test");
  await assert.rejects(saveWorkspace({ songs: [] }, saved.etag, "admin@example.test"), hasCode("DESTRUCTIVE_UPDATE"));
  await assert.rejects(saveWorkspace({ sets: [] }, saved.etag, "admin@example.test"), hasCode("DESTRUCTIVE_UPDATE"));
  const imported = await importWorkspace([song()], [playlist("fixture-song", "imported-set")], saved.etag, "admin@example.test");
  for (const original of initial.state.songs) assert.deepEqual(imported.state.songs.find((item) => item.id === original.id), original);
  assert.deepEqual(imported.state.sets.find((item) => item.id === set.id), set);
});

test("corrupt persisted data blocks writes instead of silently resetting the library", async () => {
  const path = process.env.CORO_DATA_FILE!;
  const malformed = "{broken historical JSON";
  await writeFile(path, malformed);
  await assert.rejects(readWorkspace(), hasCode("STORAGE_INVALID_DATA"));
  await assert.rejects(saveWorkspace({ songs: [] }, "missing", "admin@example.test"), hasCode("STORAGE_INVALID_DATA"));
  assert.equal(await readFile(path, "utf8"), malformed);
});

test("production refuses the local adapter and never pretends to have shared storage", async () => {
  setEnv("NODE_ENV", "production");
  assert.deepEqual(getStorageConfigurationStatus(), { ready: false, mode: "private-blob" });
  await assert.rejects(readWorkspace(), hasCode("STORAGE_NOT_CONFIGURED"));
});

test("isolated Blob namespace is validated and categorically ignored in production", () => {
  setEnv("CORO_BLOB_TEST_PREFIX", "qa/coro-test-123");
  assert.equal(getStorageNamespace(), "qa/coro-test-123");
  setEnv("CORO_BLOB_TEST_PREFIX", "qa/../../coro-v2");
  assert.throws(() => getStorageNamespace(), hasCode("INVALID_TEST_NAMESPACE"));
  setEnv("NODE_ENV", "production");
  assert.equal(getStorageNamespace(), "coro-v2");
});

type Callbacks = NonNullable<typeof authOptions.callbacks>;
const signIn = authOptions.callbacks!.signIn!;
const jwt = authOptions.callbacks!.jwt!;
const sessionCallback = authOptions.callbacks!.session!;

test("Google callback requires verified email, correct provider, exact allowlist and complete config", async () => {
  const parameters = (email: string, verified: boolean, provider = "google") => ({
    user: { id: "google-sub", email },
    account: { provider, providerAccountId: "google-sub", type: "oauth" },
    profile: { sub: "google-sub", email, email_verified: verified },
  }) as Parameters<NonNullable<Callbacks["signIn"]>>[0];
  assert.equal(await signIn(parameters("ADMIN@example.test", true)), true);
  assert.equal(await signIn(parameters("stranger@example.test", true)), false);
  assert.equal(await signIn(parameters("admin@example.test", false)), false);
  assert.equal(await signIn(parameters("admin@example.test", true, "credentials")), false);
  assert.equal(isAllowedAdminEmail("admin@example.test.attacker.invalid"), false);
  assert.equal(isAllowedAdminEmail("attacker+admin@example.test"), false);
  setEnv("CORO_ADMIN_EMAILS", "");
  assert.equal(await signIn(parameters("admin@example.test", true)), false);
  assert.equal(getAuthConfigurationStatus().ready, false);
  assert.equal(await getAdminSession(), null);
  await assert.rejects(requireAdmin(), hasCode("AUTH_NOT_CONFIGURED"));
});

test("signed session privileges are re-evaluated after allowlist revocation; forged client updates do not promote users", async () => {
  const verifiedToken = { email: "admin@example.test", authProvider: "google", googleVerified: true, googleSubject: "google-sub" };
  const sessionArgs = (token: object) => ({ session: { user: { email: "untrusted@example.test" }, expires: "2026-12-01T00:00:00.000Z" }, token }) as Parameters<NonNullable<Callbacks["session"]>>[0];
  const sessionRole = async (token: object) => ((await sessionCallback(sessionArgs(token))) as Session).user.role;
  assert.equal(await sessionRole(verifiedToken), "ADMIN");
  assert.equal(await sessionRole({ ...verifiedToken, authProvider: "credentials" }), "PUBLIC");
  assert.equal(await sessionRole({ ...verifiedToken, googleVerified: false }), "PUBLIC");
  assert.equal(await sessionRole({ ...verifiedToken, googleSubject: undefined }), "PUBLIC");
  setEnv("CORO_ADMIN_EMAILS", "someone-else@example.test");
  assert.equal(await sessionRole(verifiedToken), "PUBLIC");
  const publicToken = { email: "stranger@example.test", authProvider: "google", googleVerified: true, googleSubject: "stranger-sub" };
  const result = await jwt({ token: publicToken, user: { id: "stranger-sub", email: "stranger@example.test" }, account: null, trigger: "update", session: { user: { email: "someone-else@example.test", role: "ADMIN", googleVerified: true } } });
  assert.deepEqual(result, publicToken);
  assert.equal(await sessionRole(result), "PUBLIC");
});

test("authentication redirect cannot redirect to another origin or protocol-relative URL", async () => {
  const redirect = authOptions.callbacks!.redirect!;
  const baseUrl = "https://corocumbres.online";
  assert.equal(await redirect({ url: "/admin", baseUrl }), `${baseUrl}/admin`);
  assert.equal(await redirect({ url: "//attacker.invalid", baseUrl }), `${baseUrl}/admin`);
  assert.equal(await redirect({ url: "https://corocumbres.online.attacker.invalid", baseUrl }), `${baseUrl}/admin`);
  assert.equal(await redirect({ url: "javascript:alert(1)", baseUrl }), `${baseUrl}/admin`);
});

test("write guard rejects cross-origin, missing-origin and non-JSON requests", () => {
  const request = (headers: Record<string, string>) => new Request("http://localhost:3000/api/admin/workspace", { method: "PUT", headers });
  assert.doesNotThrow(() => assertSameOrigin(request({ origin: "http://localhost:3000", "content-type": "application/json" })));
  assert.throws(() => assertSameOrigin(request({ origin: "https://attacker.invalid", "content-type": "application/json" })), hasCode("INVALID_ORIGIN"));
  assert.throws(() => assertSameOrigin(request({ "content-type": "application/json" })), hasCode("INVALID_ORIGIN"));
  assert.throws(() => assertSameOrigin(request({ origin: "http://localhost:3000", "content-type": "text/plain" })), hasCode("INVALID_CONTENT_TYPE"));
  assert.throws(() => assertSameOrigin(request({ origin: "http://localhost:3000", "content-type": "application/json", "sec-fetch-site": "cross-site" })), hasCode("INVALID_ORIGIN"));
});

test("body limit measures actual UTF-8 bytes even when Content-Length lies", async () => {
  const body = JSON.stringify({ text: "á".repeat(100) });
  const request = new Request("http://localhost:3000/api/admin/import", { method: "POST", body, headers: { "content-type": "application/json", "content-length": "1" } });
  await assert.rejects(readJsonBody(request, 150), hasCode("BODY_TOO_LARGE"));
  assert.deepEqual(await readJsonBody(new Request("http://localhost:3000", { method: "POST", body: '{"ok":true}' })), { ok: true });
});

test("public API rejects arbitrary identifiers and returns no private data or cacheable response", async () => {
  const response = await getPublicMass(new Request("http://localhost:3000/api/public/masses/library"), { params: Promise.resolve({ massId: "library" }) });
  assert.equal(response.status, 404);
  assert.match(response.headers.get("cache-control")!, /no-store/);
  const data = await response.json();
  assert.equal(data.code, "MASS_NOT_FOUND");
  assert.equal("songs" in data, false);
  const error = errorResponse(new HttpError(403, "Denied", "FORBIDDEN"));
  assert.equal(error.status, 403);
  assert.deepEqual(await error.json(), { error: "Denied", code: "FORBIDDEN" });
});
