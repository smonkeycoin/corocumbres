"use client";

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
