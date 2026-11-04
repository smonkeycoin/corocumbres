import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginPanel } from "@/components/v2/LoginPanel";
import { getAdminSession, getAuthConfigurationStatus } from "@/lib/server/auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Acceso para administradores",
  robots: { index: false, follow: false },
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string | string[] }> }) {
  const session = await getAdminSession();
  if (session) redirect("/admin");
  const { ready } = getAuthConfigurationStatus();
  const query = await searchParams;
  const error = typeof query.error === "string" ? query.error : undefined;
  return <LoginPanel ready={ready} error={error} />;
}
