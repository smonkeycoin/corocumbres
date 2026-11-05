import { getSunday, getTargetSunday } from "./sunday-gospel";

/** Compatibility API: the existing verified calendar remains the only liturgical source. */
export const getSundayDate = getTargetSunday;

export async function getGospelTitle(date: string = getSundayDate()): Promise<string | null> {
  if (!getSunday(date)) return null;
  const { readPublicGospel } = await import("./server/gospel");
  return (await readPublicGospel(date)).short_title;
}
