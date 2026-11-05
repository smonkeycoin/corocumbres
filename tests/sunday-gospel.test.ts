import test from "node:test";
import assert from "node:assert/strict";
import sundays from "../src/data/evangelios-dominicales.json";
import {
  formatSundayDate,
  getCancunDate,
  getSunday,
  getSundayDateForLocalDay,
  getTargetSunday,
  millisecondsUntilCancunMidnight,
} from "../src/lib/sunday-gospel";

const day = 24 * 60 * 60 * 1000;

function reference(value: string) {
  return value.replace(/[–—]/g, "-").replace(/\s/g, "").replace(/,/g, ":").replace(/\.(?=\d)/g, ":");
}

function assertGospel(date: string, expected: string) {
  const sunday = getSunday(date);
  assert.ok(sunday, `Missing verified Sunday: ${date}`);
  assert.equal(reference(sunday.gospel_reference), reference(expected), date);
}

test("all 157 real Sundays of 2026–2028 are present exactly once and in date order", () => {
  const expected: string[] = [];
  for (let time = Date.UTC(2026, 0, 1); time < Date.UTC(2029, 0, 1); time += day) {
    const date = new Date(time);
    if (date.getUTCDay() === 0) expected.push(date.toISOString().slice(0, 10));
  }
  const actual = sundays.map((sunday) => sunday.sunday_date);
  assert.deepEqual(actual, expected);
  assert.equal(new Set(actual).size, 157);
  assert.deepEqual([2026, 2027, 2028].map((year) => actual.filter((date) => date.startsWith(`${year}-`)).length), [52, 52, 53]);
});

test("every record has a real Sunday, a valid cycle, a short editorial title and verification URLs", () => {
  for (const sunday of sundays) {
    const date = new Date(`${sunday.sunday_date}T12:00:00Z`);
    assert.equal(date.toISOString().slice(0, 10), sunday.sunday_date);
    assert.equal(date.getUTCDay(), 0, sunday.sunday_date);
    assert.ok(["A", "B", "C"].includes(sunday.cycle));
    assert.ok(Number.isInteger(sunday.liturgical_year));
    assert.ok(sunday.celebration.trim().length > 0);
    assert.match(sunday.gospel_reference, /^(Mt|Mc|Lc|Jn) \d{1,2}[:,] ?\d/);
    assert.equal(sunday.short_title, sunday.short_title.trim());
    assert.ok(sunday.short_title.length >= 3 && sunday.short_title.length <= 100, sunday.sunday_date);
    assert.doesNotMatch(sunday.short_title, /[<>\r\n]/);
    for (const source of [sunday.source_url, ...sunday.verification_urls]) {
      const url = new URL(source);
      assert.equal(url.protocol, "https:");
      assert.equal(url.username + url.password, "");
      assert.ok(url.hostname.length > 0);
    }
    assert.deepEqual(getSunday(sunday.sunday_date), sunday);
  }
});

test("the five requested November dates show the inclusive upcoming Sunday", () => {
  const cases = [
    ["2026-11-05", "2026-11-08", "Las diez vírgenes y sus lámparas"],
    ["2026-11-08", "2026-11-08", "Las diez vírgenes y sus lámparas"],
    ["2026-11-09", "2026-11-15", "La parábola de los talentos"],
    ["2026-11-15", "2026-11-15", "La parábola de los talentos"],
    ["2026-11-16", "2026-11-22", "Encontrar a Jesús en los más pequeños"],
  ];
  for (const [localDate, expectedDate, expectedTitle] of cases) {
    const target = getTargetSunday(new Date(`${localDate}T17:00:00Z`));
    assert.equal(target, expectedDate, localDate);
    assert.equal(getSundayDateForLocalDay(localDate), expectedDate, localDate);
    assert.equal(getSunday(target)?.short_title, expectedTitle, localDate);
  }
});

test("the week changes at Monday 00:00 in Cancun, exactly 05:00 UTC", () => {
  const cases = [
    ["2026-11-08T04:59:59.999Z", "2026-11-07", "2026-11-08"],
    ["2026-11-08T05:00:00.000Z", "2026-11-08", "2026-11-08"],
    ["2026-11-09T00:00:00.000Z", "2026-11-08", "2026-11-08"],
    ["2026-11-09T04:59:59.999Z", "2026-11-08", "2026-11-08"],
    ["2026-11-09T05:00:00.000Z", "2026-11-09", "2026-11-15"],
    ["2026-11-16T04:59:59.999Z", "2026-11-15", "2026-11-15"],
    ["2026-11-16T05:00:00.000Z", "2026-11-16", "2026-11-22"],
  ];
  for (const [instant, localDate, sundayDate] of cases) {
    assert.equal(getCancunDate(new Date(instant)), localDate, instant);
    assert.equal(getTargetSunday(new Date(instant)), sundayDate, instant);
  }
});

