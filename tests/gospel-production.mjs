/**
 * Production smoke verification. Run only after the intended deployment is READY:
 * node tests/gospel-production.mjs
 * No credentials, OAuth login or authorized mutations are used. PUT probes are
 * unauthenticated authorization/method-rejection checks with the canonical title.
 */
import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const baseURL = "https://corocumbres.online";
const output = path.resolve("qa/gospel/production");
const calendar = JSON.parse(await readFile(new URL("../src/data/evangelios-dominicales.json", import.meta.url), "utf8"));
const canonical = new Map(calendar.map((record) => [record.sunday_date, record]));
await mkdir(output, { recursive: true });
const report = {
  baseURL,
  startedAt: new Date().toISOString(),
  scope: "Anonymous production smoke checks; no tokens, OAuth login or authorized mutations.",
  tests: [], screenshots: [], pageErrors: [], hydrationErrors: [],
};
const browserPath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || [
  "/Users/smonkeycoin/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
  "/Users/smonkeycoin/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
].find(existsSync);
const browser = await chromium.launch({ headless: true, ...(browserPath ? { executablePath: browserPath } : {}) });
const contexts = [];

function targetSunday(now) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Cancun", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const part = (key) => parts.find((entry) => entry.type === key).value;
  const today = `${part("year")}-${part("month")}-${part("day")}`;
  const date = new Date(`${today}T12:00:00Z`);
  while (date.getUTCDay() !== 0) date.setUTCDate(date.getUTCDate() + 1);
  return { today, sunday: date.toISOString().slice(0, 10) };
}
function escapedHTML(value) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");
}
async function saveReport() { await writeFile(path.join(output, "report.json"), JSON.stringify(report, null, 2) + "\n"); }
async function step(name, action) {
  const start = Date.now();
  try {
    const details = await action();
    report.tests.push({ name, status: "PASS", durationMs: Date.now() - start, ...(details ? { details } : {}) });
    console.log(`PASS ${name}`);
  } catch (error) {
    report.tests.push({ name, status: "FAIL", durationMs: Date.now() - start, error: String(error.message || error) });
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
async function eventually(check, message) {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    if (await check()) return;
    await new Promise((resolve) => setTimeout(resolve, 75));
  }
  assert.fail(message);
}
async function expectGospel(page, sunday, title, today) {
  const block = page.locator(".v2-sunday-gospel");
  await block.waitFor();
  await eventually(async () => await block.getAttribute("data-sunday") === sunday && await page.locator(".v2-gospel-title").innerText() === title, `Expected ${sunday}: ${title}`);
  assert.match(await page.locator(".v2-gospel-label").innerText(), today ? /^EVANGELIO DE HOY/ : /^EVANGELIO DEL PRÓXIMO DOMINGO/);
  assert.equal(await block.locator("time").getAttribute("datetime"), sunday);
  assert.doesNotMatch(await block.innerText(), /\b(?:Mt|Mc|Lc|Jn)\s+\d/);
}
async function noSession(value) {
  assert.ok(!(await value.cookies()).some((cookie) => /session-token/i.test(cookie.name)), "Smoke checks must never carry an authenticated session.");
}
async function capture(page, name) {
  await page.screenshot({ path: path.join(output, name), fullPage: true, animations: "disabled" });
  report.screenshots.push(name);
}

try {
  const anonymous = await context();
  const current = targetSunday(new Date());
  let currentTitle;
  let adminStatus;

  await step("Current public API and server-rendered HTML show the current Cancun Sunday", async () => {
    const response = await anonymous.request.get("/api/public/gospel");
    assert.equal(response.status(), 200);
    const data = await response.json();
    assert.deepEqual(Object.keys(data).sort(), ["short_title", "sunday_date"]);
    assert.equal(data.sunday_date, current.sunday);
    assert.ok(data.short_title === null || typeof data.short_title === "string" && data.short_title.length <= 100);
    currentTitle = data.short_title || "Nos preparamos para escuchar la Palabra.";
    const home = await anonymous.request.get("/");
    assert.equal(home.status(), 200);
    const html = await home.text();
    assert.ok(html.includes(`data-sunday="${current.sunday}"`));
    assert.ok(html.includes(escapedHTML(currentTitle)), "SSR must include the same title returned by the public API");
    assert.ok(html.includes("Música que nos une en la fe."));
    report.currentGospel = { today: current.today, sunday: current.sunday, title: currentTitle };
    return report.currentGospel;
  });

  await step("Dated public reads return November 8 and 15; unknown 2029 Sunday returns null", async () => {
    for (const sunday of ["2026-11-08", "2026-11-15"]) {
      const response = await anonymous.request.get(`/api/public/gospel?date=${sunday}`);
      assert.equal(response.status(), 200);
      assert.deepEqual(await response.json(), { sunday_date: sunday, short_title: canonical.get(sunday).short_title });
    }
    const missing = await anonymous.request.get("/api/public/gospel?date=2029-01-07");
    assert.equal(missing.status(), 200);
    assert.deepEqual(await missing.json(), { sunday_date: "2029-01-07", short_title: null });
  });

  await step("Administrative endpoints reject unauthenticated requests and the public endpoint rejects writes", async () => {
    await noSession(anonymous);
    const get = await anonymous.request.get("/api/admin/gospel?date=2026-11-08");
    adminStatus = get.status();
    assert.ok([401, 403, 503].includes(adminStatus));
    await noSession(anonymous);
    // No credentials are supplied. Authorization runs before parsing or storage.
    const put = await anonymous.request.put("/api/admin/gospel", {
      headers: { Origin: baseURL },
      data: { sunday_date: "2026-11-08", short_title: canonical.get("2026-11-08").short_title, etag: "missing" },
    });
    assert.ok([401, 403, 503].includes(put.status()));
    const publicPut = await anonymous.request.put("/api/public/gospel", { data: {} });
    assert.equal(publicPut.status(), 405);
    const unchanged = await anonymous.request.get("/api/public/gospel?date=2026-11-08");
    assert.deepEqual(await unchanged.json(), { sunday_date: "2026-11-08", short_title: canonical.get("2026-11-08").short_title });
    return { adminGET: adminStatus, adminPUT: put.status(), publicPUT: publicPut.status() };
  });

  await step("Login accurately reflects Google authentication configuration without initiating OAuth", async () => {
    const login = await anonymous.newPage();
    await login.goto("/login");
    const button = login.getByRole("button", { name: "Iniciar sesión con Google", exact: true });
    await button.waitFor();
    const disabled = await button.isDisabled();
    if (adminStatus === 503) {
      assert.equal(disabled, true);
      assert.ok(await login.locator("#login-status").isVisible());
    } else {
      assert.equal(disabled, false);
    }
    await login.close();
    return { googleLoginDisabled: disabled, liveOAuth: "NOT EXECUTED" };
  });

  await step("Anonymous current home preserves the four masses, navigation and mobile layout", async () => {
    const page = await anonymous.newPage();
    await page.goto("/");
    await expectGospel(page, current.sunday, currentTitle, current.today === current.sunday);
    const sizes = [];
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: width < 500 ? 844 : 1000 });
      assert.equal(await page.locator("a.v2-mass-card").count(), 4);
      assert.equal(await page.locator(".v2-public-header a[href='/admin']").count(), 1);
      assert.equal(await page.locator(".v2-public-header a[href='/']").count(), 1);
      assert.equal(await page.locator(".v2-hero-description").innerText(), "Música que nos une en la fe.");
      assert.ok(await page.locator(".v2-hero-description").evaluate((element) => element.nextElementSibling?.classList.contains("v2-sunday-gospel")));
      const dimensions = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
      assert.ok(dimensions.scroll <= dimensions.width + 1, `Overflow at ${width}: ${dimensions.scroll}`);
      sizes.push(dimensions);
      if (width === 390) await capture(page, "mobile.png");
      if (width === 1440) await capture(page, "desktop.png");
    }
    await page.close();
    return sizes;
  });

  await step("Production client advances an open Sunday page to next Sunday at Cancun midnight without reload", async () => {
    const clockContext = await context({ timezoneId: "Asia/Tokyo" });
    const page = await clockContext.newPage();
    let documentLoads = 0;
    page.on("request", (request) => { if (request.isNavigationRequest() && request.resourceType() === "document") documentLoads++; });
    await page.clock.install({ time: new Date("2026-11-08T20:00:00Z") });
    await page.goto("/");
    await expectGospel(page, "2026-11-08", canonical.get("2026-11-08").short_title, true);
    await page.clock.pauseAt(new Date("2026-11-09T04:59:59.900Z"));
    await expectGospel(page, "2026-11-08", canonical.get("2026-11-08").short_title, true);
    await page.clock.runFor(250);
    await expectGospel(page, "2026-11-15", canonical.get("2026-11-15").short_title, false);
    assert.equal(documentLoads, 1);
    await page.clock.resume();
    await clockContext.close();
    return { documentLoads, before: "2026-11-08", after: "2026-11-15", deviceTimezone: "Asia/Tokyo" };
  });

  await step("Production fallback is visible for dates beyond the verified calendar", async () => {
    const future = await context();
    const page = await future.newPage();
    await page.clock.setFixedTime(new Date("2029-01-01T17:00:00Z"));
    await page.goto("/");
    await expectGospel(page, "2029-01-07", "Nos preparamos para escuchar la Palabra.", false);
    await future.close();
  });

  await step("Production has no browser runtime or hydration errors", async () => {
    assert.deepEqual(report.pageErrors, []);
    assert.deepEqual(report.hydrationErrors, []);
  });
} finally {
  report.finishedAt = new Date().toISOString();
  report.status = report.tests.some((result) => result.status === "FAIL") ? "FAIL" : "PASS";
  await saveReport();
  await Promise.allSettled(contexts.map((value) => value.close()));
  await browser.close();
}
