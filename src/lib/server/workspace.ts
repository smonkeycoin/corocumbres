import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, open, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { dirname, isAbsolute } from "node:path";
import { BlobPreconditionFailedError, get, put } from "@vercel/blob";
import { seedSongs } from "../seed-songs";
import { songToFullLyrics } from "../song-format";
import type { MassId } from "../masses";
import type { CoroSet, Song } from "../types";
import type { ImportSummary, PublicPlaylistSnapshot, WorkspaceResponse, WorkspaceState } from "../v2-types";
import { HttpError } from "./http";
import { validateWorkspace } from "./schema";

const EMPTY_ETAG = "missing";
const MAX_STATE_BYTES = 3_000_000;

/** Isolated real-storage QA is opt-in and can never redirect production data. */
export function getStorageNamespace() {
  const prefix = process.env.CORO_BLOB_TEST_PREFIX;
  if (process.env.NODE_ENV === "production" || !prefix) return "coro-v2";
  if (!/^qa\/[a-z0-9-]{1,100}$/.test(prefix)) {
    throw new HttpError(500, "El espacio aislado de pruebas no es válido.", "INVALID_TEST_NAMESPACE");
  }
  return prefix;
}

function localDataFile() {
  const path = process.env.CORO_DATA_FILE;
  // Deliberate local integration-test adapter. It is never a production fallback.
  return process.env.NODE_ENV !== "production" && path && isAbsolute(path) ? path : null;
}

export function getStorageConfigurationStatus() {
  if (localDataFile()) return { ready: true, mode: "local-development" as const };
  const ready = Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
  return { ready, mode: "private-blob" as const };
}

export function initialWorkspace(): WorkspaceState {
  return {
    schemaVersion: 2,
    revision: 0,
    songs: structuredClone(seedSongs),
    sets: [],
    assignments: { ninos: null, "dominical-12": null, "dominical-1330": null, noche: null },
    published: { ninos: null, "dominical-12": null, "dominical-1330": null, noche: null },
    publicationSources: { ninos: null, "dominical-12": null, "dominical-1330": null, noche: null },
  };
}

function digest(text: string) {
  return createHash("sha256").update(text).digest("hex");
}

function parseStoredState(text: string) {
  try {
    if (Buffer.byteLength(text, "utf8") > MAX_STATE_BYTES) throw new Error("StateTooLarge");
    return validateWorkspace(JSON.parse(text));
  } catch {
    throw new HttpError(503, "Los datos guardados requieren revisión. No se sobrescribieron.", "STORAGE_INVALID_DATA");
  }
}

async function readLocal(path: string): Promise<WorkspaceResponse> {
  try {
    const text = await readFile(path, "utf8");
    return { state: parseStoredState(text), etag: digest(text) };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return { state: initialWorkspace(), etag: EMPTY_ETAG };
    throw error;
  }
}

export async function readWorkspace(): Promise<WorkspaceResponse> {
  const file = localDataFile();
  if (file) return readLocal(file);
  if (!getStorageConfigurationStatus().ready) {
    throw new HttpError(503, "El almacenamiento compartido todavía no está configurado.", "STORAGE_NOT_CONFIGURED");
  }
  try {
    // Compressed delivery responses carry weak W/ ETags, which cannot be used for If-Match.
    // Request the original representation so reads and conditional writes share the strong object ETag.
    const response = await get(`${getStorageNamespace()}/workspace.json`, {
      access: "private", useCache: false, headers: { "accept-encoding": "identity" },
    });
    if (!response) return { state: initialWorkspace(), etag: EMPTY_ETAG };
    if (response.statusCode !== 200 || !response.stream || !response.blob.etag.startsWith('"')) throw new Error("InvalidBlobResponse");
    if (response.blob.size !== null && response.blob.size > MAX_STATE_BYTES) throw new Error("StateTooLarge");
    return { state: parseStoredState(await new Response(response.stream).text()), etag: response.blob.etag };
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(503, "No pudimos leer el almacenamiento compartido. Intenta nuevamente.", "STORAGE_UNAVAILABLE");
  }
}

function conflict() {
  return new HttpError(409, "Otra persona guardó cambios. Recarga la versión actual antes de guardar nuevamente.", "REVISION_CONFLICT");
}

