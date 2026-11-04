import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/server/auth";
import { AdminShell } from "@/components/v2/AdminShell";
export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };
export default async function Layout({children}: {children:React.ReactNode}) {
 const session=await getAdminSession();
 if (!session) redirect("/login");
 return <AdminShell email={session.user.email ?? undefined}>{children}</AdminShell>;
}
