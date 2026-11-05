import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CloudPresenter } from "@/components/CloudPresenter";
import { getAdminAccess } from "@/lib/supabase/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "Display" },
  robots: { index: false, follow: false }
};

export default async function Page() {
  const access = await getAdminAccess();
  if (access.status !== "admin") redirect("/login?next=/display");
  return <CloudPresenter display />;
}
