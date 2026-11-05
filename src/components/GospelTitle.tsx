"use client";

import { SundayGospel } from "./v2/SundayGospel";

/** Compatibility wrapper; all clock updates and editorial loading use the preserved V2 implementation. */
export function GospelTitle({ initialTitle, initialDate, initialToday = initialDate }: { initialTitle: string | null; initialDate: string; initialToday?: string }) {
  return <SundayGospel initialToday={initialToday} initialGospel={{ sunday_date: initialDate, short_title: initialTitle }} compact />;
}
