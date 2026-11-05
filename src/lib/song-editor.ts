import { sectionsToText, textToSections } from "./song-format";
import type { LiturgicalMoment, Song, SongSection } from "./types";

/** Metadata-only edits retain the original structured content, including chord positions. */
export function editedSongSections(original: Song, lyrics: string): SongSection[] {
  if (lyrics === sectionsToText(original.sections)) return original.sections;

  // The historical catalogue includes symbols beyond the text parser's grammar.
  // Protect those existing symbols while parsing and verify every retained token survives.
  let protectedText = lyrics;
  const symbols = [...new Set(original.sections.flatMap((section) => (section.lines ?? []).flatMap((line) => line.chords.map((chord) => chord.symbol))))];
  const replacements = symbols.map((symbol, index) => {
    const token = `REVISAR ACORDE EDITOR ${index}`;
    const occurrences = protectedText.split(`[${symbol}]`).length - 1;
    protectedText = protectedText.split(`[${symbol}]`).join(`[${token}]`);
    return { symbol, token, occurrences };
  });
  const sections = textToSections(protectedText);
  const chords = sections.flatMap((section) => (section.lines ?? []).flatMap((line) => line.chords));
  for (const { symbol, token, occurrences } of replacements) {
    const preserved = chords.filter((chord) => chord.symbol === token);
    if (preserved.length !== occurrences) throw new Error(`No se puede conservar el acorde [${symbol}] en ese formato. Colócalo dentro de una línea de letra antes de guardar. Tu versión original sigue intacta.`);
    preserved.forEach((chord) => { chord.symbol = symbol; });
  }
  const unrecognized = sections.flatMap((section) => (section.lines ?? []).flatMap((line) => [...line.lyrics.matchAll(/\[([^\]]+)\]/g)].map((match) => match[1])));
  if (unrecognized.length) throw new Error(`El editor no reconoce estos símbolos entre corchetes: ${[...new Set(unrecognized)].join(", ")}. Revísalos antes de guardar; no se han modificado los datos originales.`);
  return sections;
}

export function buildEditedSong(original: Song, draft: { title: string; lyrics: string; liturgicalMoments: LiturgicalMoment[] }, updatedAt: string): Song {
  return { ...original, title: draft.title.trim() || "Sin título", liturgicalMoments: draft.liturgicalMoments, sections: editedSongSections(original, draft.lyrics), updatedAt };
}
