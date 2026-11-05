"use client";

import { createClient } from "./supabase/client";
import { DENIED_MESSAGE, hasVerifiedGoogleIdentity } from "./supabase/auth-policy";
import { isSong, normalizedTitle, songContentSignature, validatePlaylist, validateSongImport } from "./cloud-validation";
import { readAllPages } from "./cloud-pagination";
import type { CoroSet, Mass, Song, SetSection } from "./types";

export const OFFICIAL_MASSES: Mass[] = [
  { id: "ninos", name: "MISA DE NIÑOS", time: "10:00:00", sortOrder: 1 },
  { id: "dominical-12", name: "MISA DOMINICAL", time: "12:00:00", sortOrder: 2 },
  { id: "dominical-1330", name: "MISA DOMINICAL", time: "13:30:00", sortOrder: 3 },
  { id: "noche", name: "MISA NOCHE DOMINICAL", time: null, sortOrder: 4 },
];

type SongRow = {
  id: string; title: string; subtitle: string | null; category: string | null; tags: string[];
  liturgical_moments: NonNullable<Song["liturgicalMoments"]>; source: string | null; notes: string | null;
  sections: Song["sections"]; created_at: string; updated_at: string;
};
type PlaylistRow = {
  id: string; title: string; type: CoroSet["type"]; mass_id: string | null; sunday_date: string | null;
  status: "draft" | "published"; notes: string | null; sections: SetSection[]; is_archived: boolean;
  share_id: string | null; created_at: string; updated_at: string; created_by: string | null;
  published_at: string | null; version: number;
  playlist_items?: PlaylistItemRow[];
};
type PlaylistItemRow = { playlist_id: string; id: string; section_id: string; song_id: string; position: number; note: string | null };

function toSong(row: SongRow): Song {
  return { id: row.id, title: row.title, subtitle: row.subtitle ?? undefined, category: row.category ?? undefined,
    tags: row.tags, liturgicalMoments: row.liturgical_moments, source: row.source ?? undefined, notes: row.notes ?? undefined,
    sections: row.sections, createdAt: row.created_at, updatedAt: row.updated_at };
}

function songRow(song: Song): Omit<SongRow, "liturgical_moments"> & {liturgical_moments: Song["liturgicalMoments"]} {
  if (!isSong(song)) throw new Error("La canción está incompleta o tiene un formato inválido.");
  return { id: song.id, title: song.title, subtitle: song.subtitle ?? null, category: song.category ?? null, tags: song.tags,
    liturgical_moments: song.liturgicalMoments ?? [], source: song.source ?? null, notes: song.notes ?? null,
    sections: song.sections, created_at: song.createdAt, updated_at: song.updatedAt };
}

function toSet(row: PlaylistRow): CoroSet {
  return { id: row.id, name: row.title, type: row.type, massId: row.mass_id ?? undefined, date: row.sunday_date ?? undefined,
    status: row.status, notes: row.notes ?? undefined, isArchived: row.is_archived, shareId: row.share_id ?? undefined,
    createdAt: row.created_at, updatedAt: row.updated_at, createdBy: row.created_by ?? undefined,
    publishedAt: row.published_at ?? undefined, version: Number(row.version),
    sections: row.sections.map(section => ({ ...section, items: (row.playlist_items ?? []).filter(item => item.section_id === section.id)
      .sort((a, b) => a.position - b.position).map(item => ({ id: item.id, songId: item.song_id, position: item.position, note: item.note ?? undefined })) })) };
}

async function adminClient() {
  const client = createClient();
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) throw new Error("Tu sesión terminó. Inicia sesión nuevamente para continuar.");
  if (!hasVerifiedGoogleIdentity(user)) throw new Error(DENIED_MESSAGE);
  const membership = await client.rpc("is_admin");
  if (membership.error) throw new Error("No se pudieron verificar los permisos de administración.");
  if (membership.data !== true) throw new Error(DENIED_MESSAGE);
  return client;
}

