"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { sortItems, sortSections } from "@/lib/liturgy";
import { sectionLines, songToFullLyrics } from "@/lib/song-format";
import { getPublishedSet } from "@/lib/cloud-repository";
import type { CoroSet, Song } from "@/lib/types";
import { Brand, Icon } from "./v2/Brand";

export const EMPTY_REPERTOIRE = "El repertorio de esta misa estará disponible próximamente.";

export function PlaylistReader({ set, songs }: { set: CoroSet; songs: Song[] }) {
  const [openItemId, setOpenItemId] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [showChords, setShowChords] = useState(false);
  const [fontScale, setFontScale] = useState(20);
  const sections = sortSections(set.sections).filter((section) => section.isEnabled !== false);
  const orderedItems = sections.flatMap((section) => sortItems(section.items).flatMap((item) => {
    const song = songs.find((candidate) => candidate.id === item.songId);
    return song ? [{ item, song }] : [];
  }));
  const itemIndex = orderedItems.findIndex(({ item }) => item.id === openItemId);
  const openSong = orderedItems[itemIndex]?.song;
  const previous = orderedItems[itemIndex - 1];
  const next = orderedItems[itemIndex + 1];

  useEffect(() => {
    if (!openItemId || !headingRef.current) return;
    headingRef.current.focus({ preventScroll: true });
    headingRef.current.scrollIntoView({ block: "start", behavior: "auto" });
  }, [openItemId]);

  if (openSong) return <article className="public-lyrics-reader">
    <button className="v2-back-link" onClick={() => setOpenItemId(null)}><Icon name="arrow-left" size={18} />Volver al repertorio</button>
    <h2 ref={headingRef} tabIndex={-1}>{openSong.title}</h2>
    <p className="v2-reader-count">Canción {itemIndex + 1} de {orderedItems.length}</p>
    <div className="v2-reader-tools">
      <div className="v2-font-controls" aria-label="Tamaño de letra"><button aria-label="Reducir letra" disabled={fontScale <= 16} onClick={() => setFontScale((size) => size - 2)}>A−</button><button aria-label="Aumentar letra" disabled={fontScale >= 32} onClick={() => setFontScale((size) => size + 2)}>A+</button></div>
      {openSong.sections.some((section) => section.lines?.some((line) => line.chords.length)) ? <button aria-pressed={showChords} onClick={() => setShowChords((value) => !value)}>{showChords ? "Ocultar acordes" : "Ver acordes"}</button> : null}
    </div>
    {showChords ? <div className="public-chord-song" style={{ fontSize: fontScale }}>{openSong.sections.map((section) => <section key={section.id}>
      <h3>{section.label}</h3>{sectionLines(section).map((line) => <div key={line.id}>{line.chords.length ? <pre className="public-chords">{chordRow(line.lyrics, line.chords)}</pre> : null}<pre>{line.lyrics || " "}</pre></div>)}
    </section>)}</div> : <div className="v2-lyrics" style={{ fontSize: fontScale }}>{songToFullLyrics(openSong)}</div>}
    <nav className="v2-reader-navigation" aria-label="Navegar entre canciones"><div>
      <button className="v2-reader-nav-link" disabled={!previous} aria-label={previous ? `Canción anterior: ${previous.song.title}` : "No hay canción anterior"} onClick={() => previous && setOpenItemId(previous.item.id)}><Icon name="arrow-left" size={18} /><span><small>Anterior</small><strong>{previous?.song.title ?? "Primera canción"}</strong></span></button>
      <button className="v2-reader-nav-link v2-reader-nav-next" disabled={!next} aria-label={next ? `Canción siguiente: ${next.song.title}` : "No hay canción siguiente"} onClick={() => next && setOpenItemId(next.item.id)}><span><small>Siguiente</small><strong>{next?.song.title ?? "Última canción"}</strong></span><Icon name="arrow-right" size={18} /></button>
    </div></nav>
  </article>;

  if (!sections.some((section) => section.items.length)) return <div className="v2-empty-state"><Icon name="music" size={28} /><p>{EMPTY_REPERTOIRE}</p></div>;
  return <div className="public-repertoire">
    {sections.filter((section) => section.items.length > 0).map((section) => <section key={section.id}>
      {set.type !== "playlist" ? <h3 className="public-moment-title">{section.label}</h3> : null}
      <ol className="v2-public-song-list">{sortItems(section.items).map((item, index) => {
        const song = songs.find((candidate) => candidate.id === item.songId);
        if (!song) return null;
        return <li key={item.id}><button className="v2-public-song-row" onClick={() => setOpenItemId(item.id)}><span className="v2-song-number">{String(index + 1).padStart(2, "0")}</span><span className="v2-public-song-copy"><span className="v2-public-song-title">{song.title}</span></span><span className="v2-open-lyrics">Ver letra</span><Icon name="chevron-right" /></button></li>;
      })}</ol>
    </section>)}
  </div>;
}

function chordRow(lyrics: string, chords: Array<{ symbol: string; position: number }>) {
  const chars = Array.from({ length: Math.max(lyrics.length, ...chords.map((chord) => chord.position + chord.symbol.length)) }, () => " ");
  for (const chord of chords) for (const [index, char] of [...chord.symbol].entries()) chars[Math.max(0, chord.position) + index] = char;
  return chars.join("").trimEnd();
}

export function SharedPlaylist({ shareId }: { shareId: string }) {
  const [data, setData] = useState<{ set: CoroSet | null; songs: Song[] } | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    getPublishedSet(shareId).then((value) => { if (active) setData(value); }).catch((error: unknown) => { if (active) setError(error instanceof Error ? error.message : "No se pudo cargar el repertorio."); });
    return () => { active = false; };
  }, [shareId]);
  return <div className="v2-app v2-public-app"><header className="v2-public-header"><div className="v2-header-inner"><Brand /><Link href="/" className="v2-admin-access">Todas las misas</Link></div></header>
    <main className="v2-container v2-playlist-page">
      {error ? <p role="alert" className="cloud-error">{error}</p> : !data ? <p role="status">Cargando repertorio…</p> : data.set?.status === "published" ? <><div className="v2-section-heading"><h1>{data.set.name}</h1><p>{data.set.date}</p></div><PlaylistReader key={data.set.id} set={data.set} songs={data.songs} /></> : <div className="v2-empty-state"><Icon name="music" size={28} /><p>{EMPTY_REPERTOIRE}</p></div>}
    </main><footer className="v2-public-footer">Coro Cumbres · Música · Fe · Comunidad</footer></div>;
}
