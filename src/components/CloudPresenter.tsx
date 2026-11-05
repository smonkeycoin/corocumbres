"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { loadAdminData } from "@/lib/cloud-repository";
import { Display, Presenter } from "./PresenterViews";

export function CloudPresenter({ display = false }: { display?: boolean }) {
  const [data, setData] = useState<Awaited<ReturnType<typeof loadAdminData>> | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    loadAdminData().then(value => { if (active) setData(value); })
      .catch(() => { if (active) setError("No se pudo cargar el repertorio. Comprueba tu sesión y vuelve a intentarlo."); });
    return () => { active = false; };
  }, []);
  if (error) return <main className="shared-page"><p role="alert">{error}</p><Link href="/admin">Volver a administración</Link></main>;
  if (!data) return <main className="shared-page"><p role="status">Cargando repertorio…</p></main>;
  return display ? <Display initialSongs={data.songs} /> : <Presenter initialSongs={data.songs} initialSets={data.sets} />;
}
