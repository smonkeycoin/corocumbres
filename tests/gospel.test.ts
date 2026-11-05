import test from "node:test";
import assert from "node:assert/strict";
import { getGospelTitle, getSundayDate } from "../src/lib/gospel";
import { getSunday, getTargetSunday } from "../src/lib/sunday-gospel";

test("new public API delegates date selection to the preserved calendar", () => {
  for (const instant of ["2026-11-09T04:59:59Z", "2026-11-09T05:00:00Z", "2026-12-28T05:00:00Z"]) {
    assert.equal(getSundayDate(new Date(instant)), getTargetSunday(new Date(instant)));
  }
});

test("unknown calendar dates never fabricate or reuse a Gospel", async () => {
  assert.equal(await getGospelTitle("2030-01-06"), null);
  assert.equal(await getGospelTitle("2026-02-30"), null);
  assert.equal(await getGospelTitle("2026-11-09"), null);
  assert.equal(getSunday("2026-11-08")?.short_title, "Las diez vírgenes y sus lámparas");
});
