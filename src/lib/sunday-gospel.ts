import calendar from "../data/evangelios-dominicales.json";

export type LiturgicalSunday = {
  sunday_date: string;
  liturgical_year: number;
  cycle: "A" | "B" | "C";
  celebration: string;
  gospel_reference: string;
  short_title: string;
  source_url: string;
  verification_urls?: string[];
};

export type PublicGospel = { sunday_date: string; short_title: string | null };
export const GOSPEL_TIME_ZONE = "America/Cancun";
export const GOSPEL_FALLBACK = "Nos preparamos para escuchar la Palabra.";

const sundays = new Map(calendar.map((record) => [record.sunday_date, record as LiturgicalSunday]));
const dateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: GOSPEL_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
});
const timeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: GOSPEL_TIME_ZONE, hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
});
const months = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];

function calendarDay(iso: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) throw new RangeError("Fecha ISO inválida");
  const date = new Date(`${iso}T12:00:00.000Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== iso) {
    throw new RangeError("Fecha ISO inválida");
  }
  return date;
}

/** Extract the civil date in Cancún, never in the server/device timezone. */
export function getCancunDate(now: Date = new Date()): string {
  const parts = dateFormatter.formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

/** Calendar arithmetic uses UTC only as a timezone-free representation of a civil day. */
export function getSundayDateForLocalDay(today: string): string {
  const date = calendarDay(today);
  date.setUTCDate(date.getUTCDate() + (7 - date.getUTCDay()) % 7);
  return date.toISOString().slice(0, 10);
}

export function getTargetSunday(now: Date = new Date()): string {
  return getSundayDateForLocalDay(getCancunDate(now));
}

export function getSunday(sundayDate: string): LiturgicalSunday | null {
  return sundays.get(sundayDate) ?? null;
}

export function formatSundayDate(sundayDate: string): string {
  const date = calendarDay(sundayDate);
  return `${date.getUTCDate()} ${months[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

/** Cancún has no seasonal clock changes; derive its wall time through IANA, not a UTC offset. */
export function millisecondsUntilCancunMidnight(now: Date = new Date()): number {
  const parts = timeFormatter.formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((item) => item.type === type)!.value);
  const elapsed = ((part("hour") * 60 + part("minute")) * 60 + part("second")) * 1000 + now.getUTCMilliseconds();
  return 86_400_000 - elapsed;
}
