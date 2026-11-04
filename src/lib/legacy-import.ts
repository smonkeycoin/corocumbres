import type { CoroSet, SetItem, Song } from "./types";

export type LegacyImportPayload = { songs: Song[]; sets: CoroSet[] };
type ReadableStorage = Pick<Storage, "getItem">;
type LegacyPlaylist = {
  id: string;
  name: string;
  description?: string;
  serviceDate?: string;
  items: SetItem[];
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  isArchived?: boolean;
  shareId?: string;
};

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value).filter(([, field]) => field !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([key, field]) => `${JSON.stringify(key)}:${canonical(field)}`).join(",")}}`;
  return JSON.stringify(value);
}

async function digest(value: unknown) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical(value)));
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("").slice(0, 24);
}

function readArray<T>(storage: ReadableStorage, key: string): T[] {
  const raw = storage.getItem(key);
  if (!raw) return [];
  const value: unknown = JSON.parse(raw);
  if (!Array.isArray(value)) throw new Error(`El respaldo ${key} no tiene un formato válido.`);
  return value as T[];
}

/** Resolves only local identity collisions. The server still validates every field. */
export async function prepareLegacyImport(storage: ReadableStorage): Promise<LegacyImportPayload> {
  const currentSongs = readArray<Song>(storage, "coro-cumbres:songs");
  const legacySongs = readArray<Song>(storage, "coro-os:v1:library");
  const songs: Song[] = [];
  const songsById = new Map<string, Song>();
  const mappings = { current: new Map<string, string>(), legacy: new Map<string, string>() };

  for (const [origin, source] of [["current", currentSongs], ["legacy", legacySongs]] as const) {
    for (const original of source) {
      if (!original || typeof original.id !== "string") throw new Error("Una canción del respaldo no tiene un identificador válido.");
      let song = original;
      const existing = songsById.get(original.id);
      if (existing && canonical(existing) !== canonical(original)) {
        const stem = `${original.id.slice(0, 235)}-local-${await digest(original)}`;
        let id = stem;
        let suffix = 1;
        while (songsById.has(id) && canonical({ ...songsById.get(id), id: original.id }) !== canonical(original)) id = `${stem}-${suffix++}`;
        song = { ...original, id };
      }
      if (!songsById.has(song.id)) { songsById.set(song.id, song); songs.push(song); }
      // Existing arrays resolve duplicate IDs with their first entry; keep that association.
      if (!mappings[origin].has(original.id)) mappings[origin].set(original.id, song.id);
    }
  }

  const legacySets = readArray<CoroSet>(storage, "coro-os:v1:sets");
  for (const playlist of readArray<LegacyPlaylist>(storage, "coro-os:v1:playlists")) {
    if (!playlist || typeof playlist.id !== "string" || !Array.isArray(playlist.items)) throw new Error("Una playlist antigua no tiene un formato válido.");
    const id = playlist.id.replace(/^playlist/, "set");
    legacySets.push({
      id, name: playlist.name, type: "playlist", date: playlist.serviceDate, notes: playlist.description,
      createdAt: playlist.createdAt ?? "1970-01-01T00:00:00.000Z", updatedAt: playlist.updatedAt ?? playlist.createdAt ?? "1970-01-01T00:00:00.000Z",
      createdBy: playlist.createdBy, isArchived: playlist.isArchived ?? false, shareId: playlist.shareId,
      sections: [{ id: `${id.slice(0, 260)}-legacy-section`, type: "free", label: "CANCIONES", position: 0, isEnabled: true, items: [...playlist.items].sort((a, b) => a.position - b.position).map((item, position) => ({ ...item, position })) }],
    });
  }
  const setlist = readArray<string>(storage, "coro-os:v1:setlist");
  if (!setlist.every((id) => typeof id === "string")) throw new Error("El set antiguo no tiene un formato válido.");
  if (setlist.length) legacySets.push({
    id: "legacy-quick-set", name: "Set histórico recuperado", type: "playlist", createdAt: "1970-01-01T00:00:00.000Z", updatedAt: "1970-01-01T00:00:00.000Z", isArchived: false,
    sections: [{ id: "legacy-quick-section", type: "free", label: "CANCIONES", position: 0, isEnabled: true, items: setlist.map((songId, position) => ({ id: `legacy-quick-item-${position}`, songId, position })) }],
  });

  const sets: CoroSet[] = [];
  const setsById = new Map<string, CoroSet>();
  for (const [origin, source] of [["current", readArray<CoroSet>(storage, "coro-cumbres:sets")], ["legacy", legacySets]] as const) {
    const own = mappings[origin];
    const fallback = mappings[origin === "current" ? "legacy" : "current"];
    for (const original of source) {
      if (!original || typeof original.id !== "string" || !Array.isArray(original.sections)) throw new Error("Una playlist del respaldo no tiene un formato válido.");
      let set: CoroSet = { ...original, sections: original.sections.map((section) => ({ ...section, items: section.items.map((item) => ({ ...item, songId: own.get(item.songId) ?? fallback.get(item.songId) ?? item.songId })) })) };
      const existing = setsById.get(set.id);
      if (existing && canonical(existing) !== canonical(set)) {
        const stem = `${set.id.slice(0, 235)}-local-${await digest(set)}`;
        let id = stem;
        let suffix = 1;
        while (setsById.has(id) && canonical({ ...setsById.get(id), id: original.id }) !== canonical(set)) id = `${stem}-${suffix++}`;
        set = { ...set, id };
      }
      if (!setsById.has(set.id)) { setsById.set(set.id, set); sets.push(set); }
    }
  }
  return { songs, sets };
}
