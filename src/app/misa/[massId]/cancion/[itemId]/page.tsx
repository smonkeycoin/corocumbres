import { notFound } from "next/navigation";
import { getMass } from "@/lib/masses";
import { readPublicPlaylist } from "@/lib/server/workspace";
import { LyricsReader } from "@/components/v2/LyricsReader";
export const dynamic = "force-dynamic";
export default async function Page({ params }: { params: Promise<{massId:string;itemId:string}> }) {
  const {massId,itemId}=await params;
  const mass=getMass(massId);
  if (!mass) notFound();
  const playlist=await readPublicPlaylist(mass.id);
  const index=playlist?.items.findIndex(item=>item.id===itemId) ?? -1;
  if (!playlist || index<0) notFound();
  return <LyricsReader key={itemId} playlist={playlist} index={index} />;
}
