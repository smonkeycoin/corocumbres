import Link from "next/link";
import { getMass, masses } from "@/lib/masses";
import type { PublicPlaylistSnapshot } from "@/lib/v2-types";
import { Brand, Icon, MassIcon } from "./Brand";

export function PublicHeader() {
  return <header className="v2-public-header"><div className="v2-header-inner"><Brand /><Link href="/admin" className="v2-admin-access"><Icon name="lock" size={16} /><span>Acceso Admin</span></Link></div></header>;
}

export function PublicFooter() {
  return <footer className="v2-public-footer"><span>Coro Cumbres</span><span aria-hidden="true">·</span><span>Música</span><span aria-hidden="true">·</span><span>Fe</span><span aria-hidden="true">·</span><span>Comunidad</span></footer>;
}

export function PublicHome() {
  return <div className="v2-app v2-public-app">
    <a className="v2-skip-link" href="#selecciona-misa">Ir a las misas</a>
    <PublicHeader />
    <main>
      <section className="v2-hero" aria-labelledby="welcome-title"><div className="v2-container v2-hero-content">
        <p className="v2-welcome">Bienvenido a</p>
        <h1 id="welcome-title">Coro Cumbres</h1>
        <p className="v2-hero-description">Música que nos une en la fe.</p>
        <span className="v2-hero-rule" aria-hidden="true" />
      </div></section>
      <section className="v2-container v2-mass-section" id="selecciona-misa" aria-labelledby="mass-title">
        <div className="v2-section-heading"><h2 id="mass-title">Selecciona tu misa</h2><p>Encuentra las canciones de tu celebración.</p></div>
        <div className="v2-mass-grid">
          {masses.map((mass) => <Link key={mass.id} href={`/misa/${mass.id}`} className={`v2-mass-card v2-mass-${mass.tone}`}>
            <span className="v2-mass-number" aria-hidden="true">{mass.number}</span>
            <span className="v2-mass-icon"><MassIcon massId={mass.id} /></span>
            <span className="v2-mass-card-copy"><span className="v2-mass-name">{mass.name}</span><span className={`v2-mass-time${!mass.time ? " v2-time-pending" : ""}`}>{mass.time ?? "Horario pendiente de confirmación."}</span></span>
            <span className="v2-mass-arrow"><Icon name="arrow-right" size={20} /></span>
          </Link>)}
        </div>
        <p className="v2-mass-hint"><Icon name="music" size={16} />Selecciona tu celebración y canta con nosotros.</p>
      </section>
    </main>
    <PublicFooter />
  </div>;
}

export function PublicPlaylist({ playlist, massId }: { playlist: PublicPlaylistSnapshot | null; massId: string }) {
  const mass = getMass(massId);
  if (!mass) return null;
  return <div className="v2-app v2-public-app">
    <a className="v2-skip-link" href="#canciones">Ir a las canciones</a>
    <PublicHeader />
    <main className="v2-container v2-playlist-page">
      <Link className="v2-back-link" href="/"><Icon name="arrow-left" size={18} />Todas las misas</Link>
      <div className={`v2-playlist-heading v2-mass-${mass.tone}`}>
        <span className="v2-playlist-emblem"><MassIcon massId={mass.id} /></span>
        <div><p className="v2-eyebrow">CANTEMOS JUNTOS</p><h1>{mass.name}</h1><p className="v2-playlist-time">{mass.time ?? "Horario pendiente de confirmación."}</p></div>
      </div>
      <section id="canciones" className="v2-public-song-section" aria-labelledby="playlist-title">
        <div className="v2-section-heading v2-heading-row"><div><h2 id="playlist-title">Canciones de la misa</h2><p>Abre una canción para seguir la letra.</p></div>{playlist && playlist.items.length > 0 ? <span className="v2-count-label">{playlist.items.length} canciones</span> : null}</div>
        {playlist && playlist.items.length > 0 ? <ol className="v2-public-song-list">
          {playlist.items.map((item, index) => <li key={item.id}><Link href={`/misa/${mass.id}/cancion/${encodeURIComponent(item.id)}`} className="v2-public-song-row">
            <span className="v2-song-number">{String(index + 1).padStart(2, "0")}</span>
            <span className="v2-public-song-copy"><span className="v2-public-song-title">{item.title}</span>{item.moment ? <span className="v2-public-song-moment">{item.moment}</span> : null}</span>
            <span className="v2-open-lyrics">Ver letra</span><Icon name="chevron-right" size={20} />
          </Link></li>)}
        </ol> : <div className="v2-empty-state"><span className="v2-empty-icon"><Icon name="music" size={28} /></span><h3>Estamos preparando las canciones</h3><p>La playlist de esta misa estará disponible aquí cuando el coro la publique.</p><Link href="/" className="v2-button v2-button-secondary">Ver las otras misas<Icon name="arrow-right" size={18} /></Link></div>}
      </section>
    </main>
    <PublicFooter />
  </div>;
}
