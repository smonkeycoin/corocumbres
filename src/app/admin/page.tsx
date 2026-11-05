import { redirect } from "next/navigation";
import { Dashboard } from "@/components/CoroApp";
import { getAdminAccess } from "@/lib/supabase/auth";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const access = await getAdminAccess();
  if (access.status === "anonymous") redirect("/login?next=/admin");
  if (access.status !== "admin") redirect(`/login?error=${access.status === "unconfigured" ? "configuration" : access.status}`);
  return <Dashboard />;
}
