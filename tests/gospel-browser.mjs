/**
 * Gospel E2E against a LOCAL fixture server only. Start Next dev with:
 * AUTH_SECRET=coro-gospel-qa-secret-no-production AUTH_GOOGLE_ID=fixture-google-id
 * AUTH_GOOGLE_SECRET=fixture-google-secret CORO_ADMIN_EMAILS=admin@example.test
 * NEXTAUTH_URL=http://127.0.0.1:3108 CORO_DATA_FILE=/private/tmp/coro-gospel-qa/workspace.json
 * Then: AUTH_SECRET=coro-gospel-qa-secret-no-production node tests/gospel-browser.mjs
 * Signed offline Google claims test authorization; this does not test live Google OAuth.
 */
import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { chromium } from "playwright";

const require = createRequire(import.meta.url);
const { encode } = require("next-auth/jwt");
const baseURL = process.env.CORO_QA_URL || "http://127.0.0.1:3108";
const url = new URL(baseURL);
assert.ok(["localhost", "127.0.0.1"].includes(url.hostname) && url.protocol === "http:", "Fixture writes must remain on local HTTP.");
const secret = process.env.AUTH_SECRET;
assert.equal(secret, "coro-gospel-qa-secret-no-production", "Use the disposable fixture secret, never a production credential.");
const output = path.resolve(process.env.CORO_QA_OUTPUT || "qa/gospel");
const calendar = JSON.parse(await readFile(new URL("../src/data/evangelios-dominicales.json", import.meta.url), "utf8"));
const canonical = new Map(calendar.map((record) => [record.sunday_date, record]));
await mkdir(output, { recursive: true });
const report = {
  baseURL,
  startedAt: new Date().toISOString(),
  authentication: "Offline signed NextAuth fixture sessions; live Google OAuth was not exercised.",
  scope: "Local isolated fixture server and data only; no production writes.",
  tests: [], screenshots: [], pageErrors: [], hydrationErrors: [],
};
const browserPath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || [
  "/Users/smonkeycoin/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
  "/Users/smonkeycoin/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
].find(existsSync);
const browser = await chromium.launch({ headless: true, ...(browserPath ? { executablePath: browserPath } : {}) });
const contexts = [];
let adminContext;
let edited = false;
const editedDate = "2026-11-08";

