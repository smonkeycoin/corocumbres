import test from "node:test";
import assert from "node:assert/strict";
import { prepareLegacyImport } from "../src/lib/legacy-import";
import { reorderPlaylistSections } from "../src/lib/playlist-editing";
import type { CoroSet, Song } from "../src/lib/types";

const timestamp = "2026-01-01T00:00:00.000Z";
function song(id: string, lyrics: string): Song {
  return { id, title: id, tags: ["histórica"], notes: "Conservar notas", sections: [{ id: `${id}-verse`, type: "verse", label: "Verso", slides: [[lyrics]], lines: [{ id: `${id}-line`, lyrics, chords: [{ symbol: "C", position: 0 }] }] }], createdAt: timestamp, updatedAt: timestamp };
}
function set(id: string, songId: string): CoroSet {
  return { id, name: id, type: "playlist", createdAt: timestamp, updatedAt: timestamp, isArchived: false, sections: [{ id: `${id}-section`, type: "entrance", label: "ENTRADA", position: 0, isEnabled: true, items: [{ id: `${id}-item`, songId, position: 0, note: "Conservar indicación" }] }] };
}
function storage(values: Record<string, unknown>) {
  const raws = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, JSON.stringify(value)]));
  return { getItem: (key: string) => raws[key] ?? null };
}

test("local migration preserves divergent song and playlist versions and their source references", async () => {
  const currentSong = song("song-1", "Letra actual");
  const oldSong = song("song-1", "Letra histórica");
  const currentSet = set("set-1", "song-1");
  const oldSet = { ...set("set-1", "song-1"), isArchived: true };
  const source = storage({ "coro-cumbres:songs": [currentSong], "coro-cumbres:sets": [currentSet], "coro-os:v1:library": [oldSong], "coro-os:v1:sets": [oldSet] });
  const before = source.getItem("coro-os:v1:library");
  const result = await prepareLegacyImport(source);
  assert.equal(result.songs.length, 2);
  assert.equal(result.sets.length, 2);
  assert.equal(new Set(result.songs.map((item) => item.id)).size, 2);
  assert.equal(new Set(result.sets.map((item) => item.id)).size, 2);
  assert.deepEqual(result.songs[0], currentSong);
  assert.deepEqual({ ...result.songs[1], id: oldSong.id }, oldSong);
  assert.equal(result.sets[0].sections[0].items[0].songId, result.songs[0].id);
  assert.equal(result.sets[1].sections[0].items[0].songId, result.songs[1].id);
  assert.equal(result.sets[1].isArchived, true);
  assert.equal(result.sets[1].sections[0].items[0].note, "Conservar indicación");
  assert.equal(source.getItem("coro-os:v1:library"), before);
  assert.deepEqual(await prepareLegacyImport(source), result, "repeated migration must produce stable identifiers");
});

test("identical records across storage generations are deduplicated without changing content", async () => {
  const originalSong = song("song-1", "Misma letra");
  const originalSet = set("set-1", "song-1");
  const result = await prepareLegacyImport(storage({ "coro-cumbres:songs": [originalSong], "coro-os:v1:library": [originalSong], "coro-cumbres:sets": [originalSet], "coro-os:v1:sets": [originalSet] }));
  assert.deepEqual(result, { songs: [originalSong], sets: [originalSet] });
});

test("pre-set legacy playlists and quick sets keep metadata and import idempotently", async () => {
  const historical = song("song-1", "Letra antigua");
  const source = storage({ "coro-os:v1:library": [historical], "coro-os:v1:playlists": [{ id: "playlist-old", name: "Misa antigua", createdBy: "histórico", description: "Notas originales", shareId: "share-original", isArchived: true, items: [{ id: "old-item", songId: "song-1", position: 0, note: "Con coro" }] }], "coro-os:v1:setlist": ["song-1"] });
  const result = await prepareLegacyImport(source);
  assert.equal(result.sets.length, 2);
  assert.equal(result.sets[0].createdBy, "histórico");
  assert.equal(result.sets[0].notes, "Notas originales");
  assert.equal(result.sets[0].shareId, "share-original");
  assert.equal(result.sets[0].isArchived, true);
  assert.equal(result.sets[0].sections[0].items[0].note, "Con coro");
  assert.deepEqual(await prepareLegacyImport(source), result);
});

test("reordering visible entries cannot drop disabled or omitted entries", () => {
  const original: CoroSet = { ...set("set-1", "a"), sections: [
    { id: "entrance", type: "entrance", label: "Entrada", position: 0, items: [{ id: "a", songId: "song-a", position: 0, note: "Primera" }, { id: "b", songId: "song-b", position: 1 }] },
    { id: "hidden", type: "gloria", label: "Gloria oculta", position: 1, isEnabled: false, items: [{ id: "hidden-item", songId: "song-hidden", position: 0, note: "Conservar" }] },
    { id: "communion", type: "communion", label: "Comunión", position: 2, items: [{ id: "c", songId: "song-c", position: 0 }] },
    { id: "empty", type: "amen", label: "Amén vacío", position: 3, isEnabled: false, items: [] },
  ] };
  const before = structuredClone(original);
  const result = reorderPlaylistSections(original, ["c", "b", "a"]);
  assert.deepEqual(result.flatMap((section) => section.items.map((item) => item.id)), ["c", "b", "hidden-item", "a"]);
  const hidden = result.find((section) => section.id === "hidden");
  assert.equal(hidden?.isEnabled, false);
  assert.equal(hidden?.items[0].songId, "song-hidden");
  assert.equal(hidden?.items[0].note, "Conservar");
  assert.equal(result.find((section) => section.id === "empty")?.isEnabled, false);
  assert.equal(new Set(result.map((section) => section.id)).size, result.length);
  assert.equal(result.flatMap((section) => section.items).length, 4);
  assert.deepEqual(original, before, "editing helper must not mutate the original playlist");
});
