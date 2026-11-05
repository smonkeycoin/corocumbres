import { notFound } from "next/navigation";
import { PublicPortal } from "@/components/PublicPortal";
import { getGospelTitle, getSundayDate } from "@/lib/gospel";
import { getCancunDate } from "@/lib/sunday-gospel";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ massId: string }> }) {
  const { massId } = await params;
  if (!["ninos", "dominical-12", "dominical-1330", "noche"].includes(massId)) notFound();
  const sunday = getSundayDate();
  return <PublicPortal initialSunday={sunday} initialToday={getCancunDate()} gospelTitle={await getGospelTitle(sunday)} initialMassId={massId} />;
}
