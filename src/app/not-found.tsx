import Link from "next/link";
import { Brand } from "@/components/v2/Brand";

export default function NotFound() {
  return <div className="v2-app v2-public-app">
    <header className="v2-public-header"><div className="v2-header-inner"><Brand /><Link href="/" className="v2-admin-access">Todas las misas</Link></div></header>
    <main className="v2-container v2-playlist-page"><h1>No encontramos esta página</h1><p>Selecciona una misa para consultar sus canciones publicadas.</p><Link href="/" className="v2-button v2-button-primary">Seleccionar mi misa</Link></main>
    <footer className="v2-public-footer">Coro Cumbres · Música · Fe · Comunidad</footer>
  </div>;
}