test("Cancun date selection does not depend on the browser or server timezone", () => {
  const original = process.env.TZ;
  try {
    for (const zone of ["UTC", "America/Los_Angeles", "America/New_York", "Europe/Madrid", "Asia/Tokyo", "Pacific/Auckland"]) {
      process.env.TZ = zone;
      assert.equal(getCancunDate(new Date("2026-11-09T04:30:00Z")), "2026-11-08", zone);
      assert.equal(getTargetSunday(new Date("2026-11-09T04:30:00Z")), "2026-11-08", zone);
      assert.equal(getTargetSunday(new Date("2026-11-09T05:00:00Z")), "2026-11-15", zone);
    }
  } finally {
    if (original === undefined) delete process.env.TZ;
    else process.env.TZ = original;
  }
});

test("the inclusive Sunday calculation works for every civil day, including leap day and year ends", () => {
  for (let time = Date.UTC(2026, 0, 1); time < Date.UTC(2029, 0, 1); time += day) {
    const civilDate = new Date(time).toISOString().slice(0, 10);
    let expected = time;
    while (new Date(expected).getUTCDay() !== 0) expected += day;
    assert.equal(getSundayDateForLocalDay(civilDate), new Date(expected).toISOString().slice(0, 10), civilDate);
  }
  assert.equal(getSundayDateForLocalDay("2028-02-29"), "2028-03-05");
});

test("liturgical cycles change on the first Sunday of Advent, not January 1", () => {
  const cases = [
    ["2026-11-22", 2026, "A"], ["2026-11-29", 2027, "B"],
    ["2026-12-27", 2027, "B"], ["2027-01-03", 2027, "B"],
    ["2027-11-21", 2027, "B"], ["2027-11-28", 2028, "C"],
    ["2027-12-26", 2028, "C"], ["2028-01-02", 2028, "C"],
    ["2028-11-26", 2028, "C"], ["2028-12-03", 2029, "A"],
    ["2028-12-31", 2029, "A"],
  ] as const;
  for (const [date, year, cycle] of cases) {
    const sunday = getSunday(date);
    assert.equal(sunday?.liturgical_year, year, date);
    assert.equal(sunday?.cycle, cycle, date);
  }
  assert.equal(getTargetSunday(new Date("2026-11-23T05:00:00Z")), "2026-11-29");
  assert.equal(getTargetSunday(new Date("2026-12-31T23:59:59Z")), "2027-01-03");
  assert.equal(getTargetSunday(new Date("2027-01-01T05:00:00Z")), "2027-01-03");
  assertGospel("2026-11-29", "Mc 13, 33-37");
  assertGospel("2027-11-28", "Lc 21, 25-28. 34-36");
  assertGospel("2028-12-03", "Mt 24:37-44");
});

test("Holy Week points to Palm Sunday while preserving the proper Passion for each cycle", () => {
  const cases = [
    ["2026-03-26", "2026-03-29", "Mt 26, 14–27, 66", "2026-04-05"],
    ["2027-03-18", "2027-03-21", "Mc 14, 1–15, 47", "2027-03-28"],
    ["2028-04-06", "2028-04-09", "Lc 22:14-23:56", "2028-04-16"],
  ];
  for (const [weekday, palms, passion, easter] of cases) {
    assert.equal(getSundayDateForLocalDay(weekday), palms);
    assertGospel(palms, passion);
    assert.match(getSunday(palms)?.celebration ?? "", /Ramos/);
    const monday = new Date(`${palms}T12:00:00Z`);
    monday.setUTCDate(monday.getUTCDate() + 1);
    assert.equal(getTargetSunday(monday), easter);
  }
});

test("Easter Sunday and Pentecost use verified dates and daytime gospels in each year", () => {
  for (const date of ["2026-04-05", "2027-03-28", "2028-04-16"]) {
    assertGospel(date, "Jn 20:1-9");
    assert.match(getSunday(date)?.celebration ?? "", /Pascua de la Resurrección/);
  }
  for (const date of ["2026-05-24", "2027-05-16", "2028-06-04"]) {
    assertGospel(date, "Jn 20:19-23");
    assert.match(getSunday(date)?.celebration ?? "", /Pentecostés/);
  }
});

