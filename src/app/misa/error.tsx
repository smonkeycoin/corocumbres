"use client";

import Link from "next/link";
import { Brand } from "@/components/v2/Brand";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return <div className="v2-app v2-public-app">
    <header className="v2-public-header"><div className="v2-header-inner"><Brand /><Link href="/" className="v2-admin-access">Todas las misas</Link></div></header>
    <main className="v2-container v2-playlist-page"><h1>No pudimos cargar esta playlist</h1><p>Intenta nuevamente en un momento.</p><button className="v2-button v2-button-primary" onClick={reset}>Volver a intentar</button><Link className="v2-text-link" href="/">Regresar a las misas</Link></main>
    <footer className="v2-public-footer">Coro Cumbres · Música · Fe · Comunidad</footer>
  </div>;
}
