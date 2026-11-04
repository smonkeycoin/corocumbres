"use client";

import { createSet, ensureSetStructure, makeFreeSection, makeSetItem } from "./liturgy";
// Repertoire seeds live exclusively on the server. Local storage remains a migration source.
const seedSongs: Song[] = [];
import { CoroSet, Preferences, PresenterState, Song } from "./types";

export const storageKeys = {
  library: "coro-cumbres:songs",
  sets: "coro-cumbres:sets",
  preferences: "coro-cumbres:preferences",
  presenter: "coro-cumbres:presenter"
} as const;

const legacyKeys = {
  library: "coro-os:v1:library",
  setlist: "coro-os:v1:setlist",
  playlists: "coro-os:v1:playlists",
  sets: "coro-os:v1:sets",
  preferences: "coro-os:v1:preferences",
  presenter: "coro-os:v1:presenter"
} as const;

type LegacyPlaylist = {
  id: string;
  name: string;
  description?: string;
  serviceDate?: string;
  items: Array<{ id: string; songId: string; position: number; note?: string }>;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  isArchived: boolean;
  shareId?: string;
};

export const defaultPrefs: Preferences = { schemaVersion: 1, fontScale: 1, theme: "blue", showChords: false };
export const defaultPresenterState: PresenterState = {
  schemaVersion: 1,
  setId: null,
  setItemId: null,
  setSectionId: null,
  sectionLabel: "",
  itemIndex: 0,
  songId: null,
  fullLyrics: "",
  songIndex: 0,
  black: false,
  isBlackout: false,
  theme: "blue",
  showChords: false,
  fontScale: 1
};

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function readJsonWithLegacy<T>(key: string, legacyKey: string, fallback: T): T {
  const current = readJson<T | null>(key, null);
  if (current) return current;
  const legacy = readJson<T | null>(legacyKey, null);
  if (legacy) {
    localStorage.setItem(key, JSON.stringify(legacy));
    return legacy;
  }
  return fallback;
}

function normalizeTheme(theme: unknown): "blue" | "black" {
  return theme === "black" ? "black" : "blue";
}

function normalizePrefs(value: Preferences): Preferences {
  return {
    schemaVersion: 1,
    fontScale: Number.isFinite(value.fontScale) ? Math.min(1, Math.max(0.5, value.fontScale)) : defaultPrefs.fontScale,
    theme: normalizeTheme(value.theme),
    showChords: value.showChords ?? false
  };
}

function normalizePresenterState(value: PresenterState): PresenterState {
  return {
    ...value,
    isBlackout: value.isBlackout ?? value.black ?? false,
    black: value.isBlackout ?? value.black ?? false,
    theme: normalizeTheme(value.theme),
    fontScale: Number.isFinite(value.fontScale) ? Math.min(1, Math.max(0.5, value.fontScale)) : defaultPresenterState.fontScale,
    showChords: value.showChords ?? false
  };
}

