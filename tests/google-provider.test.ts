import assert from "node:assert/strict";
import { afterEach, beforeEach, mock, test } from "node:test";
import { getGoogleProviderStatus } from "../src/lib/supabase/google-provider";

const keys = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY"];
const previous = Object.fromEntries(keys.map(key => [key, process.env[key]]));
beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://coro-test.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
});
afterEach(() => {
  mock.restoreAll();
  for (const key of keys) if (previous[key] === undefined) delete process.env[key]; else process.env[key] = previous[key];
});

test("Google is ready only when the actual Auth settings explicitly enable it", async () => {
  mock.method(globalThis, "fetch", async (url: URL, options: RequestInit) => {
    assert.equal(url.href, "https://coro-test.supabase.co/auth/v1/settings");
    assert.equal(options.cache, "no-store");
    assert.ok(options.signal instanceof AbortSignal);
    return Response.json({ external: { google: true } });
  });
  assert.equal(await getGoogleProviderStatus(), "ready");
});

test("public API keys do not imply Google is enabled", async () => {
  mock.method(globalThis, "fetch", async () => Response.json({ external: { google: false } }));
  assert.equal(await getGoogleProviderStatus(), "disabled");
});

test("malformed, rejected and failed settings reads never enable OAuth", async () => {
  for (const result of [Response.json({ external: { google: "true" } }), Response.json({}), new Response("unavailable", { status: 503 })]) {
    mock.method(globalThis, "fetch", async () => result);
    assert.equal(await getGoogleProviderStatus(), "unavailable");
    mock.restoreAll();
  }
  mock.method(globalThis, "fetch", async () => { throw new Error("offline"); });
  assert.equal(await getGoogleProviderStatus(), "unavailable");
});

test("missing project configuration does not contact another project", async () => {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  const request = mock.method(globalThis, "fetch", async () => { throw new Error("must not fetch"); });
  assert.equal(await getGoogleProviderStatus(), "unconfigured");
  assert.equal(request.mock.callCount(), 0);
});
