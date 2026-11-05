import test from "node:test";
import assert from "node:assert/strict";
import { readAllPages } from "../src/lib/cloud-pagination";

test("long playlists retain all items beyond PostgREST's embed limit", async () => {
  const expected = Array.from({ length: 1305 }, (_, id) => ({ id, playlist_id: "mass" }));
  const actual = await readAllPages(async (offset, limit) => ({ rows: expected.slice(offset, offset + limit), total: expected.length }));
  assert.deepEqual(actual, expected);
});

test("a smaller server cap does not truncate or skip playlist items", async () => {
  const expected = Array.from({ length: 305 }, (_, id) => id);
  const actual = await readAllPages(async (offset, limit) => ({ rows: expected.slice(offset, offset + Math.min(100, limit)), total: expected.length }));
  assert.deepEqual(actual, expected);
});

test("incomplete pages with remaining rows fail closed instead of becoming editable data", async () => {
  await assert.rejects(readAllPages(async offset => ({ rows: offset === 0 ? [1] : [], total: 2 })), /cambió durante la lectura/);
});
