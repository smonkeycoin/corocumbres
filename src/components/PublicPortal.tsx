"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getPublishedData, OFFICIAL_MASSES } from "@/lib/cloud-repository";
import type { CoroSet, Mass, Song } from "@/lib/types";
import { GospelTitle } from "./GospelTitle";
import { Brand, Icon, MassIcon } from "./v2/Brand";
import { EMPTY_REPERTOIRE, PlaylistReader } from "./SharedPlaylist";

const presentation: Record<string, { tone: string; route: string; time: string | null }> = {
  "ninos": { tone: "children", route: "ninos", time: "10:00 AM" },
  "dominical-12": { tone: "midday", route: "dominical-12", time: "12:00 PM" },
  "dominical-1330": { tone: "afternoon", route: "dominical-1330", time: "1:30 PM" },
  noche: { tone: "evening", route: "noche", time: null }
};

export function PublicPortal({ initialSunday, initialToday, gospelTitle, initialMassId }: { initialSunday: string; initialToday: string; gospelTitle: string | null; initialMassId?: string }) {
  const [date, setDate] = useState(initialSunday);
  const [selectedMass, setSelectedMass] = useState<string | null>(() => Object.entries(presentation).find(([id, value]) => value.route === initialMassId || id === initialMassId)?.[0] ?? null);
  const [data, setData] = useState<{ songs: Song[]; sets: CoroSet[]; masses: Mass[] } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setData(null);
    setError("");
    getPublishedData(date).then((value) => { if (active) setData(value); }).catch((error: unknown) => {
      if (active) setError(error instanceof Error ? error.message : "No se pudieron cargar los repertorios. Intenta nuevamente.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [date, retry]);
  const masses = data?.masses.length ? data.masses : OFFICIAL_MASSES;
  const mass = masses.find((item) => item.id === selectedMass);
  const playlist = data?.sets.find((set) => set.massId === selectedMass && set.date === date && set.status === "published" && !set.isArchived);
  const massPresentation = mass ? presentation[mass.id] : null;

  function changeDate(value: string) {
    if (!value) return;
    if (new Date(`${value}T12:00:00Z`).getUTCDay() !== 0) { setError("Selecciona un domingo para consultar los repertorios."); return; }
    if (value === date) {
      if (data) setError("");
      else setRetry((attempt) => attempt + 1);
    }
    setDate(value);
  }

  return <div className="v2-app v2-public-app">
    <a className="v2-skip-link" href="#selecciona-misa">Ir a las misas</a>
    <header className="v2-public-header"><div className="v2-header-inner"><Brand /><Link href="/login" className="v2-admin-access"><Icon name="lock" size={16} /><span>Acceso Admin</span></Link></div></header>
    <main>
      {!mass ? <section className="v2-hero" aria-labelledby="welcome-title"><div className="v2-container v2-hero-content"><p className="v2-welcome">Bienvenido a</p><h1 id="welcome-title">Coro Cumbres</h1><p className="v2-hero-description">Música que nos une en la fe.</p><GospelTitle initialTitle={gospelTitle} initialDate={initialSunday} initialToday={initialToday} /><span className="v2-hero-rule" aria-hidden="true" /></div></section> : null}
      <section className={`v2-container ${mass ? "v2-playlist-page" : "v2-mass-section"}`} id="selecciona-misa" aria-labelledby="mass-title">
        {mass ? <button className="v2-back-link" onClick={() => setSelectedMass(null)}><Icon name="arrow-left" size={18} />Todas las misas</button> : null}
        <div className="v2-section-heading public-date-heading"><div><h2 id="mass-title">{mass ? "Canciones de la misa" : "Selecciona tu misa"}</h2><p>{mass ? "Abre una canción para seguir la letra." : "Encuentra las canciones de tu celebración."}</p></div><label className="public-date">Domingo<input type="date" value={date} onChange={(event) => changeDate(event.target.value)} aria-label="Domingo del repertorio" /></label></div>
        {!mass ? <div className="v2-mass-grid">{masses.map((item, index) => {
          const style = presentation[item.id];
          if (!style) return null;
          return <button key={item.id} onClick={() => setSelectedMass(item.id)} className={`v2-mass-card v2-mass-${style.tone}`}><span className="v2-mass-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span><span className="v2-mass-icon"><MassIcon massId={style.route} /></span><span className="v2-mass-card-copy"><span className="v2-mass-name">{item.name}</span>{style.time ? <span className="v2-mass-time">{style.time}</span> : null}</span><span className="v2-mass-arrow"><Icon name="arrow-right" size={20} /></span></button>;
        })}</div> : <>
          <div className={`v2-playlist-heading v2-mass-${massPresentation?.tone ?? "midday"}`}><span className="v2-playlist-emblem"><MassIcon massId={massPresentation?.route ?? mass.id} /></span><div><p className="v2-eyebrow">CANTEMOS JUNTOS</p><h1>{mass.name}</h1>{massPresentation?.time ? <p className="v2-playlist-time">{massPresentation.time}</p> : null}</div></div>
          {loading ? <p role="status">Cargando repertorio…</p> : error ? null : playlist ? <PlaylistReader key={`${playlist.id}-${date}`} set={playlist} songs={data?.songs ?? []} /> : <div className="v2-empty-state"><span className="v2-empty-icon"><Icon name="music" size={28} /></span><p>{EMPTY_REPERTOIRE}</p></div>}
        </>}
        {error ? <div className="public-load-error"><p role="alert">{error}</p><button onClick={() => setRetry((value) => value + 1)}>Volver a intentar</button></div> : null}
        {!mass ? <p className="v2-mass-hint"><Icon name="music" size={16} />Selecciona tu celebración y canta con nosotros.</p> : null}
      </section>
    </main><footer className="v2-public-footer"><span>Coro Cumbres</span><span aria-hidden="true">·</span><span>Música</span><span aria-hidden="true">·</span><span>Fe</span><span aria-hidden="true">·</span><span>Comunidad</span></footer>
  </div>;
}