/** Backup first, then a conditional replacement. Stale clients never overwrite another revision. */
async function writeWorkspace(current: WorkspaceResponse, next: WorkspaceState, actor: string, action: string): Promise<WorkspaceResponse> {
  const state = validateWorkspace({ ...next, schemaVersion: 2, revision: current.state.revision + 1 });
  const text = JSON.stringify(state);
  if (Buffer.byteLength(text, "utf8") > MAX_STATE_BYTES) throw new HttpError(413, "El repertorio supera la capacidad de esta versión.", "STATE_TOO_LARGE");
  const backup = JSON.stringify({ savedAt: new Date().toISOString(), actor, action, state: current.state });
  const backupName = `${current.state.revision}-${randomUUID()}.json`;
  const file = localDataFile();
  if (file) {
    await mkdir(dirname(file), { recursive: true });
    const lockPath = `${file}.lock`;
    let lock;
    try {
      lock = await open(lockPath, "wx", 0o600);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "EEXIST") throw conflict();
      throw error;
    }
    const temporaryPath = `${file}.${randomUUID()}.tmp`;
    try {
      const latest = await readLocal(file);
      if (latest.etag !== current.etag) throw conflict();
      await mkdir(`${file}.history`, { recursive: true });
      await writeFile(`${file}.history/${backupName}`, backup, { flag: "wx", mode: 0o600 });
      await writeFile(temporaryPath, text, { flag: "wx", mode: 0o600 });
      await rename(temporaryPath, file);
      return { state, etag: digest(text) };
    } finally {
      await lock.close();
      await unlink(lockPath);
    }
  }
  try {
    await put(`${getStorageNamespace()}/history/${backupName}`, backup, {
      access: "private", addRandomSuffix: false, allowOverwrite: false, contentType: "application/json",
    });
    const result = await put(`${getStorageNamespace()}/workspace.json`, text, {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: current.etag !== EMPTY_ETAG,
      ...(current.etag !== EMPTY_ETAG ? { ifMatch: current.etag } : {}),
      contentType: "application/json",
      cacheControlMaxAge: 60,
    });
    return { state, etag: result.etag };
  } catch (error) {
    if (error instanceof BlobPreconditionFailedError) throw conflict();
    // The SDK reports create-only collisions as a generic BlobError. Re-read the
    // actual revision rather than matching provider text or assuming Error.name.
    try {
      const latest = await readWorkspace();
      if (latest.etag !== current.etag) throw conflict();
    } catch (readError) {
      if (readError instanceof HttpError && readError.code === "REVISION_CONFLICT") throw readError;
    }
    throw new HttpError(503, "No se pudieron guardar los cambios. La versión publicada anterior permanece disponible.", "STORAGE_WRITE_FAILED");
  }
}

async function readExpected(etag: string) {
  const current = await readWorkspace();
  if (current.etag !== etag) throw conflict();
  return current;
}

export async function saveWorkspace(input: Partial<WorkspaceState>, etag: string, actor: string) {
  const current = await readExpected(etag);
  const next: WorkspaceState = {
    ...current.state,
    songs: input.songs ?? current.state.songs,
    sets: input.sets ?? current.state.sets,
    assignments: input.assignments ?? current.state.assignments,
    // Published snapshots can only change through the explicit publish operation.
    published: current.state.published,
  };
  const nextSongIds = new Set(next.songs.map((song) => song.id));
  const nextSetIds = new Set(next.sets.map((set) => set.id));
  if (current.state.songs.some((song) => !nextSongIds.has(song.id)) || current.state.sets.some((set) => !nextSetIds.has(set.id))) {
    throw new HttpError(400, "No se permite eliminar información histórica. Conserva las canciones y archiva las playlists.", "DESTRUCTIVE_UPDATE");
  }
  return writeWorkspace(current, next, actor, "save-draft");
}

export function buildPublicSnapshot(state: WorkspaceState, massId: MassId, setId: string): PublicPlaylistSnapshot {
  const set = state.sets.find((candidate) => candidate.id === setId && !candidate.isArchived);
  if (!set) throw new HttpError(404, "No encontramos la playlist seleccionada.", "PLAYLIST_NOT_FOUND");
  const songs = new Map(state.songs.map((song) => [song.id, song]));
  const items = [...set.sections]
    .filter((section) => section.isEnabled !== false)
    .sort((a, b) => a.position - b.position)
    .flatMap((section) => [...section.items].sort((a, b) => a.position - b.position).map((item) => {
      const song = songs.get(item.songId);
      if (!song) throw new HttpError(400, "La playlist contiene una canción que no está en el repertorio.", "MISSING_SONG");
      return { id: item.id, songId: song.id, title: song.title, moment: section.type === "free" ? "" : section.label, lyrics: songToFullLyrics(song) };
    }));
  return { massId, revision: state.revision + 1, publishedAt: new Date().toISOString(), items };
}

