import { PublicHome } from "@/components/v2/PublicPortal";
import { getCancunDate, getTargetSunday } from "@/lib/sunday-gospel";
import { readPublicGospel } from "@/lib/server/gospel";

export const dynamic = "force-dynamic";

export default async function Page() {
  const now = new Date();
  const initialGospel = await readPublicGospel(getTargetSunday(now));
  return <PublicHome initialToday={getCancunDate(now)} initialGospel={initialGospel} />;
}
