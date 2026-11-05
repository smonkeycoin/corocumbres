import { PublicPortal } from "@/components/PublicPortal";
import { getGospelTitle, getSundayDate } from "@/lib/gospel";
import { getCancunDate } from "@/lib/sunday-gospel";

export const dynamic = "force-dynamic";

export default async function Page() {
  const sunday = getSundayDate();
  return <PublicPortal initialSunday={sunday} initialToday={getCancunDate()} gospelTitle={await getGospelTitle(sunday)} />;
}
