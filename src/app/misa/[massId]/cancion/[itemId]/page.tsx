import { redirect, notFound } from "next/navigation";

export default async function Page({ params }: { params: Promise<{ massId: string; itemId: string }> }) {
  const { massId } = await params;
  if (!["ninos", "dominical-12", "dominical-1330", "noche"].includes(massId)) notFound();
  redirect(`/misa/${massId}`);
}
