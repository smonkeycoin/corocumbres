import "server-only";
import { isAbsolute } from "node:path";
import { HttpError } from "./http";

/** Preserve the existing editorial objects, independently from songs/playlists in Supabase. */
export function getStorageNamespace() {
  const prefix = process.env.CORO_BLOB_TEST_PREFIX;
  if (process.env.NODE_ENV === "production" || !prefix) return "coro-v2";
  if (!/^qa\/[a-z0-9-]{1,100}$/.test(prefix)) throw new HttpError(500, "El espacio aislado de pruebas no es válido.", "INVALID_TEST_NAMESPACE");
  return prefix;
}

export function getStorageConfigurationStatus() {
  const file = process.env.CORO_DATA_FILE;
  if (process.env.NODE_ENV !== "production" && file && isAbsolute(file)) return { ready: true, mode: "local-development" as const };
  return { ready: Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID), mode: "private-blob" as const };
}