test("Mexico observes Ascension on Sunday and keeps the Ordinary Sunday after Thursday Corpus Christi", () => {
  for (const [date, expected] of [["2026-05-17", "Mt 28, 16-20"], ["2027-05-09", "Mc 16, 15-20"], ["2028-05-28", "Lc 24:46-53"]]) {
    assertGospel(date, expected);
    assert.match(getSunday(date)?.celebration ?? "", /Ascensión/);
  }
  for (const [date, expected] of [["2026-06-07", "Mt 9, 9-13"], ["2027-05-30", "Mc 2, 23–3, 6"], ["2028-06-18", "Lc 7:36-8:3"]]) {
    assertGospel(date, expected);
    assert.match(getSunday(date)?.celebration ?? "", /Tiempo Ordinario/);
  }
});

test("solemnities and feasts replace Ordinary Sundays where the calendar requires it", () => {
  assert.match(getSunday("2026-11-01")?.celebration ?? "", /Todos los Santos/);
  assertGospel("2026-11-01", "Mt 5, 1-12a");
  assert.match(getSunday("2027-08-15")?.celebration ?? "", /Asunción/);
  assertGospel("2027-08-15", "Lc 1, 39-56");
  assert.match(getSunday("2028-08-06")?.celebration ?? "", /Transfiguración/);
  assertGospel("2028-08-06", "Lc 9:28b-36");
  assert.match(getSunday("2028-03-19")?.celebration ?? "", /III Domingo de Cuaresma/);
  assertGospel("2028-03-19", "Lc 13:1-9");
});

test("2028 retains its 53rd Sunday and December 24 is the fourth Sunday of Advent", () => {
  assert.equal(sundays.filter((sunday) => sunday.sunday_date.startsWith("2028-")).length, 53);
  assert.equal(getSundayDateForLocalDay("2028-12-25"), "2028-12-31");
  assert.equal(getSundayDateForLocalDay("2028-12-31"), "2028-12-31");
  assert.match(getSunday("2028-12-31")?.celebration ?? "", /Sagrada Familia/);
  assertGospel("2028-12-31", "Mt 2:13-15, 19-23");
  assert.match(getSunday("2028-12-24")?.celebration ?? "", /IV Domingo de Adviento/);
  assertGospel("2028-12-24", "Mt 1:18-24");
});

test("a missing or invalid record returns null instead of a fabricated or previous gospel", () => {
  for (const date of ["2025-12-28", "2029-01-07", "2026-11-09", "not-a-date", "2028-02-30", ""]) {
    assert.equal(getSunday(date), null, date);
  }
  assert.equal(getTargetSunday(new Date("2029-01-01T05:00:00Z")), "2029-01-07");
  assert.equal(getSunday(getTargetSunday(new Date("2029-01-01T05:00:00Z"))), null);
});

test("invalid calendar input is rejected instead of rolling into an unintended month", () => {
  for (const date of ["not-a-date", "2026-02-29", "2028-02-30", "2026-13-01", "2026-00-01", "2026-11-00", "2026-1-4", "2026-11-08T00:00:00Z"]) {
    assert.throws(() => getSundayDateForLocalDay(date), RangeError, date);
    assert.throws(() => formatSundayDate(date), RangeError, date);
  }
  for (const getDate of [getCancunDate, getTargetSunday, millisecondsUntilCancunMidnight]) {
    assert.throws(() => getDate(new Date(Number.NaN)), RangeError);
  }
});

test("the public date label is concise Spanish and does not shift ISO dates into Saturday", () => {
  assert.equal(formatSundayDate("2026-11-08"), "8 NOV 2026");
  assert.equal(formatSundayDate("2027-01-03"), "3 ENE 2027");
  assert.equal(formatSundayDate("2028-12-31"), "31 DIC 2028");
});

test("an open page can schedule the next Cancun midnight precisely and select the new week", () => {
  const before = new Date("2026-11-09T04:59:59.750Z");
  const remaining = millisecondsUntilCancunMidnight(before);
  assert.equal(remaining, 250);
  assert.equal(getTargetSunday(before), "2026-11-08");
  const afterTimer = new Date(before.getTime() + remaining);
  assert.equal(getCancunDate(afterTimer), "2026-11-09");
  assert.equal(getTargetSunday(afterTimer), "2026-11-15");
  assert.equal(millisecondsUntilCancunMidnight(afterTimer), day);
});

test("midnight scheduling stays on Cancun time across foreign DST changes and year rollover", () => {
  const cases = [
    ["2026-03-08T04:00:00Z", 60 * 60 * 1000],
    ["2026-11-01T04:00:00Z", 60 * 60 * 1000],
    ["2027-01-01T04:59:59.999Z", 1],
    ["2028-03-01T04:59:59.000Z", 1000],
    ["2028-12-31T05:00:00Z", day],
  ] as const;
  for (const [instant, remaining] of cases) {
    assert.equal(millisecondsUntilCancunMidnight(new Date(instant)), remaining, instant);
  }
});
