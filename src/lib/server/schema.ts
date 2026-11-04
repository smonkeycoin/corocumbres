import "server-only";
import { z } from "zod";
import type { WorkspaceState } from "../v2-types";
import { HttpError } from "./http";

export const massIdSchema = z.enum(["ninos", "dominical-12", "dominical-1330", "noche"]);
const id = z.string().min(1).max(300);
const text = z.string().max(100_000);
const position = z.number().int().min(0).max(10_000);
const timestamp = z.string().min(1).max(100);
const moment = z.enum(["entrance", "kyrie", "gloria", "psalm", "gospel_acclamation", "offertory", "sanctus", "memorial_acclamation", "amen", "our_father", "peace", "agnus_dei", "communion", "thanksgiving", "recessional"]);

const lineSchema = z.object({
  id,
  lyrics: text,
  chords: z.array(z.object({ symbol: z.string().max(100), position }).strict()).max(1000),
}).strict();

const songSectionSchema = z.object({
  id,
  type: z.enum(["verse", "chorus", "bridge", "intro", "outro", "other"]),
  label: z.string().max(300),
  lines: z.array(lineSchema).max(2000).optional(),
  slides: z.array(z.array(text).max(2000)).max(2000),
}).strict();

export const songSchema = z.object({
  id,
  title: z.string().min(1).max(500),
  subtitle: z.string().max(1000).optional(),
  category: z.string().max(300).optional(),
  tags: z.array(z.string().max(300)).max(100),
  liturgicalMoments: z.array(moment).max(100).optional(),
  source: z.string().max(3000).optional(),
  notes: text.optional(),
  sections: z.array(songSectionSchema).max(200),
  createdAt: timestamp,
  updatedAt: timestamp,
}).strict();

export const setSchema = z.object({
  id,
  name: z.string().min(1).max(500),
  type: z.enum(["playlist", "mass", "sunday_mass"]),
  date: z.string().max(100).optional(),
  notes: text.optional(),
  sections: z.array(z.object({
    id,
    type: z.union([moment, z.literal("free")]),
    label: z.string().max(300),
    position,
    isEnabled: z.boolean().optional(),
    items: z.array(z.object({ id, songId: id, position, note: text.optional() }).strict()).max(1000),
  }).strict()).max(100),
  createdAt: timestamp,
  updatedAt: timestamp,
  createdBy: z.string().max(500).optional(),
  isArchived: z.boolean(),
  shareId: id.optional(),
}).strict();

const snapshotSchema = z.object({
  massId: massIdSchema,
  revision: z.number().int().nonnegative(),
  publishedAt: timestamp,
  items: z.array(z.object({ id, songId: id, title: z.string().max(500), moment: z.string().max(300), lyrics: text }).strict()).max(1000),
}).strict();

const assignmentsSchema = z.object({
  ninos: id.nullable(),
  "dominical-12": id.nullable(),
  "dominical-1330": id.nullable(),
  noche: id.nullable(),
}).strict();

const publishedSchema = z.object({
  ninos: snapshotSchema.nullable(),
  "dominical-12": snapshotSchema.nullable(),
  "dominical-1330": snapshotSchema.nullable(),
  noche: snapshotSchema.nullable(),
}).strict();

export const workspaceSchema = z.object({
  schemaVersion: z.literal(2),
  revision: z.number().int().nonnegative(),
  songs: z.array(songSchema).max(5000),
  sets: z.array(setSchema).max(1000),
  assignments: assignmentsSchema,
  published: publishedSchema,
  publicationSources: assignmentsSchema.optional(),
}).strict();

const etag = z.string().min(1).max(300);
export const saveRequestSchema = z.object({
  etag,
  state: workspaceSchema.partial().refine((value) => value.songs || value.sets || value.assignments, "No editable data"),
}).strict();
export const publishRequestSchema = z.object({ etag, massId: massIdSchema, setId: id }).strict();
export const importRequestSchema = z.object({
  etag,
  songs: z.array(songSchema).max(5000).default([]),
  sets: z.array(setSchema).max(1000).default([]),
}).strict();

function unique(values: string[], label: string) {
  if (new Set(values).size !== values.length) {
    throw new HttpError(400, `Hay identificadores duplicados en ${label}.`, "DUPLICATE_ID");
  }
}

export function validateWorkspace(value: unknown): WorkspaceState {
  const state = workspaceSchema.parse(value);
  unique(state.songs.map((song) => song.id), "el repertorio");
  unique(state.sets.map((set) => set.id), "las playlists");
  const songs = new Set(state.songs.map((song) => song.id));
  for (const set of state.sets) {
    unique(set.sections.map((section) => section.id), "las secciones de la playlist");
    unique(set.sections.flatMap((section) => section.items.map((item) => item.id)), "las canciones de la playlist");
    if (set.sections.some((section) => section.items.some((item) => !songs.has(item.songId)))) {
      throw new HttpError(400, "La playlist contiene una canción que no está en el repertorio.", "MISSING_SONG");
    }
  }
  for (const [massId, setId] of Object.entries(state.assignments)) {
    if (setId && !state.sets.some((set) => set.id === setId && !set.isArchived)) {
      throw new HttpError(400, "La misa debe estar asignada a una playlist activa.", "INVALID_ASSIGNMENT");
    }
    const snapshot = state.published[massId as keyof typeof state.published];
    if (snapshot && snapshot.massId !== massId) throw new HttpError(400, "Publicación inválida.", "INVALID_PUBLICATION");
  }
  return state;
}