function queryError(error: { code?: string; message: string } | null) {
  if (!error) return;
  if (error.code === "23503" || error.code === "23001") throw new Error("La canción está incluida en un repertorio. Retírala de sus repertorios antes de eliminarla.");
  if (error.code === "23505") throw new Error("Ya existe ese registro o un repertorio para esa misa y domingo.");
  if (error.code === "42501") throw new Error(DENIED_MESSAGE);
  if (error.code === "40001") throw new Error("Este repertorio cambió en otro dispositivo. Recarga antes de volver a guardar.");
  throw new Error("No se pudo guardar o consultar la información. Comprueba la conexión e inténtalo nuevamente.");
}

// Pagination prevents the API's default 1,000 row cap silently truncating the library.
async function readSongs(client: ReturnType<typeof createClient>): Promise<Song[]> {
  const result: Song[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await client.from("songs").select("*").order("id").range(offset, offset + 499);
    queryError(error);
    result.push(...(data as SongRow[] ?? []).map(toSong));
    if (!data || data.length < 500) break;
  }
  return result;
}

async function readSets(client: ReturnType<typeof createClient>, published: boolean, date?: string, shareId?: string) {
  const result: CoroSet[] = [];
  for (let offset = 0; ; offset += 100) {
    let query = client.from("playlists").select("*").order("id").range(offset, offset + 99);
    if (published) query = query.eq("status", "published").eq("is_archived", false);
    if (date) query = query.eq("sunday_date", date);
    if (shareId) query = query.eq("share_id", shareId);
    const { data, error } = await query;
    queryError(error);
    const rows = (data ?? []) as PlaylistRow[];
    const groupedItems = new Map<string, PlaylistItemRow[]>();
    // PostgREST caps embedded relations independently. Read every item explicitly:
    // otherwise loading and saving a long playlist could erase silently truncated songs.
    if (rows.length) {
      const allItems = await readAllPages<PlaylistItemRow>(async (itemOffset, limit) => {
        const items = await client.from("playlist_items").select("*", { count: "exact" })
          .in("playlist_id", rows.map(row => row.id)).order("playlist_id").order("id").range(itemOffset, itemOffset + limit - 1);
        queryError(items.error);
        return { rows: (items.data ?? []) as PlaylistItemRow[], total: items.count };
      });
      for (const item of allItems) {
        const group = groupedItems.get(item.playlist_id) ?? [];
        group.push(item);
        groupedItems.set(item.playlist_id, group);
      }
    }
    result.push(...rows.map(row => toSet({ ...row, playlist_items: groupedItems.get(row.id) ?? [] })));
    if (!data || data.length < 100) break;
  }
  return result;
}

async function readMasses(client: ReturnType<typeof createClient>): Promise<Mass[]> {
  const { data, error } = await client.from("masses").select("id,name,time,sort_order").order("sort_order");
  queryError(error);
  return (data ?? []).map(row => ({ id: row.id, name: row.name, time: row.time, sortOrder: row.sort_order }));
}

export async function loadAdminData() {
  const client = await adminClient();
  const [songs, sets, masses] = await Promise.all([readSongs(client), readSets(client, false), readMasses(client)]);
  return { songs, sets, masses };
}

async function songsForSets(client: ReturnType<typeof createClient>, sets: CoroSet[]) {
  const ids = [...new Set(sets.flatMap(set => set.sections.flatMap(section => section.items.map(item => item.songId))))];
  const songs: Song[] = [];
  for (let offset = 0; offset < ids.length; offset += 100) {
    const { data, error } = await client.from("songs").select("*").in("id", ids.slice(offset, offset + 100));
    queryError(error);
    songs.push(...(data as SongRow[] ?? []).map(toSong));
  }
  return songs;
}

export async function getPublishedData(date?: string) {
  const client = createClient();
  const [sets, masses] = await Promise.all([readSets(client, true, date), readMasses(client)]);
  return { songs: await songsForSets(client, sets), sets, masses };
}

export async function getPublishedSet(shareId: string) {
  const client = createClient();
  const sets = await readSets(client, true, undefined, shareId);
  return { set: sets[0] ?? null, songs: await songsForSets(client, sets) };
}

