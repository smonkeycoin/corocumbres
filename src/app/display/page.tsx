import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/server/auth";
import { readWorkspace } from "@/lib/server/workspace";
import { Display } from "@/components/PresenterViews";
export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };
export default async function Page() {
 if (!await getAdminSession()) redirect("/login");
 const {state}=await readWorkspace();
 return <Display initialSongs={state.songs}/>;
}
