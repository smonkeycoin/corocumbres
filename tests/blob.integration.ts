import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { get, list } from "@vercel/blob";
import type { CoroSet, Song } from "../src/lib/types";
import { HttpError } from "../src/lib/server/http";
import { getStorageNamespace, publishPlaylist, readPublicPlaylist, readWorkspace, saveWorkspace } from "../src/lib/server/workspace";

// Manual, credential-bearing integration test. Not part of the default test script.
// node --env-file=.env.local --conditions=react-server --import tsx tests/blob.integration.ts
// It creates only private qa/<unique> records and intentionally retains its audit backups.
// It never initializes, reads, publishes or overwrites coro-v2/workspace.json.

let stage = "configuration";
const etagDiagnostics: Record<string, unknown> = {};
function compareEtags(written: string, read: string) {
  return {
    writeQuoted: written.startsWith('"'), readQuoted: read.startsWith('"'),
    exactMatch: written === read,
    matchWithoutQuotes: written.replace(/^"|"$/g, "") === read.replace(/^"|"$/g, ""),
  };
}

async function run() {
  assert.notEqual(process.env.NODE_ENV, "production", "Run this isolated check outside production mode.");
  assert.ok(process.env.BLOB_READ_WRITE_TOKEN || (process.env.BLOB_STORE_ID && process.env.VERCEL_OIDC_TOKEN), "Existing Blob credentials are required; no credential is generated.");
  Object.assign(process.env, { NODE_ENV: "test" });
  delete process.env.CORO_DATA_FILE;
  const namespace = `qa/coro-v2-${Date.now()}-${randomUUID().slice(0, 8)}`;
  process.env.CORO_BLOB_TEST_PREFIX = namespace;
  assert.equal(getStorageNamespace(), namespace);
  const passed: string[] = [];
  const actor = "isolated-storage-qa";

  stage = "initial-independent-reads";
  const [clientA, clientB] = await Promise.all([readWorkspace(), readWorkspace()]);
  assert.equal(clientA.etag, "missing", "QA namespace must start empty.");
  assert.equal(clientB.etag, "missing", "Independent clients must agree on absence.");
  assert.equal(clientA.state.songs.length, 26, "Historical seeds must be retained.");
  passed.push("independent-consistent-reads");

  const fixtureSong: Song = {
    id: "isolated-qa-song", title: "QA de persistencia", tags: [], notes: "NEVER_PUBLIC_METADATA",
    createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z",
    sections: [{ id: "qa-section", label: "Verso", type: "verse", slides: [["Letra QA publicada"]] }],
  };
  const fixtureSet: CoroSet = {
    id: "isolated-qa-set", name: "QA aislada", type: "playlist", isArchived: false,
    createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z",
    sections: [{ id: "qa-set-section", type: "free", label: "Canciones", position: 0, items: [{ id: "qa-item", songId: fixtureSong.id, position: 0 }] }],
  };
  const writeA = { songs: [...clientA.state.songs, fixtureSong], sets: [fixtureSet] };
  const writeB = { songs: [...clientB.state.songs, fixtureSong], sets: [{ ...fixtureSet, name: "Segundo escritor" }] };
  stage = "first-write-race";
  const contenders = await Promise.allSettled([
    saveWorkspace(writeA, clientA.etag, actor),
    saveWorkspace(writeB, clientB.etag, actor),
  ]);
  assert.equal(contenders.filter((result) => result.status === "fulfilled").length, 1, "Create-only CAS must have exactly one winner.");
  const loser = contenders.find((result) => result.status === "rejected");
  assert.ok(loser && loser.status === "rejected" && loser.reason instanceof HttpError && loser.reason.code === "REVISION_CONFLICT", "The losing writer must receive a conflict.");
  const committed = await readWorkspace();
  const winner = contenders.find((result) => result.status === "fulfilled");
  if (winner?.status === "fulfilled") etagDiagnostics.firstWrite = compareEtags(winner.value.etag, committed.etag);
  assert.equal(committed.state.revision, 1, "Exactly one first revision may commit.");
  assert.equal(committed.state.sets.length, 1, "Only the winning first write must be present.");
  passed.push("real-blob-first-write-cas");

  stage = "read-saved-revision";
  const [editorA, editorB] = await Promise.all([readWorkspace(), readWorkspace()]);
  assert.equal(editorA.etag, editorB.etag, "Different readers must see the same ETag.");
  stage = "overwrite-with-get-etag";
  const revised = await saveWorkspace({ sets: [{ ...editorA.state.sets[0], name: "Edición confirmada" }] }, editorA.etag, actor);
  etagDiagnostics.overwrite = compareEtags(revised.etag, (await readWorkspace()).etag);
  stage = "reject-stale-writer";
  await assert.rejects(saveWorkspace({ sets: [{ ...editorB.state.sets[0], name: "Edición obsoleta" }] }, editorB.etag, actor), (error: unknown) => error instanceof HttpError && error.code === "REVISION_CONFLICT", "Stale writes must be rejected.");
  assert.equal((await readWorkspace()).state.sets[0].name, "Edición confirmada", "The committed edit must remain durable.");
  passed.push("real-blob-stale-write-rejection");

  assert.equal(await readPublicPlaylist("ninos"), null, "An unpublished draft must remain private.");
  stage = "publish-with-put-etag";
  const published = await publishPlaylist("ninos", fixtureSet.id, revised.etag, actor);
  const publicReader = await readPublicPlaylist("ninos");
  assert.equal(publicReader!.items[0].lyrics, "Letra QA publicada", "Another independent read must see the published snapshot.");
  assert.equal(JSON.stringify(publicReader).includes("NEVER_PUBLIC_METADATA"), false, "Private metadata must never enter the snapshot.");
  const draftSongs = structuredClone(published.state.songs);
  draftSongs.find((song) => song.id === fixtureSong.id)!.sections[0].slides = [["Letra QA de borrador"]];
  stage = "edit-published-draft";
  const changed = await saveWorkspace({ songs: draftSongs }, published.etag, actor);
  assert.equal((await readPublicPlaylist("ninos"))!.items[0].lyrics, "Letra QA publicada", "Draft edits must not mutate the public version.");
  stage = "republish-draft";
  const republished = await publishPlaylist("ninos", fixtureSet.id, changed.etag, actor);
  assert.equal((await readPublicPlaylist("ninos"))!.items[0].lyrics, "Letra QA de borrador", "Republishing must atomically update the independent reader.");
  passed.push("cross-request-publication-and-draft-isolation");

  stage = "verify-private-object";
  const stored = await get(`${namespace}/workspace.json`, { access: "private", useCache: false, headers: { "accept-encoding": "identity" } });
  assert.ok(stored && stored.statusCode === 200 && stored.stream, "The real private Blob must exist.");
  assert.ok(new URL(stored.blob.url).hostname.endsWith(".private.blob.vercel-storage.com"), "Storage must be private.");
  assert.equal(stored.blob.etag, republished.etag, "Application ETag must match the real object.");
  stage = "deny-anonymous-direct-blob-read";
  const unauthenticated = await fetch(stored.blob.url, { redirect: "manual" });
  assert.ok([401, 403, 404].includes(unauthenticated.status), "Private storage must deny an unauthenticated fetch.");
  stage = "verify-retained-history";
  const history = await list({ prefix: `${namespace}/history/`, limit: 100 });
  assert.ok(history.blobs.length >= 5, "Each committed update must retain its earlier private state.");
  assert.ok(history.blobs.every((blob) => blob.pathname.startsWith(`${namespace}/history/`)), "Backups must remain inside the isolated namespace.");
  passed.push("private-storage-access-and-history");

  process.stdout.write(`${JSON.stringify({ status: "PASS", namespace, checks: passed, finalRevision: republished.state.revision, privateBackupCount: history.blobs.length, etagDiagnostics, oauthVerified: false }, null, 2)}\n`);
}

run().catch((error: unknown) => {
  // Deliberately omit provider payloads, request URLs and credentials.
  process.stderr.write(`${JSON.stringify({ status: "FAIL", stage, etagDiagnostics, code: error instanceof HttpError ? error.code : error instanceof Error ? error.name : "UnknownError", message: error instanceof HttpError ? error.message : "The isolated integration assertion failed." })}\n`);
  process.exitCode = 1;
});
