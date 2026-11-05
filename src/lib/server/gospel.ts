import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, open, readFile, rename, rm, unlink, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join } from "node:path";
import { BlobPreconditionFailedError, get, put } from "@vercel/blob";
import { z } from "zod";
import { getSunday } from "../sunday-gospel";
import { HttpError } from "./http";
import { getStorageConfigurationStatus, getStorageNamespace } from "./gospel-storage";

const EMPTY_ETAG = "missing";
const MAX_STORED_BYTES = 4096;
const PUBLIC_READ_TIMEOUT_MS = 2000;

/** Reject normalization (Feb 30), weekdays and paths before touching storage. */
export function validateSundayDate(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new HttpError(400, "Selecciona una fecha dominical válida.", "INVALID_SUNDAY_DATE");
  }
  const date = new Date(`${value}T12:00:00.000Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value || date.getUTCDay() !== 0) {
    throw new HttpError(400, "Selecciona una fecha dominical válida.", "INVALID_SUNDAY_DATE");
  }
  return value;
}

const titleSchema = z.string().trim().min(1).max(100).refine((title) => !/[<>\u0000-\u001f\u007f]/.test(title), "Usa un título de una sola línea, sin HTML.");

export const gospelTitleRequestSchema = z.object({
  sunday_date: z.string().transform(validateSundayDate),
  short_title: titleSchema,
  etag: z.string().min(1).max(200),
}).strict();

const storedTitleSchema = z.object({
  schemaVersion: z.literal(1),
  sunday_date: z.string(),
  short_title: titleSchema,
  updated_at: z.iso.datetime(),
  updated_by: z.string().min(1).max(320),
}).strict();

type StoredTitle = z.infer<typeof storedTitleSchema>;
type StoredTitleResponse = { title: StoredTitle | null; etag: string };
type GospelRecord = NonNullable<ReturnType<typeof getSunday>>;
export type GospelEditorResponse = { record: GospelRecord; etag: string; overridden: boolean };
export type PublicGospel = { sunday_date: string; short_title: string | null };

function localTitleFile(sunday: string) {
  const file = process.env.CORO_DATA_FILE;
  return process.env.NODE_ENV !== "production" && file && isAbsolute(file)
    ? join(`${file}.gospel-titles`, `${sunday}.json`) : null;
}

function blobPath(sunday: string) {
  return `${getStorageNamespace()}/gospel-titles/${sunday}.json`;
}

function digest(text: string) {
  return createHash("sha256").update(text).digest("hex");
}

function parseStoredTitle(text: string, sunday: string) {
  try {
    if (Buffer.byteLength(text, "utf8") > MAX_STORED_BYTES) throw new Error("TitleTooLarge");
    const title = storedTitleSchema.parse(JSON.parse(text));
    if (title.sunday_date !== sunday) throw new Error("DateMismatch");
    return title;
  } catch {
    throw new HttpError(503, "El título guardado requiere revisión. No se sobrescribió.", "GOSPEL_STORAGE_INVALID_DATA");
  }
}

async function readLocalTitle(file: string, sunday: string): Promise<StoredTitleResponse> {
  try {
    const text = await readFile(file, "utf8");
    return { title: parseStoredTitle(text, sunday), etag: digest(text) };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return { title: null, etag: EMPTY_ETAG };
    throw error;
  }
}

async function readStoredTitle(sunday: string, abortSignal?: AbortSignal): Promise<StoredTitleResponse> {
  const localFile = localTitleFile(sunday);
  if (localFile) return readLocalTitle(localFile, sunday);
  if (!getStorageConfigurationStatus().ready) {
    throw new HttpError(503, "El almacenamiento editorial todavía no está configurado.", "STORAGE_NOT_CONFIGURED");
  }
  try {
    const response = await get(blobPath(sunday), {
      access: "private", useCache: false, headers: { "accept-encoding": "identity" }, abortSignal,
    });
    if (!response) return { title: null, etag: EMPTY_ETAG };
    if (response.statusCode !== 200 || !response.stream || !response.blob.etag.startsWith('"')) throw new Error("InvalidBlobResponse");
    if (response.blob.size !== null && response.blob.size > MAX_STORED_BYTES) throw new Error("TitleTooLarge");
    return { title: parseStoredTitle(await new Response(response.stream).text(), sunday), etag: response.blob.etag };
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(503, "No pudimos leer el título editorial. Intenta nuevamente.", "GOSPEL_STORAGE_UNAVAILABLE");
  }
}

function projectEditor(record: GospelRecord, stored: StoredTitleResponse): GospelEditorResponse {
  return { record: { ...record, short_title: stored.title?.short_title ?? record.short_title }, etag: stored.etag, overridden: stored.title !== null };
}

function requireSunday(sunday: string) {
  validateSundayDate(sunday);
  const record = getSunday(sunday);
  if (!record) throw new HttpError(404, "Este domingo todavía no está incluido en el calendario.", "GOSPEL_NOT_FOUND");
  return record;
}

/** Public traffic never depends on the availability of optional editorial storage. */
export async function readPublicGospel(sunday: string): Promise<PublicGospel> {
  validateSundayDate(sunday);
  const record = getSunday(sunday);
  const fallback = { sunday_date: sunday, short_title: record?.short_title ?? null };
  if (!record) return fallback;
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const deadline = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(new Error("GospelReadTimeout"));
      }, PUBLIC_READ_TIMEOUT_MS);
    });
    // Race also covers a stalled response body; abort alone only bounds fetch headers.
    const stored = await Promise.race([readStoredTitle(sunday, controller.signal), deadline]);
    return { sunday_date: sunday, short_title: stored.title?.short_title ?? record.short_title };
  } catch {
    return fallback;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function readGospelEditor(sunday: string): Promise<GospelEditorResponse> {
  const record = requireSunday(sunday);
  return projectEditor(record, await readStoredTitle(sunday));
}

function conflict() {
  return new HttpError(409, "Otra persona cambió este título. Recarga su versión antes de guardar.", "REVISION_CONFLICT");
}

/** Only title metadata is persisted; liturgical dates, cycles and passages remain canonical. */
export async function saveGospelTitle(input: unknown, actor: string): Promise<GospelEditorResponse> {
  const { sunday_date: sunday, short_title, etag } = gospelTitleRequestSchema.parse(input);
  const record = requireSunday(sunday);
  const current = await readStoredTitle(sunday);
  if (current.etag !== etag) throw conflict();
  const title = storedTitleSchema.parse({ schemaVersion: 1, sunday_date: sunday, short_title, updated_at: new Date().toISOString(), updated_by: actor });
  const text = JSON.stringify(title);
  const file = localTitleFile(sunday);
  if (file) {
    await mkdir(dirname(file), { recursive: true });
    const lockPath = `${file}.lock`;
    let lock;
    try { lock = await open(lockPath, "wx", 0o600); } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "EEXIST") throw conflict();
      throw error;
    }
    const temporary = `${file}.${randomUUID()}.tmp`;
    try {
      if ((await readLocalTitle(file, sunday)).etag !== etag) throw conflict();
      await writeFile(temporary, text, { flag: "wx", mode: 0o600 });
      await rename(temporary, file);
      return projectEditor(record, { title, etag: digest(text) });
    } finally {
      await rm(temporary, { force: true });
      await lock.close();
      await unlink(lockPath);
    }
  }
  try {
    const result = await put(blobPath(sunday), text, {
      access: "private", addRandomSuffix: false, allowOverwrite: etag !== EMPTY_ETAG,
      ...(etag !== EMPTY_ETAG ? { ifMatch: etag } : {}),
      contentType: "application/json", cacheControlMaxAge: 60,
    });
    return projectEditor(record, { title, etag: result.etag });
  } catch (error) {
    if (error instanceof BlobPreconditionFailedError) throw conflict();
    try {
      if ((await readStoredTitle(sunday)).etag !== etag) throw conflict();
    } catch (readError) {
      if (readError instanceof HttpError && readError.code === "REVISION_CONFLICT") throw readError;
    }
    throw new HttpError(503, "No se pudo guardar el título. Intenta nuevamente.", "GOSPEL_STORAGE_WRITE_FAILED");
  }
}