async function saveReport() { await writeFile(path.join(output, "browser.json"), JSON.stringify(report, null, 2) + "\n"); }
async function step(name, action) {
  const started = Date.now();
  try {
    const details = await action();
    report.tests.push({ name, status: "PASS", durationMs: Date.now() - started, ...(details ? { details } : {}) });
    console.log(`PASS ${name}`);
  } catch (error) {
    report.tests.push({ name, status: "FAIL", durationMs: Date.now() - started, error: String(error.message || error) });
    console.error(`FAIL ${name}: ${String(error.message || error)}`);
    throw error;
  } finally { await saveReport(); }
}
async function context(options = {}) {
  const value = await browser.newContext({ baseURL, viewport: { width: 1440, height: 1000 }, timezoneId: "America/Cancun", ...options });
  value.setDefaultTimeout(20_000);
  value.setDefaultNavigationTimeout(60_000);
  value.on("page", (page) => {
    page.on("pageerror", (error) => report.pageErrors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error" && /hydration|hydrating|did not match|server rendered/i.test(message.text())) report.hydrationErrors.push(message.text());
    });
  });
  contexts.push(value);
  return value;
}
async function identity(value, email) {
  const token = await encode({ secret, maxAge: 3600, token: { email, name: "Fixture Gospel QA", authProvider: "google", googleVerified: true, googleSubject: `fixture-${email}` } });
  await value.addCookies([{ name: "next-auth.session-token", value: token, url: baseURL, httpOnly: true, secure: false, sameSite: "Lax" }]);
}
async function eventually(check, message, timeout = 20_000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    if (await check()) return;
    await new Promise((resolve) => setTimeout(resolve, 75));
  }
  assert.fail(message);
}
async function expectGospel(page, sunday, title, today = false) {
  const block = page.locator(".v2-sunday-gospel");
  await block.waitFor();
  await eventually(async () => await block.getAttribute("data-sunday") === sunday && await page.locator(".v2-gospel-title").innerText() === title, `Expected ${sunday}: ${title}; received ${await block.innerText()}`);
  const label = await page.locator(".v2-gospel-label").innerText();
  assert.match(label, today ? /^EVANGELIO DE HOY/ : /^EVANGELIO DEL PRÓXIMO DOMINGO/);
  assert.equal(await block.locator("time").getAttribute("datetime"), sunday);
  assert.equal(await block.getAttribute("aria-live"), "polite");
  assert.doesNotMatch(await block.innerText(), /\b(?:Mt|Mc|Lc|Jn)\s+\d/);
}
async function layout(page, width) {
  await page.setViewportSize({ width, height: width < 500 ? 844 : 1000 });
  assert.equal(await page.locator("a.v2-mass-card").count(), 4);
  assert.deepEqual(await page.locator("a.v2-mass-card").evaluateAll((links) => links.map((link) => link.getAttribute("href"))), ["/misa/ninos", "/misa/dominical-12", "/misa/dominical-1330", "/misa/noche"]);
  assert.equal(await page.locator(".v2-hero-description").innerText(), "Música que nos une en la fe.");
  assert.equal(await page.locator(".v2-public-header a[href='/admin']").count(), 1);
  assert.equal(await page.locator(".v2-public-header a[href='/']").count(), 1);
  assert.equal(await page.getByRole("button", { name: "Guardar título", exact: true }).count(), 0);
  assert.ok(await page.locator(".v2-hero-description").evaluate((element) => element.nextElementSibling?.classList.contains("v2-sunday-gospel")));
  const dimensions = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
  assert.ok(dimensions.scroll <= dimensions.width + 1, `Horizontal overflow at ${width}px: ${dimensions.scroll}`);
  return dimensions;
}
async function screenshot(page, filename) {
  await page.screenshot({ path: path.join(output, filename), fullPage: true, animations: "disabled", style: "nextjs-portal { display:none !important; }" });
  report.screenshots.push(filename);
}
async function editor(value, date = editedDate) {
  const response = await value.request.get(`/api/admin/gospel?date=${date}`);
  assert.equal(response.status(), 200, await response.text());
  return response.json();
}
async function put(value, data, origin = baseURL) {
  return value.request.put("/api/admin/gospel", { headers: { Origin: origin }, data });
}

