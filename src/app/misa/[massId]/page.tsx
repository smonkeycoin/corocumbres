import { notFound } from "next/navigation";
import { getMass } from "@/lib/masses";
import { readPublicPlaylist } from "@/lib/server/workspace";
import { PublicPlaylist } from "@/components/v2/PublicPortal";
export const dynamic = "force-dynamic";
export default async function Page({ params }: { params: Promise<{massId:string}> }) {
  const { massId } = await params;
  const mass = getMass(massId);
  if (!mass) notFound();
  const playlist = await readPublicPlaylist(mass.id);
  return <PublicPlaylist playlist={playlist} massId={mass.id} />;
}
