import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getGlobalDispatcher, MockAgent, setGlobalDispatcher } from "undici";
import { getSunday } from "../src/lib/sunday-gospel";
import { gospelTitleRequestSchema, readGospelEditor, readPublicGospel, saveGospelTitle, validateSundayDate } from "../src/lib/server/gospel";
import { HttpError } from "../src/lib/server/http";
import { GET as publicGospel } from "../src/app/api/public/gospel/route";
import { GET as adminGospel, PUT as updateGospel } from "../src/app/api/admin/gospel/route";

const keys = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "CORO_BLOB_TEST_PREFIX", "NODE_ENV", "CORO_DATA_FILE", "BLOB_READ_WRITE_TOKEN", "BLOB_STORE_ID", "AUTH_GOOGLE_ID", "AUTH_GOOGLE_SECRET", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "AUTH_SECRET", "NEXTAUTH_SECRET", "CORO_ADMIN_EMAILS"];
const previousEnvironment = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
let directory: string;
const sunday = "2026-11-08";
const actor = "admin@example.test";

beforeEach(async () => {
  for (const key of keys) delete process.env[key];
  directory = await mkdtemp(join(tmpdir(), "coro-gospel-test-"));
  Object.assign(process.env, { NODE_ENV: "test" });
  process.env.CORO_DATA_FILE = join(directory, "workspace.json");
});

afterEach(async () => {
  for (const key of keys) {
    if (previousEnvironment[key] === undefined) delete process.env[key];
    else process.env[key] = previousEnvironment[key];
  }
  await rm(directory, { recursive: true, force: true });
});

function hasCode(code: string) {
  return (error: unknown) => error instanceof HttpError && error.code === code;
}

test("editorial changes persist independently and never alter the canonical calendar or existing workspace", async () => {
  const original = structuredClone(getSunday(sunday));
  const workspace = "Existing songs and playlists must remain byte-for-byte intact";
  await writeFile(process.env.CORO_DATA_FILE!, workspace);
  const before = await readGospelEditor(sunday);
  assert.equal(before.etag, "missing");
  assert.equal(before.overridden, false);
  const saved = await saveGospelTitle({ sunday_date: sunday, short_title: "  Mantener encendida la esperanza  ", etag: before.etag }, actor);
  assert.equal(saved.record.short_title, "Mantener encendida la esperanza");
  assert.equal(saved.overridden, true);
  assert.notEqual(saved.etag, before.etag);
  assert.deepEqual(await readGospelEditor(sunday), saved);
  assert.deepEqual(getSunday(sunday), original);
  assert.deepEqual({ ...saved.record, short_title: original!.short_title }, original);
  assert.equal(await readFile(process.env.CORO_DATA_FILE!, "utf8"), workspace);
  assert.deepEqual(await readPublicGospel(sunday), { sunday_date: sunday, short_title: saved.record.short_title });
});

test("first-write races have one winner and independent Sundays do not conflict", async () => {
  const results = await Promise.allSettled([
    saveGospelTitle({ sunday_date: sunday, short_title: "Título A", etag: "missing" }, actor),
    saveGospelTitle({ sunday_date: sunday, short_title: "Título B", etag: "missing" }, actor),
  ]);
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  const rejected = results.find((result) => result.status === "rejected");
  assert.ok(rejected && rejected.status === "rejected" && hasCode("REVISION_CONFLICT")(rejected.reason));
  const saved = await readGospelEditor(sunday);
  assert.ok(["Título A", "Título B"].includes(saved.record.short_title));
  await saveGospelTitle({ sunday_date: "2026-11-15", short_title: "Poner nuestros dones al servicio", etag: "missing" }, actor);
  assert.deepEqual(await readGospelEditor(sunday), saved);
  assert.deepEqual((await readdir(`${process.env.CORO_DATA_FILE}.gospel-titles`)).sort(), ["2026-11-08.json", "2026-11-15.json"]);
});

test("stale editors cannot overwrite a saved title", async () => {
  const first = await saveGospelTitle({ sunday_date: sunday, short_title: "Título inicial", etag: "missing" }, actor);
  const latest = await saveGospelTitle({ sunday_date: sunday, short_title: "Título actualizado", etag: first.etag }, actor);
  await assert.rejects(saveGospelTitle({ sunday_date: sunday, short_title: "Edición antigua", etag: first.etag }, actor), hasCode("REVISION_CONFLICT"));
  await assert.rejects(saveGospelTitle({ sunday_date: sunday, short_title: "Creación antigua", etag: "missing" }, actor), hasCode("REVISION_CONFLICT"));
  assert.deepEqual(await readGospelEditor(sunday), latest);
});

test("public API works without authentication and returns only date and short title with no-store", async () => {
  await saveGospelTitle({ sunday_date: sunday, short_title: "Lámparas encendidas para el Señor", etag: "missing" }, actor);
  const response = await publicGospel(new Request(`https://corocumbres.online/api/public/gospel?date=${sunday}`));
  assert.equal(response.status, 200);
  assert.match(response.headers.get("cache-control")!, /no-store/);
  assert.deepEqual(await response.json(), { sunday_date: sunday, short_title: "Lámparas encendidas para el Señor" });
});

test("without storage configuration public reads retain the verified title and administrative writes fail", async () => {
  delete process.env.CORO_DATA_FILE;
  assert.deepEqual(await readPublicGospel(sunday), { sunday_date: sunday, short_title: getSunday(sunday)!.short_title });
  await assert.rejects(readGospelEditor(sunday), hasCode("STORAGE_NOT_CONFIGURED"));
  await assert.rejects(saveGospelTitle({ sunday_date: sunday, short_title: "No guardar", etag: "missing" }, actor), hasCode("STORAGE_NOT_CONFIGURED"));
});

