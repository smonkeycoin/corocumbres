import { createHash } from "node:crypto";
import { songContentSignature, validateSongImport } from "../src/lib/cloud-validation";
import type { Song } from "../src/lib/types";

export class MigrationError extends Error {}

export type SongRow = {
  id: string; title: string; subtitle: string | null; category: string | null; tags: string[];
  liturgical_moments: NonNullable<Song["liturgicalMoments"]>; source: string | null; notes: string | null;
  sections: Song["sections"]; created_at: string; updated_at: string;
};

export function toRow(song: Song): SongRow {
  return { id: song.id, title: song.title, subtitle: song.subtitle ?? null, category: song.category ?? null,
    tags: song.tags, liturgical_moments: song.liturgicalMoments ?? [], source: song.source ?? null, notes: song.notes ?? null,
    sections: song.sections, created_at: song.createdAt, updated_at: song.updatedAt };
}

export function fromRow(row: SongRow): Song {
  return { id: row.id, title: row.title, subtitle: row.subtitle ?? undefined, category: row.category ?? undefined,
    tags: row.tags, liturgicalMoments: row.liturgical_moments, source: row.source ?? undefined, notes: row.notes ?? undefined,
    sections: row.sections, createdAt: row.created_at, updatedAt: row.updated_at };
}

export function sameStoredSong(expected: Song, actual: Song): boolean {
  return expected.id === actual.id && songContentSignature(expected) === songContentSignature(actual)
    && new Date(expected.createdAt).toISOString() === new Date(actual.createdAt).toISOString()
    && new Date(expected.updatedAt).toISOString() === new Date(actual.updatedAt).toISOString();
}

export function validateProjectUrl(rawUrl: string | undefined, expectedRef: string): string {
  if (!/^[a-z0-9-]+$/.test(expectedRef)) throw new MigrationError("--project-ref debe indicar una referencia explícita de Supabase.");
  if (!rawUrl) throw new MigrationError("Falta NEXT_PUBLIC_SUPABASE_URL. No se contactó ni modificó ningún proyecto.");
  const url = new URL(rawUrl);
  if (url.protocol !== "https:" || url.hostname !== `${expectedRef}.supabase.co` || url.port || url.username || url.password || url.search || url.hash || !["", "/"].includes(url.pathname)) {
    throw new MigrationError("La URL de Supabase no coincide exactamente con --project-ref. Operación cancelada.");
  }
  return url.origin;
}

export function validateMigrationKeys(publicKey: string | undefined, serviceKey: string | undefined): void {
  if (!publicKey || !serviceKey) throw new MigrationError("Falta la clave pública o SUPABASE_SERVICE_ROLE_KEY de bootstrap. No se contactó ningún proyecto. La clave privilegiada debe cargarse sólo en este proceso Node.");
  const role = (key: string): unknown => {
    try { return JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString("utf8")).role; }
    catch { return null; }
  };
  if (publicKey === serviceKey || !(publicKey.startsWith("sb_publishable_") || role(publicKey) === "anon")) throw new MigrationError("Configuración insegura: se requiere una clave pública publishable/anon, nunca una clave privilegiada.");
  if (!(serviceKey.startsWith("sb_secret_") || role(serviceKey) === "service_role")) throw new MigrationError("La credencial de bootstrap debe ser una clave secreta o service_role del proyecto verificado.");
}

export function readSnapshot(value: unknown): { songs: Song[]; sets: number; publications: number } {
  if (!value || typeof value !== "object") throw new MigrationError("El respaldo debe ser un workspace JSON o un arreglo de canciones.");
  if (Array.isArray(value)) { validateSongImport(value); return { songs: value, sets: 0, publications: 0 }; }
  const wrapper = value as Record<string, unknown>;
  const state = (wrapper.state && typeof wrapper.state === "object" ? wrapper.state : wrapper) as Record<string, unknown>;
  validateSongImport(state.songs);
  if (state.sets !== undefined && !Array.isArray(state.sets)) throw new MigrationError("El respaldo contiene repertorios con formato desconocido.");
  let publications = 0;
  for (const key of ["assignments", "published", "publicationSources"]) {
    const entries = state[key];
    if (entries !== undefined && (!entries || typeof entries !== "object" || Array.isArray(entries))) throw new MigrationError("El respaldo contiene asignaciones con formato desconocido.");
    publications += entries ? Object.values(entries).filter(Boolean).length : 0;
  }
  return { songs: state.songs, sets: (state.sets as unknown[] | undefined)?.length ?? 0, publications };
}

export function planLibraryMigration(sources: Song[][], existing: Song[]) {
  sources.forEach(validateSongImport);
  const byId = new Map(existing.map(song => [song.id, song]));
  const byContent = new Map(existing.map(song => [songContentSignature(song), song]));
  const inserts: Song[] = [];
  const mappings: { source: number; from: string; to: string; action: "insert" | "existing" | "variant" }[] = [];
  let duplicates = 0;
  let variants = 0;
  sources.forEach((songs, source) => {
    for (const original of songs) {
      const signature = songContentSignature(original);
      const duplicate = byContent.get(signature);
      if (duplicate) {
        duplicates++;
        mappings.push({ source, from: original.id, to: duplicate.id, action: "existing" });
        continue;
      }
      let song = structuredClone(original);
      const conflict = byId.get(song.id);
      if (conflict) {
        const hash = createHash("sha256").update(signature).digest("hex").slice(0, 24);
        const stem = `${song.id.slice(0, 240)}-import-${hash}`;
        let id = stem;
        let suffix = 1;
        // Stable suffixes preserve even an imported variant that someone edited later.
        while (byId.has(id)) id = `${stem}-${suffix++}`;
        song = { ...song, id };
        variants++;
      }
      inserts.push(song);
      byId.set(song.id, song);
      byContent.set(signature, song);
      mappings.push({ source, from: original.id, to: song.id, action: conflict ? "variant" : "insert" });
    }
  });
  return { inserts, duplicates, variants, mappings };
}
