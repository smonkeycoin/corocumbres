import { notFound, redirect } from "next/navigation";
import { readPublishedShare } from "@/lib/server/workspace";
export const dynamic = "force-dynamic";
export default async function Page({params}:{params:Promise<{shareId:string}>}) {
 const {shareId}=await params;
 const playlist=await readPublishedShare(shareId);
 if (!playlist) notFound();
 redirect(`/misa/${playlist.massId}`);
}
