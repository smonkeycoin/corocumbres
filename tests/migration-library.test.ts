import test from "node:test";
import assert from "node:assert/strict";
import { fromRow, planLibraryMigration, readSnapshot, sameStoredSong, toRow, validateMigrationKeys, validateProjectUrl } from "../scripts/migration-library-helpers";
import type { Song } from "../src/lib/types";

const song: Song = { id: "canto", title: "Canto", category: "Entrada", source: "LYRICS/archivo.pdf", notes: "Original", tags: ["coro"], createdAt: "2026-11-01T00:00:00.000Z", updatedAt: "2026-11-02T00:00:00.000Z", sections: [{ id: "verso", type: "verse", label: "Verso", slides: [["Letra"]], lines: [{ id: "line", lyrics: "Letra", chords: [{ symbol: "C", position: 0 }] }] }] };

test("bootstrap refuses any URL that does not exactly match the explicit project", () => {
  assert.equal(validateProjectUrl("https://correct.supabase.co", "correct"), "https://correct.supabase.co");
  for (const url of [undefined, "https://other.supabase.co", "http://correct.supabase.co", "https://correct.supabase.co.evil.test", "https://correct.supabase.co/path", "https://user:secret@correct.supabase.co"]) assert.throws(() => validateProjectUrl(url, "correct"));
});

test("seed + identical Blob backup insert once and reruns insert nothing", () => {
  const first = planLibraryMigration([[song], [{ ...song }]], []);
  assert.equal(first.inserts.length, 1);
  assert.equal(first.duplicates, 1);
  assert.deepEqual(first.inserts[0], song);
  assert.equal(planLibraryMigration([[song]], first.inserts).inserts.length, 0);
});

test("bootstrap rejects privileged public keys and unprivileged bootstrap credentials", () => {
  const fakeJwt = (role: string) => `header.${Buffer.from(JSON.stringify({ role })).toString("base64url")}.test`;
  assert.doesNotThrow(() => validateMigrationKeys(fakeJwt("anon"), fakeJwt("service_role")));
  assert.doesNotThrow(() => validateMigrationKeys("sb_publishable_test", "sb_secret_test"));
  assert.throws(() => validateMigrationKeys(fakeJwt("service_role"), "sb_secret_test"));
  assert.throws(() => validateMigrationKeys("sb_publishable_test", fakeJwt("anon")));
  assert.throws(() => validateMigrationKeys(undefined, "sb_secret_test"));
});

test("conflicting content preserves both versions with stable identifiers and per-source mapping", () => {
  const variant = { ...song, notes: "Cambio del administrador" };
  const plan = planLibraryMigration([[song], [variant]], []);
  assert.equal(plan.inserts.length, 2);
  assert.equal(plan.variants, 1);
  assert.equal(plan.inserts[0].id, song.id);
  assert.match(plan.inserts[1].id, /^canto-import-[a-f0-9]{24}$/);
  assert.notEqual(plan.mappings[0].to, plan.mappings[1].to);
  assert.equal(planLibraryMigration([[variant]], plan.inserts).inserts.length, 0);
  const changedRemote = [{ ...plan.inserts[1], notes: "Edición posterior" }, song];
  const retry = planLibraryMigration([[variant]], changedRemote);
  assert.equal(retry.inserts.length, 1);
  assert.equal(retry.inserts[0].id, `${plan.inserts[1].id}-1`);
});

test("readback verifies lyrics, chords, metadata, references and timestamps with equivalent timezones", () => {
  const stored = fromRow({ ...toRow(song), created_at: "2026-10-31T19:00:00-05:00", updated_at: "2026-11-02T00:00:00+00:00" });
  assert.equal(sameStoredSong(song, stored), true);
  for (const patch of [{ notes: "Changed" }, { source: "other.pdf" }, { category: "Otro" }, { updatedAt: song.createdAt }, { sections: [] }]) assert.equal(sameStoredSong(song, { ...stored, ...patch }), false);
});

test("snapshot parser reports playlists and publication references without dropping them", () => {
  const parsed = readSnapshot({ state: { songs: [song], sets: [{ id: "set" }], assignments: { ninos: "set" }, published: { ninos: null } } });
  assert.equal(parsed.sets, 1);
  assert.equal(parsed.publications, 1);
  assert.throws(() => readSnapshot({ songs: [song], sets: "invalid" }));
});
