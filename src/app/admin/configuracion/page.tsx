import Link from "next/link";
import { redirect } from "next/navigation";
import { Brand } from "@/components/v2/Brand";
import { GospelEditor } from "@/components/v2/GospelEditor";
import { getAdminAccess } from "@/lib/supabase/auth";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

export default async function Page() {
  const access = await getAdminAccess();
  if (access.status === "anonymous") redirect("/login?next=/admin/configuracion");
  if (access.status !== "admin") redirect(`/login?error=${access.status === "unconfigured" ? "configuration" : access.status}`);
  return <main className="v2-site" style={{ minHeight: "100dvh", padding: "24px 0" }}>
    <div className="v2-container">
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, marginBottom: 32 }}>
        <Brand compact /><Link className="v2-button secondary" href="/admin">Volver a administración</Link>
      </header>
      <h1>Configuración</h1>
      <GospelEditor />
    </div>
  </main>;
}
