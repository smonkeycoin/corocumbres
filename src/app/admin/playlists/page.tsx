import { AdminWorkspace } from "@/components/v2/AdminWorkspace";
import { getMass } from "@/lib/masses";
export default async function Page({searchParams}:{searchParams:Promise<{misa?:string}>}){const {misa}=await searchParams;return <AdminWorkspace view="playlists" massId={misa ? getMass(misa)?.id : undefined}/>;}
