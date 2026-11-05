import test from "node:test";
import assert from "node:assert/strict";
import { isSong, normalizedTitle, songContentSignature, validateSongImport, validatePlaylist } from "../src/lib/cloud-validation";
import type { Song, CoroSet } from "../src/lib/types";

const song: Song = { id: "existing-id", title: "Canción", tags: ["Entrada"], source: "/archivo.pdf", notes: "Conservar", createdAt: "2026-11-01T00:00:00Z", updatedAt: "2026-11-01T00:00:00Z", sections: [{ id: "verse-1", type: "verse", label: "Verso", slides: [["Letra"]], lines: [{ id: "line-1", lyrics: "Letra", chords: [{ symbol: "C", position: 0 }] }] }] };

test("import preserves source, lyrics, chords, categories and existing identifiers without transformation", () => {
  const value = JSON.parse(JSON.stringify([{ ...song, category: "Comunión" }]));
  validateSongImport(value);
  assert.deepEqual(value, [{ ...song, category: "Comunión" }]);
  assert.equal(normalizedTitle("  CANCIÓN! "), normalizedTitle(song.title));
});

test("invalid nested data and duplicate ids reject the complete import", () => {
  assert.equal(isSong({ ...song, sections: [{ id: "s", type: "verse", label: "", slides: [42] }] }), false);
  assert.equal(isSong({ ...song, createdAt: "broken" }), false);
  assert.throws(() => validateSongImport([song, song]), /identificadores repetidos/);
  assert.throws(() => validateSongImport([song, { id: "broken" }]), /incompletas/);
});

test("import deduplication ignores timestamp formatting but preserves different lyrics and notes", () => {
  assert.equal(songContentSignature(song), songContentSignature({ ...song, id: "other", updatedAt: "2026-12-01T00:00:00+00:00", liturgicalMoments: [] }));
  assert.notEqual(songContentSignature(song), songContentSignature({ ...song, notes: "Cambio local" }));
  assert.notEqual(songContentSignature(song), songContentSignature({ ...song, source: "/otra-partitura.pdf" }));
});

test("publication requires its own mass and a valid Sunday", () => {
  const set: CoroSet = { id: "set", name: "Domingo", type: "sunday_mass", sections: [], createdAt: song.createdAt, updatedAt: song.updatedAt, isArchived: false, status: "published" };
  assert.throws(() => validatePlaylist(set), /misa y el domingo/);
  assert.throws(() => validatePlaylist({ ...set, massId: "ninos", date: "2026-11-02" }), /dominical/);
  assert.throws(() => validatePlaylist({ ...set, massId: "ninos", date: "2026-02-30" }), /dominical/);
  assert.doesNotThrow(() => validatePlaylist({ ...set, massId: "ninos", date: "2026-11-08" }));
});
