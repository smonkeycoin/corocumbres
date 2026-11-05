import test from "node:test";
import assert from "node:assert/strict";
import { seedSongs } from "../src/lib/seed-songs";
import { sectionsToText } from "../src/lib/song-format";
import { buildEditedSong, editedSongSections } from "../src/lib/song-editor";
import type { Song } from "../src/lib/types";

const chordSymbols = (song: Song) => song.sections.flatMap((section) => (section.lines ?? []).flatMap((line) => line.chords.map((chord) => chord.symbol)));

test("metadata-only edits preserve every real seed section, chord, note and source", () => {
  let totalChords = 0;
  for (const song of seedSongs) {
    const original = { ...song, notes: song.notes ?? "Nota que debe conservarse", source: song.source ?? "partitura.pdf" };
    const edited = buildEditedSong(original, { title: `${song.title} editada`, lyrics: sectionsToText(song.sections), liturgicalMoments: ["entrance"] }, "2026-11-06T00:00:00Z");
    assert.strictEqual(edited.sections, original.sections, song.title);
    assert.deepEqual(chordSymbols(edited), chordSymbols(original), song.title);
    assert.equal(edited.notes, original.notes);
    assert.equal(edited.source, original.source);
    assert.equal(edited.category, original.category);
    totalChords += chordSymbols(original).length;
  }
  assert.ok(totalChords > 0, "test must exercise actual structured seed chords");
});

test("editing real seed lyrics preserves every retained historical chord symbol", () => {
  for (const song of seedSongs.filter((song) => chordSymbols(song).length)) {
    const edited = buildEditedSong(song, { title: song.title, lyrics: `${sectionsToText(song.sections)}\nNueva línea final`, liturgicalMoments: song.liturgicalMoments ?? [] }, "2026-11-06T00:00:00Z");
    assert.deepEqual(chordSymbols(edited), chordSymbols(song), song.title);
  }
});

test("unknown inline chord is rejected explicitly rather than saved as lyric text", () => {
  const song = seedSongs[0];
  assert.throws(() => editedSongSections(song, `${sectionsToText(song.sections)}\n[H9unknown]Nueva línea`), /no reconoce/);
});
