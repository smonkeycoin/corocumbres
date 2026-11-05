import type { Song, CoroSet } from "./types";

const object = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const string = (value: unknown): value is string => typeof value === "string";
const text = (value: unknown): value is string => string(value) && value.trim().length > 0;
const optionalString = (value: unknown) => value === undefined || string(value);
const strings = (value: unknown) => Array.isArray(value) && value.every(string);
const timestamp = (value: unknown) => string(value) && Number.isFinite(Date.parse(value));

export function isSong(value: unknown): value is Song {
  if (!object(value) || !text(value.id) || !text(value.title) || !strings(value.tags) || !timestamp(value.createdAt) || !timestamp(value.updatedAt)) return false;
  if (![value.subtitle, value.category, value.source, value.notes].every(optionalString)) return false;
  if (value.liturgicalMoments !== undefined && !strings(value.liturgicalMoments)) return false;
  return Array.isArray(value.sections) && value.sections.every(section => object(section)
    && text(section.id) && ["verse", "chorus", "bridge", "intro", "outro", "other"].includes(String(section.type)) && string(section.label)
    && Array.isArray(section.slides) && section.slides.every(strings)
    && (section.lines === undefined || (Array.isArray(section.lines) && section.lines.every(line => object(line)
      && text(line.id) && string(line.lyrics) && Array.isArray(line.chords) && line.chords.every(chord => object(chord)
        && string(chord.symbol) && Number.isInteger(chord.position) && Number(chord.position) >= 0)))));
}

export function validateSongImport(value: unknown): asserts value is Song[] {
  if (!Array.isArray(value) || value.length > 10000 || !value.every(isSong)) throw new Error("El archivo contiene canciones incompletas o inválidas. No se modificó la biblioteca.");
  if (new Set(value.map(song => song.id)).size !== value.length) throw new Error("El archivo contiene identificadores repetidos. Resuelve los duplicados antes de importarlo.");
}

export function normalizedTitle(title: string) {
  return title.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function songContentSignature(song: Song): string {
  const canonical = (value: unknown): string => {
    if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
    if (object(value)) return `{${Object.keys(value).filter(key => value[key] !== undefined).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
    return JSON.stringify(value) ?? "null";
  };
  // Database timestamps normalize timezone formatting. Content is the identity for deduplication.
  return canonical({ title: song.title, subtitle: song.subtitle, category: song.category, tags: song.tags,
    liturgicalMoments: song.liturgicalMoments ?? [], source: song.source, notes: song.notes, sections: song.sections });
}

export function validatePlaylist(set: CoroSet) {
  if (!text(set.id) || !text(set.name) || !Array.isArray(set.sections)) throw new Error("El repertorio está incompleto.");
  if (set.date && (!/^\d{4}-\d{2}-\d{2}$/.test(set.date) || new Date(`${set.date}T12:00:00Z`).toISOString().slice(0, 10) !== set.date || new Date(`${set.date}T12:00:00Z`).getUTCDay() !== 0)) throw new Error("Selecciona una fecha dominical válida.");
  if (set.status === "published" && (!set.massId || !set.date)) throw new Error("Selecciona la misa y el domingo antes de publicar.");
  const sections = new Set<string>();
  const items = new Set<string>();
  for (const section of set.sections) {
    if (!text(section.id) || sections.has(section.id) || !Array.isArray(section.items)) throw new Error("El repertorio contiene secciones inválidas.");
    sections.add(section.id);
    for (const item of section.items) {
      if (!text(item.id) || !text(item.songId) || items.has(item.id)) throw new Error("El repertorio contiene canciones repetidas o inválidas.");
      items.add(item.id);
    }
  }
}
