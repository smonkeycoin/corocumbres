import { Chord, SectionType, Song, SongLine, SongSection } from "./types";

const sectionMap: Record<string, SectionType> = {
  verse: "verse",
  verso: "verse",
  estrofa: "verse",
  chorus: "chorus",
  coro: "chorus",
  estribillo: "chorus",
  bridge: "bridge",
  puente: "bridge",
  intro: "intro",
  outro: "outro",
  final: "outro"
};

export function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
}

function normalizeType(label: string): SectionType {
  const clean = label.toLowerCase().replace(/[^a-záéíóúñ ]/gi, "").trim();
  return sectionMap[clean] ?? "other";
}

function chunkLines(lines: string[], maxLines = 4) {
  const chunks: string[][] = [];
  for (let i = 0; i < lines.length; i += maxLines) chunks.push(lines.slice(i, i + maxLines));
  return chunks.length ? chunks : [[]];
}

const chordPattern = /^[A-G](?:#|b)?(?:m|maj|min|dim|aug|sus|add)?\d*(?:\/[A-G](?:#|b)?)?$/;

function isChordToken(token: string) {
  return chordPattern.test(token.trim());
}

function isChordRow(line: string) {
  const tokens = line.trim().split(/\s+/).filter(Boolean);
  return tokens.length > 0 && tokens.every(isChordToken);
}

function parseChordRow(row: string, lyricLine: string): SongLine {
  const chords: Chord[] = [];
  const matches = [...row.matchAll(/\S+/g)];
  for (const match of matches) {
    const symbol = match[0].replace(/\s+/g, "");
    const position = Math.min(Math.max(match.index ?? 0, 0), Math.max(lyricLine.length, 0));
    if (isChordToken(symbol)) chords.push({ symbol, position });
  }
  return { id: uid("line"), lyrics: lyricLine.trimEnd(), chords };
}

function parseInlineChordLine(line: string): SongLine {
  let lyrics = "";
  const chords: Chord[] = [];
  let index = 0;
  while (index < line.length) {
    if (line[index] === "[") {
      const end = line.indexOf("]", index);
      if (end > index) {
        const symbol = line.slice(index + 1, end).trim();
        if (isChordToken(symbol) || symbol.startsWith("REVISAR ACORDE")) {
          chords.push({ symbol, position: lyrics.length });
          index = end + 1;
          continue;
        }
      }
    }
    lyrics += line[index];
    index += 1;
  }
  return { id: uid("line"), lyrics: lyrics.trimEnd(), chords };
}

function parseSongLines(text: string): SongLine[] {
  const rawLines = text.replace(/\r\n/g, "\n").split("\n");
  const lines: SongLine[] = [];
  for (let i = 0; i < rawLines.length; i += 1) {
    const current = rawLines[i] ?? "";
    const next = rawLines[i + 1] ?? "";
    if (isChordRow(current) && next.trim()) {
      lines.push(parseChordRow(current, next));
      i += 1;
    } else if (!current.trim()) {
      lines.push({ id: uid("line"), lyrics: "", chords: [] });
    } else {
      lines.push(parseInlineChordLine(current));
    }
  }
  return lines;
}

function linesToSlides(lines: SongLine[]) {
  const paragraphs: string[][] = [];
  let current: string[] = [];
  for (const line of lines) {
    if (!line.lyrics.trim()) {
      if (current.length) paragraphs.push(current);
      current = [];
      continue;
    }
    current.push(line.lyrics);
  }
  if (current.length) paragraphs.push(current);
  return paragraphs.length ? paragraphs.flatMap((paragraph) => (paragraph.length > 4 ? chunkLines(paragraph) : [paragraph])) : [[]];
}

function lineToInlineText(line: SongLine) {
  if (!line.chords.length) return line.lyrics;
  const sorted = [...line.chords].sort((a, b) => b.position - a.position);
  let text = line.lyrics;
  for (const chord of sorted) {
    const position = Math.min(Math.max(chord.position, 0), text.length);
    text = `${text.slice(0, position)}[${chord.symbol}]${text.slice(position)}`;
  }
  return text;
}

export function sectionsToText(sections: SongSection[]) {
  return sections
    .map((section) => {
      const body = section.lines?.length
        ? section.lines.map(lineToInlineText).join("\n")
        : section.slides.map((slide) => slide.join("\n")).join("\n\n");
      return `[${section.label}]\n\n${body}`;
    })
    .join("\n\n---\n\n");
}

export function textToSections(text: string): SongSection[] {
  const blocks = text
    .replace(/\r\n/g, "\n")
    .split(/\n\s*---\s*\n/g)
    .flatMap((part) => part.split(/(?=^\[[^\]]+\]\s*$)/m))
    .map((part) => part.trim())
    .filter(Boolean);

  const sections = blocks.map((block, index) => {
    const lines = block.split("\n");
    const header = lines[0]?.match(/^\[([^\]]+)\]\s*$/);
    const label = header ? header[1].trim() : index === 0 ? "Verso 1" : `Sección ${index + 1}`;
    const body = (header ? lines.slice(1) : lines).join("\n").trim();
    const parsedLines = parseSongLines(body);

    return {
      id: uid("section"),
      type: normalizeType(label),
      label,
      lines: parsedLines,
      slides: linesToSlides(parsedLines)
    };
  });

  return sections.length
    ? sections
    : [{ id: uid("section"), type: "verse", label: "Verso 1", lines: [{ id: uid("line"), lyrics: "", chords: [] }], slides: [[""]] }];
}

export function flattenSlides(song?: Song | null) {
  if (!song) return [];
  return song.sections.flatMap((section, sectionIndex) =>
    section.slides.map((slide, slideIndex) => ({ section, sectionIndex, slide, slideIndex }))
  );
}

export function songToFullLyrics(song?: Song | null) {
  if (!song) return "";
  return song.sections
    .map((section) =>
      section.lines?.length
        ? section.lines.map((line) => line.lyrics).join("\n").trim()
        : section.slides.map((slide) => slide.join("\n")).join("\n\n").trim()
    )
    .filter(Boolean)
    .join("\n\n");
}

export function sectionLines(section: SongSection): SongLine[] {
  if (section.lines?.length) return section.lines;
  return section.slides.flatMap((slide, slideIndex) => [
    ...slide.map((lyrics) => ({ id: uid("line"), lyrics, chords: [] })),
    ...(slideIndex < section.slides.length - 1 ? [{ id: uid("line"), lyrics: "", chords: [] }] : [])
  ]);
}

export function makeSong(title: string, lyrics: string, source?: string): Song {
  const now = new Date().toISOString();
  return {
    id: uid("song"),
    title: title.trim() || "Nueva canción",
    tags: [],
    source,
    sections: textToSections(lyrics),
    createdAt: now,
    updatedAt: now
  };
}