export async function saveSong(song: Song, options: { create?: boolean; expectedUpdatedAt?: string } = {}): Promise<Song> {
  if (!options.create && !options.expectedUpdatedAt) throw new Error("Recarga la canción antes de guardar sus cambios.");
  const client = await adminClient();
  const row = songRow(song);
  const query = options.create ? client.from("songs").insert(row) : client.from("songs").update(row).eq("id", song.id).eq("updated_at", options.expectedUpdatedAt!);
  const { data, error } = await query.select().maybeSingle();
  queryError(error);
  if (!data) throw new Error("Esta canción cambió en otro dispositivo. Recarga antes de volver a guardar.");
  return toSong(data as SongRow);
}

export async function deleteSong(id: string) {
  const client = await adminClient();
  const { data, error } = await client.from("songs").delete().eq("id", id).select("id");
  queryError(error);
  if (!data?.length) throw new Error("La canción no se eliminó. Recarga la biblioteca.");
}

export async function saveSet(set: CoroSet, options: { import?: boolean } = {}): Promise<CoroSet> {
  validatePlaylist(set);
  const client = await adminClient();
  const { data, error } = await client.rpc("save_playlist", { p_playlist: {
    id: set.id, title: set.name, type: set.type, mass_id: set.massId ?? null, sunday_date: set.date ?? null,
    status: set.status ?? "draft", notes: set.notes ?? null, sections: set.sections, is_archived: set.isArchived,
    share_id: set.shareId ?? set.id, created_at: set.createdAt,
  }, p_expected_version: set.version ?? null, p_import: options.import ?? false });
  queryError(error);
  if (!data) throw new Error("El repertorio no se guardó.");
  // RPC commits playlist + items together. Keep the submitted items and use committed metadata/version.
  return { ...toSet(data as PlaylistRow), sections: set.sections };
}

export async function deleteSet(id: string) {
  const client = await adminClient();
  const { data, error } = await client.from("playlists").delete().eq("id", id).select("id");
  queryError(error);
  if (!data?.length) throw new Error("El repertorio no se eliminó. Recarga la página.");
}

export async function importLocalSongs(value: unknown) {
  validateSongImport(value);
  const client = await adminClient();
  const existing = await readSongs(client);
  const byId = new Map(existing.map(song => [song.id, song]));
  const byContent = new Map(existing.map(song => [songContentSignature(song), song]));
  const titles = new Set(existing.map(song => normalizedTitle(song.title)));
  const result = { inserted: 0, skipped: 0, conflicts: [] as string[], songIdMap: {} as Record<string, string> };
  for (const original of value) {
    const signature = songContentSignature(original);
    const identical = byContent.get(signature);
    if (identical) {
      result.songIdMap[original.id] = identical.id;
      result.skipped++;
      continue;
    }
    let song = original;
    if (byId.has(original.id)) {
      const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(signature));
      const suffix = [...new Uint8Array(hash)].map(byte => byte.toString(16).padStart(2, "0")).join("").slice(0, 24);
      let id = `${original.id.slice(0, 240)}-import-${suffix}`;
      while (byId.has(id)) id = `${original.id.slice(0, 230)}-import-${crypto.randomUUID()}`;
      song = { ...original, id };
    }
    if (song.id !== original.id || titles.has(normalizedTitle(song.title))) result.conflicts.push(song.title);
    // Insert-only: never upsert or delete localStorage, including on retries or partial failures.
    const { error } = await client.from("songs").insert(songRow(song));
    if (error?.code === "23505") throw new Error("La biblioteca cambió durante la importación. Conservamos el respaldo local; vuelve a importar para completar los registros pendientes.");
    queryError(error);
    const verified = await client.from("songs").select("*").eq("id", song.id).single();
    queryError(verified.error);
    if (!verified.data || songContentSignature(toSong(verified.data as SongRow)) !== signature) throw new Error("No se pudo verificar la canción importada. El respaldo local permanece intacto; recarga para revisar los cambios.");
    byId.set(song.id, song); byContent.set(signature, song); titles.add(normalizedTitle(song.title));
    result.songIdMap[original.id] = song.id;
    result.inserted++;
  }
  return result;
}
