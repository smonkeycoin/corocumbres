"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getMass } from "@/lib/masses";
import type { PublicPlaylistSnapshot } from "@/lib/v2-types";
import { Icon } from "./Brand";
import { PublicFooter, PublicHeader } from "./PublicPortal";

const FONT_KEY = "coro-cumbres:reader-font-size";

export function LyricsReader({ playlist, index }: { playlist: PublicPlaylistSnapshot; index: number }) {
  const [fontSize, setFontSize] = useState(22);
  const mass = getMass(playlist.massId);
  const song = playlist.items[index];
  const previous = playlist.items[index - 1];
  const next = playlist.items[index + 1];

  useEffect(() => {
    try {
      const saved = Number(localStorage.getItem(FONT_KEY));
      if (saved >= 18 && saved <= 36) {
        const frame = requestAnimationFrame(() => setFontSize(saved));
        return () => cancelAnimationFrame(frame);
      }
    } catch { /* Reading works even when browser storage is unavailable. */ }
  }, []);

  function adjustFont(delta: number) {
    const value = Math.max(18, Math.min(36, fontSize + delta));
    setFontSize(value);
    try { localStorage.setItem(FONT_KEY, String(value)); } catch { /* Optional preference. */ }
  }

  if (!mass || !song) return null;
  const playlistHref = `/misa/${mass.id}`;
  return <div className="v2-app v2-public-app v2-reader-app">
    <a className="v2-skip-link" href="#letra">Ir a la letra</a>
    <PublicHeader />
    <div className="v2-reader-context"><div className="v2-reader-container"><Link className="v2-back-link" href={playlistHref}><Icon name="arrow-left" size={18} /><span>{mass.name}<span className="v2-reader-mass-time">{mass.time ? ` · ${mass.time}` : ""}</span></span></Link><span className="v2-reader-count">{index + 1} / {playlist.items.length}</span></div></div>
    <main className="v2-reader-container v2-reader-main">
      <div className="v2-reader-title"><p className="v2-eyebrow">{song.moment ?? "CANCIÓN DE LA MISA"}</p><h1>{song.title}</h1></div>
      <div className="v2-reader-tools"><span>Tamaño de letra</span><div className="v2-font-controls" role="group" aria-label="Ajustar tamaño de letra"><button type="button" onClick={() => adjustFont(-2)} disabled={fontSize <= 18} aria-label="Reducir tamaño de letra">A−</button><output aria-live="polite" aria-label="Tamaño de letra">{fontSize}</output><button type="button" onClick={() => adjustFont(2)} disabled={fontSize >= 36} aria-label="Aumentar tamaño de letra">A+</button></div></div>
      <article id="letra" className="v2-lyrics" style={{ fontSize: `${fontSize}px` }} aria-label={`Letra de ${song.title}`}>{song.lyrics}</article>
      <Link className="v2-reader-back-bottom" href={playlistHref}><Icon name="playlists" size={18} />Regresar a la playlist</Link>
    </main>
    <nav className="v2-reader-navigation" aria-label="Navegación entre canciones"><div className="v2-reader-container">
      {previous ? <Link href={`${playlistHref}/cancion/${encodeURIComponent(previous.id)}`} className="v2-reader-nav-link" aria-label={`Canción anterior: ${previous.title}`}><Icon name="arrow-left" size={20} /><span><small>Anterior</small><strong>{previous.title}</strong></span></Link> : <span className="v2-reader-nav-link v2-nav-disabled"><Icon name="arrow-left" size={20} /><span><small>Anterior</small><strong>Primera canción</strong></span></span>}
      {next ? <Link href={`${playlistHref}/cancion/${encodeURIComponent(next.id)}`} className="v2-reader-nav-link v2-reader-nav-next" aria-label={`Canción siguiente: ${next.title}`}><span><small>Siguiente</small><strong>{next.title}</strong></span><Icon name="arrow-right" size={20} /></Link> : <Link href={playlistHref} className="v2-reader-nav-link v2-reader-nav-next"><span><small>Terminaste la playlist</small><strong>Volver a las canciones</strong></span><Icon name="check" size={20} /></Link>}
    </div></nav>
    <PublicFooter />
  </div>;
}