export async function publishPlaylist(massId: MassId, setId: string, etag: string, actor: string) {
  const current = await readExpected(etag);
  const snapshot = buildPublicSnapshot(current.state, massId, setId);
  const state = {
    ...current.state,
    assignments: { ...current.state.assignments, [massId]: setId },
    published: { ...current.state.published, [massId]: snapshot },
    publicationSources: { ninos: null, "dominical-12": null, "dominical-1330": null, noche: null, ...current.state.publicationSources, [massId]: setId },
  };
  return writeWorkspace(current, state, actor, `publish:${massId}`);
}

export async function readPublicPlaylist(massId: MassId): Promise<PublicPlaylistSnapshot | null> {
  const { state } = await readWorkspace();
  // Never return the workspace or resolve song IDs against unpublished library content.
  return state.published[massId];
}

export async function readPublishedShare(shareId: string): Promise<PublicPlaylistSnapshot | null> {
  const { state } = await readWorkspace();
  const set = state.sets.find((candidate) => candidate.shareId === shareId && !candidate.isArchived);
  if (!set) return null;
  for (const [massId, assignedId] of Object.entries(state.publicationSources ?? {})) {
    if (assignedId === set.id && state.published[massId as MassId]) return state.published[massId as MassId];
  }
  return null;
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

/** Idempotent, additive import. A conflicting local version is retained with a stable new ID. */
export function mergeImportedWorkspace(state: WorkspaceState, importedSongs: Song[], importedSets: CoroSet[]) {
  if (new Set(importedSongs.map((song) => song.id)).size !== importedSongs.length || new Set(importedSets.map((set) => set.id)).size !== importedSets.length) {
    throw new HttpError(400, "El archivo contiene identificadores duplicados.", "DUPLICATE_ID");
  }
  const next = structuredClone(state);
  const summary: ImportSummary = { addedSongs: 0, addedSets: 0, songConflicts: 0, setConflicts: 0 };
  const remap = new Map<string, string>();
  const songs = new Map(next.songs.map((song) => [song.id, song]));
  for (const original of importedSongs) {
    const existing = songs.get(original.id);
    let song = structuredClone(original);
    if (existing && canonical(existing) !== canonical(original)) {
      song = { ...song, id: `${original.id.slice(0, 240)}-import-${digest(canonical(original)).slice(0, 16)}` };
      summary.songConflicts++;
    }
    remap.set(original.id, song.id);
    const alreadyImported = songs.get(song.id);
    if (alreadyImported && canonical(alreadyImported) !== canonical(song)) {
      // A previous imported copy was subsequently edited. Preserve both versions again.
      song = { ...song, id: `${song.id.slice(0, 250)}-${randomUUID()}` };
      remap.set(original.id, song.id);
    }
    if (!songs.has(song.id)) {
      next.songs.push(song);
      songs.set(song.id, song);
      summary.addedSongs++;
    }
  }
  const sets = new Map(next.sets.map((set) => [set.id, set]));
  for (const original of importedSets) {
    let set: CoroSet = {
      ...structuredClone(original),
      sections: original.sections.map((section) => ({ ...structuredClone(section), items: section.items.map((item) => ({ ...item, songId: remap.get(item.songId) ?? item.songId })) })),
    };
    const existing = sets.get(set.id);
    if (existing && canonical(existing) !== canonical(set)) {
      set = { ...set, id: `${set.id.slice(0, 240)}-import-${digest(canonical(set)).slice(0, 16)}` };
      summary.setConflicts++;
    }
    const alreadyImported = sets.get(set.id);
    if (alreadyImported && canonical(alreadyImported) !== canonical(set)) set = { ...set, id: `${set.id.slice(0, 250)}-${randomUUID()}` };
    if (!sets.has(set.id)) {
      next.sets.push(set);
      sets.set(set.id, set);
      summary.addedSets++;
    }
  }
  return { state: validateWorkspace(next), summary };
}

export async function importWorkspace(songs: Song[], sets: CoroSet[], etag: string, actor: string) {
  const current = await readExpected(etag);
  const merged = mergeImportedWorkspace(current.state, songs, sets);
  if (!merged.summary.addedSets && !merged.summary.addedSongs) return { ...current, summary: merged.summary };
  const saved = await writeWorkspace(current, merged.state, actor, "import-local-backup");
  return { ...saved, summary: merged.summary };
}