try {
  const anonymous = await context();
  adminContext = await context();
  await identity(adminContext, "admin@example.test");
  const stranger = await context();
  await identity(stranger, "stranger@example.test");

  await step("Anonymous public read succeeds; anonymous and non-admin Google identities cannot read or edit admin gospel", async () => {
    const publicResponse = await anonymous.request.get(`/api/public/gospel?date=${editedDate}`);
    assert.equal(publicResponse.status(), 200);
    const publicData = await publicResponse.json();
    assert.deepEqual(Object.keys(publicData).sort(), ["short_title", "sunday_date"]);
    assert.equal(publicData.short_title, canonical.get(editedDate).short_title);
    assert.equal((await anonymous.request.get(`/api/admin/gospel?date=${editedDate}`)).status(), 401);
    assert.equal((await put(anonymous, {})).status(), 401);
    assert.equal((await stranger.request.get(`/api/admin/gospel?date=${editedDate}`)).status(), 403);
    assert.equal((await put(stranger, {})).status(), 403);
    assert.equal((await anonymous.request.put("/api/public/gospel", { data: {} })).status(), 405);
    const denied = await anonymous.newPage();
    await denied.goto("/admin/configuracion");
    assert.equal(new URL(denied.url()).pathname, "/login");
    await denied.close();
    return { anonymousGET: 401, anonymousPUT: 401, strangerGET: 403, strangerPUT: 403, publicPUT: 405 };
  });

  const page = await anonymous.newPage();
  for (const [date, sunday, today] of [["2026-11-05", "2026-11-08", false], ["2026-11-08", "2026-11-08", true], ["2026-11-09", "2026-11-15", false], ["2026-11-15", "2026-11-15", true], ["2026-11-16", "2026-11-22", false]]) {
    await step(`Public home on ${date} renders ${sunday}${today ? " as EVANGELIO DE HOY" : ""}`, async () => {
      await page.clock.setFixedTime(new Date(`${date}T17:00:00Z`));
      await page.goto("/");
      await expectGospel(page, sunday, canonical.get(sunday).short_title, today);
      return { sunday, title: await page.locator(".v2-gospel-title").innerText() };
    });
  }

  await step("The editorial block preserves four mass cards and navigation at 320, 390, 768 and 1440 pixels", async () => {
    await page.clock.setFixedTime(new Date("2026-11-05T17:00:00Z"));
    await page.goto("/");
    await expectGospel(page, editedDate, canonical.get(editedDate).short_title);
    const dimensions = [];
    for (const width of [320, 390, 768, 1440]) {
      dimensions.push(await layout(page, width));
      if (width === 390) await screenshot(page, "mobile.png");
      if (width === 1440) await screenshot(page, "desktop.png");
    }
    return dimensions;
  });

  for (const timezoneId of ["America/Los_Angeles", "Europe/Madrid", "Asia/Tokyo"]) {
    await step(`A device in ${timezoneId} still uses Cancun Sunday before 05:00 UTC`, async () => {
      const remoteDevice = await context({ timezoneId });
      const remotePage = await remoteDevice.newPage();
      await remotePage.clock.setFixedTime(new Date("2026-11-09T04:30:00Z"));
      await remotePage.goto("/");
      await expectGospel(remotePage, editedDate, canonical.get(editedDate).short_title, true);
      await remoteDevice.close();
    });
  }

  await step("An already open page advances from Sunday to Monday without reload at Cancun midnight", async () => {
    const clockContext = await context({ timezoneId: "Asia/Tokyo" });
    const livePage = await clockContext.newPage();
    let documentLoads = 0;
    livePage.on("request", (request) => { if (request.isNavigationRequest() && request.resourceType() === "document") documentLoads++; });
    await livePage.clock.install({ time: new Date("2026-11-08T20:00:00Z") });
    await livePage.goto("/");
    await expectGospel(livePage, editedDate, canonical.get(editedDate).short_title, true);
    await livePage.clock.pauseAt(new Date("2026-11-09T04:59:59.900Z"));
    await expectGospel(livePage, editedDate, canonical.get(editedDate).short_title, true);
    await livePage.clock.runFor(250);
    await expectGospel(livePage, "2026-11-15", canonical.get("2026-11-15").short_title);
    assert.equal(documentLoads, 1, "Weekly update must not reload the page");
    await livePage.clock.resume();
    await clockContext.close();
    return { documentLoads, before: editedDate, after: "2026-11-15", boundaryUTC: "2026-11-09T05:00:00Z" };
  });

  await step("Unknown 2029 Sunday shows a truthful fallback without inventing a gospel", async () => {
    await page.clock.setFixedTime(new Date("2029-01-01T17:00:00Z"));
    await page.goto("/");
    await expectGospel(page, "2029-01-07", "Nos preparamos para escuchar la Palabra.");
    const result = await anonymous.request.get("/api/public/gospel?date=2029-01-07");
    assert.equal(result.status(), 200);
    assert.deepEqual(await result.json(), { sunday_date: "2029-01-07", short_title: null });
  });

  await step("Verified local calendar remains available when the optional title API fails", async () => {
    const offlineContext = await context();
    const offlinePage = await offlineContext.newPage();
    await offlinePage.clock.setFixedTime(new Date("2026-11-09T17:00:00Z"));
    await offlinePage.route("**/api/public/gospel?*", (route) => route.abort());
    await offlinePage.goto("/");
    await expectGospel(offlinePage, "2026-11-15", canonical.get("2026-11-15").short_title);
    await offlineContext.close();
  });

  let beforeEdit;
  let saved;
  const customTitle = "Esperamos a Jesús con las lámparas encendidas";
  await step("An allowlisted Google admin edits the short title through Configuración", async () => {
    beforeEdit = await editor(adminContext);
    const admin = await adminContext.newPage();
    await admin.clock.setFixedTime(new Date("2026-11-05T17:00:00Z"));
    await admin.goto("/admin/configuracion");
    await admin.getByRole("heading", { name: "Evangelio dominical", exact: true }).waitFor();
    await admin.getByLabel("Domingo", { exact: true }).selectOption(editedDate);
    await admin.getByLabel("Título corto", { exact: true }).waitFor();
    assert.equal(await admin.getByLabel("Título corto", { exact: true }).inputValue(), beforeEdit.record.short_title);
    await admin.getByLabel("Título corto", { exact: true }).fill(customTitle);
    const result = admin.waitForResponse((response) => new URL(response.url()).pathname === "/api/admin/gospel" && response.request().method() === "PUT");
    await admin.getByRole("button", { name: "Guardar título", exact: true }).click();
    const response = await result;
    assert.equal(response.status(), 200, await response.text());
    saved = await response.json();
    edited = true;
    await admin.getByText("Título guardado. Ya está disponible en el portal.", { exact: true }).waitFor();
    assert.equal(saved.record.short_title, customTitle);
    assert.deepEqual({ ...saved.record, short_title: beforeEdit.record.short_title }, beforeEdit.record);
    assert.notEqual(saved.etag, beforeEdit.etag);
    await screenshot(admin, "admin.png");
    return { changedField: "short_title", sunday: saved.record.sunday_date, cycle: saved.record.cycle, reference: saved.record.gospel_reference };
  });

  await step("A separate public browser sees the saved title without authentication", async () => {
    const independent = await context();
    assert.equal((await independent.cookies()).length, 0);
    const independentPage = await independent.newPage();
    await independentPage.clock.setFixedTime(new Date("2026-11-05T17:00:00Z"));
    await independentPage.goto("/");
    await expectGospel(independentPage, editedDate, customTitle);
    const response = await independent.request.get(`/api/public/gospel?date=${editedDate}`);
    assert.deepEqual(await response.json(), { sunday_date: editedDate, short_title: customTitle });
    await independent.close();
  });

  await step("Stale edits, forged liturgical metadata and cross-origin writes are rejected", async () => {
    const stale = await put(adminContext, { sunday_date: editedDate, short_title: "Título desactualizado", etag: beforeEdit.etag });
    assert.equal(stale.status(), 409);
    for (const field of ["cycle", "gospel_reference", "liturgical_year", "celebration"]) {
      const forged = await put(adminContext, { sunday_date: editedDate, short_title: customTitle, etag: saved.etag, [field]: "FORGED" });
      assert.equal(forged.status(), 400, field);
    }
    const forgedDate = await put(adminContext, { sunday_date: "2026-11-09", short_title: customTitle, etag: saved.etag });
    assert.equal(forgedDate.status(), 400);
    const foreign = await put(adminContext, { sunday_date: editedDate, short_title: "Cross-origin", etag: saved.etag }, "https://untrusted.example");
    assert.equal(foreign.status(), 403);
    assert.deepEqual((await editor(adminContext)).record, saved.record);
    return { staleETag: 409, forgedMetadata: 400, nonSundayDate: 400, crossOrigin: 403 };
  });

  await step("The browser has no runtime or SSR hydration errors", async () => {
    assert.deepEqual(report.pageErrors, []);
    assert.deepEqual(report.hydrationErrors, []);
  });
} finally {
  if (edited && adminContext) {
    try {
      const current = await editor(adminContext);
      const restored = await put(adminContext, { sunday_date: editedDate, short_title: canonical.get(editedDate).short_title, etag: current.etag });
      assert.equal(restored.status(), 200);
      report.fixtureCleanup = "Restored the canonical title in the isolated local fixture.";
    } catch (error) {
      report.fixtureCleanup = `Local fixture restore failed: ${error.message}`;
      process.exitCode = 1;
    }
  }
  report.finishedAt = new Date().toISOString();
  report.status = report.tests.some((result) => result.status === "FAIL") || process.exitCode ? "FAIL" : "PASS";
  await saveReport();
  await Promise.allSettled(contexts.map((value) => value.close()));
  await browser.close();
}
