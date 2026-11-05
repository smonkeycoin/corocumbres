import { getGospelTitle, getSundayDate } from "@/lib/gospel";

export const dynamic = "force-dynamic";

export async function GET() {
  const date = getSundayDate();
  const title = await getGospelTitle(date);
  return Response.json({ date, title }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
