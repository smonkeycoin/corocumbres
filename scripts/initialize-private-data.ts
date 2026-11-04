/** One-time, additive deployment bootstrap. Never publishes a playlist. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { getStorageNamespace, readWorkspace, saveWorkspace } from "../src/lib/server/workspace";
import { seedSongs } from "../src/lib/seed-songs";
async function run() {
  assert.equal(getStorageNamespace(), "coro-v2", "Refuse a test namespace.");
  assert.ok(!process.env.CORO_DATA_FILE, "Refuse local-file storage.");
  const before = await readWorkspace();
  const after = before.etag === "missing"
    ? await saveWorkspace({ songs: before.state.songs }, before.etag, "deployment-initialization")
    : before;
  const readback = await readWorkspace();
  assert.equal(readback.etag, after.etag);
  for (const song of seedSongs) assert.deepEqual(readback.state.songs.find(candidate => candidate.id === song.id), song);
  const fingerprint = createHash("sha256").update(JSON.stringify(seedSongs)).digest("hex");
  console.log(JSON.stringify({ status: "PASS", initialized: before.etag === "missing", historicalSongsPreserved: seedSongs.length,
    totalSongs: readback.state.songs.length, totalSets: readback.state.sets.length,
    publishedMasses: Object.values(readback.state.published).filter(Boolean).length,
    revision: readback.state.revision, sourceFingerprint: fingerprint }, null, 2));
}
run().catch(error => { console.error(JSON.stringify({status:"FAIL",code:error.code ?? error.name}));process.exitCode=1; });
