import { redirect } from "next/navigation";
import { CloudPresenter } from "@/components/CloudPresenter";
import { getAdminAccess } from "@/lib/supabase/auth";

export const dynamic = "force-dynamic";

export default async function Page() {
  const access = await getAdminAccess();
  if (access.status !== "admin") redirect("/login?next=/presenter");
  return <CloudPresenter />;
}