test("a stalled remote read is aborted within the public deadline and returns the canonical title", async () => {
  delete process.env.CORO_DATA_FILE;
  process.env.BLOB_READ_WRITE_TOKEN = "vercel_blob_rw_teststore_test-only-not-a-real-token";
  const previousDispatcher = getGlobalDispatcher();
  const transport = new MockAgent();
  transport.disableNetConnect();
  setGlobalDispatcher(transport);
  transport.get("https://teststore.private.blob.vercel-storage.com")
    .intercept({ path: `/coro-v2/gospel-titles/${sunday}.json?cache=0`, method: "GET" })
    .reply(404, "").delay(2200);
  try {
    const start = performance.now();
    assert.equal((await readPublicGospel(sunday)).short_title, getSunday(sunday)!.short_title);
    const elapsed = performance.now() - start;
    assert.ok(elapsed >= 1900 && elapsed < 3000, `Public fallback arrived in ${elapsed} ms`);
    transport.assertNoPendingInterceptors();
  } finally {
    setGlobalDispatcher(previousDispatcher);
    await transport.close();
  }
});

test("production ignores the local development adapter", async () => {
  await saveGospelTitle({ sunday_date: sunday, short_title: "Solo desarrollo", etag: "missing" }, actor);
  Object.assign(process.env, { NODE_ENV: "production" });
  assert.equal((await readPublicGospel(sunday)).short_title, getSunday(sunday)!.short_title);
  await assert.rejects(readGospelEditor(sunday), hasCode("STORAGE_NOT_CONFIGURED"));
});

test("corrupt storage falls back publicly but cannot be overwritten by the editor", async () => {
  const directory = `${process.env.CORO_DATA_FILE}.gospel-titles`;
  await mkdir(directory);
  const file = join(directory, `${sunday}.json`);
  const corrupt = "{invalid-json";
  await writeFile(file, corrupt);
  assert.equal((await readPublicGospel(sunday)).short_title, getSunday(sunday)!.short_title);
  await assert.rejects(readGospelEditor(sunday), hasCode("GOSPEL_STORAGE_INVALID_DATA"));
  await assert.rejects(saveGospelTitle({ sunday_date: sunday, short_title: "No sobrescribir", etag: "missing" }, actor), hasCode("GOSPEL_STORAGE_INVALID_DATA"));
  assert.equal(await readFile(file, "utf8"), corrupt);
});

test("stored title from another Sunday cannot change the requested date", async () => {
  const saved = await saveGospelTitle({ sunday_date: sunday, short_title: "Título del ocho", etag: "missing" }, actor);
  const file = join(`${process.env.CORO_DATA_FILE}.gospel-titles`, `${sunday}.json`);
  const stored = JSON.parse(await readFile(file, "utf8"));
  stored.sunday_date = "2026-11-15";
  await writeFile(file, JSON.stringify(stored));
  await assert.rejects(readGospelEditor(sunday), hasCode("GOSPEL_STORAGE_INVALID_DATA"));
  assert.notEqual((await readPublicGospel(sunday)).short_title, saved.record.short_title);
});

test("missing calendar records never invent a passage or accept an editorial replacement", async () => {
  const unknown = "2030-01-06";
  assert.equal(validateSundayDate(unknown), unknown);
  assert.deepEqual(await readPublicGospel(unknown), { sunday_date: unknown, short_title: null });
  const response = await publicGospel(new Request(`https://corocumbres.online/api/public/gospel?date=${unknown}`));
  assert.deepEqual(await response.json(), { sunday_date: unknown, short_title: null });
  await assert.rejects(saveGospelTitle({ sunday_date: unknown, short_title: "Inventado", etag: "missing" }, actor), hasCode("GOSPEL_NOT_FOUND"));
});

test("dates are real Sundays and cannot contain traversal or normalized invalid dates", async () => {
  for (const date of ["2026-11-09", "2026-02-30", "2026-11-08T00:00:00Z", "../../workspace", "2026-1-4", ""]) {
    assert.throws(() => validateSundayDate(date), hasCode("INVALID_SUNDAY_DATE"));
    const response = await publicGospel(new Request(`https://corocumbres.online/api/public/gospel?date=${encodeURIComponent(date)}`));
    assert.equal(response.status, 400);
  }
});

test("strict write schema rejects canonical fields and empty, oversized or multiline titles", async () => {
  const input = { sunday_date: sunday, short_title: "Título", etag: "missing" };
  for (const field of ["cycle", "gospel_reference", "celebration", "liturgical_year", "source_url", "updated_by"]) {
    assert.equal(gospelTitleRequestSchema.safeParse({ ...input, [field]: "forged" }).success, false);
  }
  for (const short_title of ["", "   ", "a".repeat(101), "Título\ncon otra línea", "a\u0000b", "<script>alert(1)</script>"]) {
    await assert.rejects(saveGospelTitle({ ...input, short_title }, actor));
  }
  assert.equal((await readGospelEditor(sunday)).overridden, false);
});

test("administrative endpoints fail closed when authentication is unavailable", async () => {
  const read = await adminGospel(new Request(`https://corocumbres.online/api/admin/gospel?date=${sunday}`));
  assert.equal(read.status, 503);
  const write = await updateGospel(new Request("https://corocumbres.online/api/admin/gospel", {
    method: "PUT", headers: { origin: "https://corocumbres.online", "content-type": "application/json" },
    body: JSON.stringify({ sunday_date: sunday, short_title: "No autorizado", etag: "missing" }),
  }));
  assert.equal(write.status, 503);
  assert.equal((await readGospelEditor(sunday)).overridden, false);
});