function slugTitle(title: string) {
  return title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function hasChordData(song: Song) {
  return song.sections.some((section) => section.lines?.some((line) => line.chords.length));
}

function recoverSeedChordData(songs: Song[]) {
  const seedsById = new Map(seedSongs.map((song) => [song.id, song]));
  const seedsByTitle = new Map(seedSongs.map((song) => [slugTitle(song.title), song]));
  let changed = false;

  const recovered = songs.map((song) => {
    if (hasChordData(song)) return song;
    const seed = seedsById.get(song.id) ?? seedsByTitle.get(slugTitle(song.title));
    if (!seed || !hasChordData(seed)) return song;
    changed = true;
    return {
      ...song,
      sections: seed.sections,
      source: song.source ?? seed.source,
      notes: song.notes ?? seed.notes,
      liturgicalMoments: song.liturgicalMoments ?? seed.liturgicalMoments
    };
  });

  return { songs: recovered, changed };
}

function addMissingSeedSongs(songs: Song[]) {
  const existingIds = new Set(songs.map((song) => song.id));
  const existingTitles = new Set(songs.map((song) => slugTitle(song.title)));
  const missing = seedSongs.filter((song) => !existingIds.has(song.id) && !existingTitles.has(slugTitle(song.title)));
  return missing.length ? { songs: [...songs, ...missing], changed: true } : { songs, changed: false };
}

export function loadLibrary() {
  const songs = readJsonWithLegacy<Song[]>(storageKeys.library, legacyKeys.library, seedSongs);
  const recovered = recoverSeedChordData(songs);
  const merged = addMissingSeedSongs(recovered.songs);
  if (recovered.changed || merged.changed) localStorage.setItem(storageKeys.library, JSON.stringify(merged.songs));
  return merged.songs;
}

export function saveLibrary(songs: Song[]) {
  localStorage.setItem(storageKeys.library, JSON.stringify(songs));
}

function migrateLegacyPlaylist(playlist: LegacyPlaylist): CoroSet {
  return {
    id: playlist.id.replace(/^playlist/, "set"),
    name: playlist.name,
    type: "playlist",
    date: playlist.serviceDate,
    notes: playlist.description,
    sections: [
      makeFreeSection(
        playlist.items
          .sort((a, b) => a.position - b.position)
          .map((item, position) => ({ id: item.id, songId: item.songId, position, note: item.note }))
      )
    ],
    createdAt: playlist.createdAt,
    updatedAt: playlist.updatedAt,
    createdBy: playlist.createdBy,
    isArchived: playlist.isArchived,
    shareId: playlist.shareId
  };
}

function makeQuickSet(ids: string[]): CoroSet {
  const set = createSet("playlist", "Playlist");
  set.id = "set-quick-set";
  set.shareId = "local-quick-set";
  set.sections = [makeFreeSection(ids.map((songId, position) => makeSetItem(songId, position)))];
  return set;
}

export function loadSets() {
  const sets = readJsonWithLegacy<CoroSet[] | null>(storageKeys.sets, legacyKeys.sets, null);
  if (sets) return ensureDefaultSetTypes(sets);

  const legacyPlaylists = readJson<LegacyPlaylist[] | null>(legacyKeys.playlists, null);
  if (legacyPlaylists) {
    const migrated = ensureDefaultSetTypes(legacyPlaylists.map(migrateLegacyPlaylist));
    localStorage.setItem(storageKeys.sets, JSON.stringify(migrated));
    return migrated;
  }

  const oldSetlist = readJson<string[]>(legacyKeys.setlist, []);
  const fallback = [makeQuickSet(oldSetlist), createSet("mass", "Nueva Misa"), createSet("sunday_mass", "Nueva Misa Dominical")];
  localStorage.setItem(storageKeys.sets, JSON.stringify(fallback));
  return fallback;
}

function ensureDefaultSetTypes(sets: CoroSet[]) {
  const additions: CoroSet[] = [];
  const structured = sets.map(ensureSetStructure);
  if (!structured.some((set) => set.type === "playlist")) additions.push(createSet("playlist", "Playlist"));
  if (!structured.some((set) => set.type === "mass")) additions.push(createSet("mass", "Nueva Misa"));
  if (!structured.some((set) => set.type === "sunday_mass")) additions.push(createSet("sunday_mass", "Nueva Misa Dominical"));
  const next = additions.length ? [...structured, ...additions] : structured;
  if (additions.length || JSON.stringify(structured) !== JSON.stringify(sets)) localStorage.setItem(storageKeys.sets, JSON.stringify(next));
  return next;
}

export function saveSets(sets: CoroSet[]) {
  localStorage.setItem(storageKeys.sets, JSON.stringify(sets));
}

export function loadPrefs() {
  const prefs = normalizePrefs(readJsonWithLegacy<Preferences>(storageKeys.preferences, legacyKeys.preferences, defaultPrefs));
  localStorage.setItem(storageKeys.preferences, JSON.stringify(prefs));
  return prefs;
}

export function savePrefs(prefs: Preferences) {
  localStorage.setItem(storageKeys.preferences, JSON.stringify(normalizePrefs(prefs)));
}

export function loadPresenterState() {
  const state = normalizePresenterState(readJsonWithLegacy<PresenterState>(storageKeys.presenter, legacyKeys.presenter, defaultPresenterState));
  localStorage.setItem(storageKeys.presenter, JSON.stringify(state));
  return state;
}

export function savePresenterState(state: PresenterState) {
  const normalized = normalizePresenterState(state);
  localStorage.setItem(storageKeys.presenter, JSON.stringify(normalized));
  localStorage.setItem(`${storageKeys.presenter}:event`, JSON.stringify({ state: normalized, at: Date.now() }));
}

export function validateImport(value: unknown): value is Song[] {
  return (
    Array.isArray(value) &&
    value.every(
      (song) =>
        song &&
        typeof song === "object" &&
        typeof (song as Song).id === "string" &&
        typeof (song as Song).title === "string" &&
        Array.isArray((song as Song).sections)
    )
  );
}

export function validateSetImport(value: unknown): value is CoroSet {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    typeof (value as CoroSet).id === "string" &&
    typeof (value as CoroSet).name === "string" &&
    Array.isArray((value as CoroSet).sections)
  );
}
