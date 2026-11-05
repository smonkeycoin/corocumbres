"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { Brand, Icon, MassIcon } from "./Brand";
import { SongEditor, LibrarySongRender } from "@/components/CoroApp";
import { masses, getMass, type MassId } from "@/lib/masses";
import { createSet, flattenSetItems, liturgicalMoments, makeSetItem } from "@/lib/liturgy";
import { makeSong, songToFullLyrics, uid } from "@/lib/song-format";
import type { CoroSet, LiturgicalMoment, SetSection, Song } from "@/lib/types";
import type { ImportSummary, WorkspaceResponse, WorkspaceState } from "@/lib/v2-types";
import { prepareLegacyImport, type LegacyImportPayload } from "@/lib/legacy-import";
import { reorderPlaylistSections } from "@/lib/playlist-editing";
import { GospelEditor } from "./GospelEditor";

type View = "home" | "playlists" | "library" | "settings";
type ImportPayload = LegacyImportPayload;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { ...init, cache: "no-store", headers: { "Content-Type": "application/json", ...init?.headers } });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) throw new Error("Tu sesión terminó. Vuelve a iniciar sesión para continuar.");
    if (response.status === 403) throw new Error("Esta cuenta no tiene acceso de administrador.");
    if (response.status === 409 || response.status === 412) throw new Error("Otro administrador guardó cambios. Descarga tu respaldo antes de recargar; así podrás recuperar tus cambios.");
    throw new Error(typeof result.error === "string" ? result.error : "No fue posible guardar los cambios. Inténtalo de nuevo.");
  }
  return result as T;
}

function download(value: unknown, filename: string) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export function AdminWorkspace({ view, massId = "ninos" }: { view: View; massId?: MassId }) {
  const [data, setData] = useState<WorkspaceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [momentFilter, setMomentFilter] = useState("all");
  const [selectedSongId, setSelectedSongId] = useState<string | null>(null);
  const [editingSong, setEditingSong] = useState<Song | null>(null);
  const [showChords, setShowChords] = useState(true);
  const [addMoment, setAddMoment] = useState<LiturgicalMoment | "free">("entrance");
  const [showPicker, setShowPicker] = useState(false);
  const [importData, setImportData] = useState<ImportPayload | null>(null);
  const [importLabel, setImportLabel] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const dragId = useRef<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try { setData(await request<WorkspaceResponse>("/api/admin/workspace")); setDirty(false); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "No fue posible cargar el espacio del coro."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!dirty && !editingSong) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    const guardNavigation = (event: globalThis.MouseEvent) => {
      const target = event.target;
      const anchor = target instanceof Element ? target.closest("a") : null;
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download") || anchor.getAttribute("href")?.startsWith("#")) return;
      if (!window.confirm("Tienes cambios sin guardar. ¿Quieres salir de esta vista?")) { event.preventDefault(); event.stopPropagation(); }
    };
    window.addEventListener("beforeunload", warn);
    document.addEventListener("click", guardNavigation, true);
    return () => { window.removeEventListener("beforeunload", warn); document.removeEventListener("click", guardNavigation, true); };
  }, [dirty, editingSong]);

  const state = data?.state;
  const mass = getMass(massId) ?? masses[0];
  const setId = state?.assignments[mass.id];
  const activeSet = state?.sets.find((set) => set.id === setId) ?? null;
  const entries = activeSet ? flattenSetItems(activeSet) : [];
  const songsById = useMemo(() => new Map((state?.songs ?? []).map((song) => [song.id, song])), [state?.songs]);
  const categories = useMemo(() => [...new Set((state?.songs ?? []).map((song) => song.category).filter((value): value is string => Boolean(value)))].sort(), [state?.songs]);
  const filteredSongs = useMemo(() => {
    const needle = query.toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    return (state?.songs ?? []).filter((song) => {
      const searchable = [song.title, song.subtitle, song.category, ...song.tags, songToFullLyrics(song)].join(" ").toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return (!needle || searchable.includes(needle)) && (category === "all" || song.category === category) && (momentFilter === "all" || song.liturgicalMoments?.includes(momentFilter as LiturgicalMoment));
    });
  }, [state?.songs, query, category, momentFilter]);
  const selectedSong = songsById.get(selectedSongId ?? "") ?? filteredSongs[0] ?? null;

  function change(updater: (current: WorkspaceState) => WorkspaceState) {
    setData((current) => current ? { ...current, state: updater(current.state) } : current);
    setDirty(true);
    setNotice("");
  }

  function updateSet(updater: (set: CoroSet) => CoroSet) {
    if (!activeSet) return;
    change((current) => ({ ...current, sets: current.sets.map((set) => set.id === activeSet.id ? { ...updater(set), updatedAt: new Date().toISOString() } : set) }));
  }

  async function save(nextState = state): Promise<WorkspaceResponse | null> {
    if (!data || !nextState) return null;
    setBusy(true); setError(""); setNotice("");
    try {
      const saved = await request<WorkspaceResponse>("/api/admin/workspace", { method: "PUT", body: JSON.stringify({ state: nextState, etag: data.etag }) });
      setData(saved); setDirty(false); setNotice("Cambios guardados. El portal conserva la última versión publicada.");
      return saved;
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No fue posible guardar."); return null; }
    finally { setBusy(false); }
  }

  async function publish() {
    if (!data || !activeSet) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const saved = dirty ? await request<WorkspaceResponse>("/api/admin/workspace", { method: "PUT", body: JSON.stringify({ state: data.state, etag: data.etag }) }) : data;
      // Keep the returned revision even if publication fails after a successful save.
      setData(saved); setDirty(false);
      const result = await request<WorkspaceResponse>("/api/admin/publish", { method: "POST", body: JSON.stringify({ massId: mass.id, setId: activeSet.id, etag: saved.etag }) });
      setData(result); setNotice("Playlist publicada. Ya está disponible para el coro en todos los dispositivos.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No fue posible publicar."); }
    finally { setBusy(false); }
  }

  function createPlaylist() {
    const created = createSet("playlist", `${mass.name}${mass.time ? ` · ${mass.time}` : ""}`);
    change((current) => ({ ...current, sets: [...current.sets, created], assignments: { ...current.assignments, [mass.id]: created.id } }));
    setShowPicker(true);
  }

  function addSong(song: Song) {
    if (!activeSet) return;
    const moment = liturgicalMoments.find((item) => item.id === addMoment);
    const section: SetSection = { id: uid("section"), type: addMoment, label: moment?.label ?? "Canciones", position: activeSet.sections.length, isEnabled: true, items: [makeSetItem(song.id, 0)] };
    updateSet((set) => ({ ...set, sections: [...set.sections, section] }));
    setNotice(`“${song.title}” agregada al borrador.`);
  }

  function moveItem(id: string, targetId: string) {
    if (!activeSet || id === targetId) return;
    const from = entries.findIndex((entry) => entry.item.id === id);
    const to = entries.findIndex((entry) => entry.item.id === targetId);
    if (from < 0 || to < 0) return;
    const reordered = [...entries];
    const [moved] = reordered.splice(from, 1); reordered.splice(to, 0, moved);
    updateSet((set) => ({ ...set, sections: reorderPlaylistSections(set, reordered.map((entry) => entry.item.id)) }));
  }

  function removeItem(id: string) {
    updateSet((set) => ({ ...set, sections: set.sections.map((section) => ({ ...section, items: section.items.filter((item) => item.id !== id).map((item, position) => ({ ...item, position })) })) }));
  }

  function duplicateSet() {
    if (!activeSet) return;
    const copy = { ...activeSet, id: uid("set"), name: `${activeSet.name} · copia`, shareId: uid("share"), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), sections: activeSet.sections.map((section) => ({ ...section, id: uid("section"), items: section.items.map((item) => ({ ...item, id: uid("item") })) })) };
    change((current) => ({ ...current, sets: [...current.sets, copy], assignments: { ...current.assignments, [mass.id]: copy.id } }));
  }

  async function archivePlaylist() {
    if (!state || !activeSet) return;
    const next: WorkspaceState = {
      ...state,
      sets: state.sets.map((set) => set.id === activeSet.id ? { ...set, isArchived: true, updatedAt: new Date().toISOString() } : set),
      assignments: Object.fromEntries(Object.entries(state.assignments).map(([id, assigned]) => [id, assigned === activeSet.id ? null : assigned])) as WorkspaceState["assignments"],
    };
    change(() => next);
    if (await save(next)) setNotice("Playlist archivada. Sus canciones y la última versión publicada se conservan.");
  }

  async function findLegacyData() {
    setError("");
    setBusy(true);
    try { setImportData(await prepareLegacyImport(localStorage)); setImportLabel("Datos de este navegador"); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudieron leer los datos locales."); }
    finally { setBusy(false); }
  }

  async function saveSong(song: Song) {
    if (!state) return;
    const next = { ...state, songs: state.songs.some((item) => item.id === song.id) ? state.songs.map((item) => item.id === song.id ? song : item) : [...state.songs, song] };
    change(() => next);
    if (await save(next)) { setEditingSong(null); setSelectedSongId(song.id); setNotice("Canción guardada en el repertorio. Publica las playlists para actualizar sus letras públicas."); }
  }

  async function readImportFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError("");
    try {
      if (file.size > 3_000_000) throw new Error("El archivo supera el límite de 3 MB.");
      const parsed = JSON.parse(await file.text());
      const source = parsed.state ?? parsed;
      const payload = Array.isArray(source) ? { songs: source, sets: [] } : { songs: source.songs ?? [], sets: source.sets ?? [] };
      if (!Array.isArray(payload.songs) || !Array.isArray(payload.sets)) throw new Error("Selecciona un respaldo JSON de canciones y playlists.");
      setImportData(payload); setImportLabel(file.name);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No fue posible leer el respaldo."); }
  }

  async function importBackup() {
    if (!data || !importData) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const saved = dirty ? await request<WorkspaceResponse>("/api/admin/workspace", { method: "PUT", body: JSON.stringify({ state: data.state, etag: data.etag }) }) : data;
      setData(saved); setDirty(false);
      const result = await request<WorkspaceResponse & { summary?: ImportSummary }>("/api/admin/import", { method: "POST", body: JSON.stringify({ ...importData, etag: saved.etag }) });
      setData(result); setImportData(null);
      setNotice(result.summary ? `Importación completa: ${result.summary.addedSongs} canciones y ${result.summary.addedSets} playlists incorporadas. Los originales y las versiones en conflicto se conservaron.` : "Importación completa. Los originales se conservaron.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No fue posible importar."); }
    finally { setBusy(false); }
  }

  if (loading) return <div className="admin-loading" role="status"><span className="admin-loading-dot" /><p>Preparando el espacio del coro…</p></div>;
  if (!data || !state) return <div className="admin-panel admin-unavailable"><Icon name="lock" size={32} /><h1>No pudimos abrir el workspace</h1><p role="alert">{error}</p><div className="admin-actions"><button className="v2-button primary" onClick={() => void load()}>Reintentar</button><Link className="v2-button secondary" href="/admin/login">Iniciar sesión</Link></div></div>;

  return (
    <section className="admin-workspace">
      <div className="admin-page-title">
        <div><p className="v2-eyebrow">CORO CUMBRES</p><h1>{view === "home" ? "Unidos en cada celebración" : view === "playlists" ? "Playlists" : view === "library" ? "Repertorio completo" : "Configuración"}</h1><p>{view === "home" ? "Prepara la música. Comparte la fe." : view === "playlists" ? "Las canciones de cada misa, en el orden perfecto." : view === "library" ? `${state.songs.length} canciones para acompañar nuestra oración.` : "Cuida el repertorio y conserva la historia del coro."}</p></div>
        {view === "library" ? <button disabled={busy || Boolean(editingSong)} className="v2-button primary" onClick={() => setEditingSong(makeSong("Nueva canción", ""))}><Icon name="plus" size={18} />Nueva canción</button> : null}
      </div>
      <div className="admin-messages" aria-live="polite">
        {notice ? <p className="admin-notice"><Icon name="check" size={18} />{notice}</p> : null}
        {error ? <div className="admin-error" role="alert"><p>{error}</p><div className="admin-actions"><button className="v2-button secondary" onClick={() => download(state, "coro-cumbres-respaldo-pendiente.json")}>Descargar respaldo</button><button className="v2-button secondary" onClick={() => { if (!dirty || confirm("¿Ya descargaste tus cambios pendientes? Recargar reemplazará esta vista por la versión guardada.")) void load(); }}>Recargar versión guardada</button></div></div> : null}
      </div>
      <fieldset className="admin-content" disabled={busy}>
        {view === "home" || view === "playlists" ? <div className={`admin-masses ${view === "playlists" ? "compact" : ""}`}>
          {masses.map((item) => <Link key={item.id} className={`admin-mass-card v2-mass-${item.tone} ${view === "playlists" && mass.id === item.id ? "selected" : ""}`} href={`/admin/playlists?misa=${item.id}`} aria-current={view === "playlists" && mass.id === item.id ? "page" : undefined}>
            <MassIcon massId={item.id} className="v2-mass-icon" /><div><span className="admin-mass-number">{item.number}</span><h2>{item.name}</h2><p>{item.time ?? "Horario pendiente de confirmación"}</p></div><span className="admin-card-footer">{state.published[item.id] ? "Publicada" : "Por preparar"}<Icon name="arrow-right" size={18} /></span>
          </Link>)}
        </div> : null}
        {view === "home" ? <>
          <Link href="/admin/repertorio" className="admin-library-cta"><span className="admin-cta-icon"><Icon name="music" size={28} /></span><div><h2>Repertorio completo</h2><p>Encuentra, edita y suma nuevas canciones a nuestra biblioteca.</p></div><span className="v2-button primary">Ver repertorio<Icon name="arrow-right" size={18} /></span></Link>
          <div className="admin-home-notes"><div><Icon name="check" size={20} /><p><strong>Prepara con tranquilidad.</strong> Los borradores son privados hasta que eliges publicar.</p></div><Link href="/admin/configuracion"><Icon name="upload" size={20} /><span>Recuperar canciones y playlists de la versión anterior<Icon name="arrow-right" size={18} /></span></Link></div>
        </> : null}
        {view === "playlists" ? <>
          <section className="admin-panel">
            <div className="admin-panel-heading"><div className="admin-mass-heading"><span className={`admin-round-mass v2-mass-${mass.tone}`}><MassIcon massId={mass.id} className="v2-mass-icon" /></span><div><h2>{mass.name}</h2><p>{mass.time ?? "Horario pendiente de confirmación"}</p></div></div><Link className="v2-button secondary" href={`/misa/${mass.id}`} target="_blank" rel="noopener noreferrer">Ver publicada<Icon name="external" size={16} /></Link></div>
            <div className="admin-assignment"><label htmlFor="mass-playlist">Playlist de esta misa</label><div><select id="mass-playlist" value={activeSet?.id ?? ""} onChange={(event) => change((current) => ({ ...current, sets: current.sets.map((set) => set.id === event.target.value ? { ...set, isArchived: false } : set), assignments: { ...current.assignments, [mass.id]: event.target.value || null } }))}><option value="">Selecciona una playlist</option>{state.sets.filter((set) => showArchived || !set.isArchived || set.id === activeSet?.id).map((set) => <option key={set.id} value={set.id}>{set.name}{set.isArchived ? " · archivada (restaurar)" : ""}</option>)}</select><button className="v2-button secondary" onClick={createPlaylist}><Icon name="plus" size={16} />Nueva playlist</button></div><label className="admin-check-label"><input type="checkbox" checked={showArchived} onChange={(event) => setShowArchived(event.target.checked)} />Mostrar archivadas</label></div>
            {activeSet ? <>
              <div className="admin-playlist-title"><label className="admin-grow">Nombre de la playlist<input aria-label="Nombre de la playlist" value={activeSet.name} onChange={(event) => updateSet((set) => ({ ...set, name: event.target.value }))} /></label><details className="admin-more"><summary>Más opciones</summary><div><button onClick={() => download({ songs: state.songs.filter((song) => entries.some((entry) => entry.item.songId === song.id)), sets: [activeSet] }, "coro-cumbres-playlist.json")}><Icon name="download" size={17} />Exportar playlist</button><button onClick={duplicateSet}><Icon name="copy" size={17} />Duplicar playlist</button><button onClick={() => activeSet.isArchived ? updateSet((set) => ({ ...set, isArchived: false })) : void archivePlaylist()}><Icon name="archive" size={17} />{activeSet.isArchived ? "Restaurar" : "Archivar"}</button></div></details></div>
              {activeSet.isArchived ? <p className="admin-inline-note">Esta playlist está archivada. Restáurala desde “Más opciones” antes de publicarla.</p> : null}
              <div className="admin-list-heading"><h3>Canciones en la playlist</h3><span>{entries.length} canciones</span></div>
              {entries.length ? <ol className="admin-song-order">{entries.map(({ section, item }, index) => {
                const song = songsById.get(item.songId);
                return <li key={item.id} draggable onDragStart={(event) => { dragId.current = item.id; event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", item.id); }} onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; }} onDrop={(event) => { event.preventDefault(); moveItem(dragId.current ?? event.dataTransfer.getData("text/plain"), item.id); dragId.current = null; }} onDragEnd={() => { dragId.current = null; }}>
                  <span className="admin-song-index">{String(index + 1).padStart(2, "0")}</span><span className="admin-song-icon"><Icon name="music" size={18} /></span><div className="admin-song-label"><strong>{song?.title ?? "Canción pendiente de recuperar"}</strong><span>{section.type === "free" ? "Sin momento asignado" : section.label}{section.isEnabled === false ? " · No se publica" : ""}</span></div><div className="admin-row-actions"><button className="admin-icon-button" aria-label={`Subir ${song?.title ?? "canción"}`} title="Subir" disabled={index === 0} onClick={() => moveItem(item.id, entries[index - 1].item.id)}><Icon name="up" size={17} /></button><button className="admin-icon-button" aria-label={`Bajar ${song?.title ?? "canción"}`} title="Bajar" disabled={index === entries.length - 1} onClick={() => moveItem(item.id, entries[index + 1].item.id)}><Icon name="down" size={17} /></button><button className="admin-icon-button admin-remove" aria-label={`Quitar ${song?.title ?? "canción"} de la playlist`} title="Quitar de la playlist" onClick={() => removeItem(item.id)}><Icon name="close" size={17} /></button><span className="admin-drag-handle" aria-hidden="true"><Icon name="grip" size={16} /></span></div>
                </li>;
              })}</ol> : <div className="admin-playlist-empty"><Icon name="music" size={32} /><h3>La celebración empieza con una canción</h3><p>Agrega canciones del repertorio y ordénalas para esta misa.</p></div>}
              <button className="v2-button primary admin-add-song" onClick={() => { setShowPicker(!showPicker); if (!showPicker) setTimeout(() => searchInput.current?.focus(), 0); }}><Icon name={showPicker ? "close" : "plus"} size={18} />{showPicker ? "Cerrar repertorio" : "Agregar canción"}</button>
              {showPicker ? <div className="admin-song-picker"><div className="admin-picker-controls"><label className="admin-grow">Buscar en el repertorio<span className="admin-search"><Icon name="search" size={18} /><input ref={searchInput} aria-label="Buscar en el repertorio" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Título, letra o categoría" /></span></label><label htmlFor="playlist-add-moment">Momento litúrgico<select id="playlist-add-moment" aria-label="Momento litúrgico" value={addMoment} onChange={(event) => setAddMoment(event.target.value as LiturgicalMoment | "free")}><option value="free">Sin momento</option>{liturgicalMoments.map((moment) => <option key={moment.id} value={moment.id}>{moment.short}</option>)}</select></label></div><ul>{filteredSongs.map((song) => <li key={song.id}><div><strong>{song.title}</strong><small>{song.category ?? (song.liturgicalMoments ?? []).map((id) => liturgicalMoments.find((moment) => moment.id === id)?.short).filter(Boolean).join(" · ")}</small></div><button className="v2-button secondary" aria-label={`Agregar ${song.title}`} onClick={() => addSong(song)}><Icon name="plus" size={16} />Agregar</button></li>)}</ul>{!filteredSongs.length ? <p className="admin-no-results">No encontramos canciones con esa búsqueda.</p> : null}</div> : null}
              <div className="admin-publish-bar"><div><span className={`admin-status ${dirty ? "pending" : ""}`}>{dirty ? "Cambios sin guardar" : "Borrador guardado"}</span><p>{state.published[mass.id] ? `Última publicación: ${dateLabel(state.published[mass.id]!.publishedAt)}` : "Todavía no has publicado esta misa."}</p></div><div className="admin-actions"><Link href={`/presenter?set=${encodeURIComponent(activeSet.id)}`} className="v2-button secondary"><Icon name="presenter" size={17} />Presentar</Link><button className="v2-button secondary" disabled={!dirty} onClick={() => void save()}>Guardar borrador</button><button className="v2-button primary" disabled={activeSet.isArchived} onClick={() => void publish()}><Icon name="check" size={18} />{busy ? "Publicando…" : entries.some((entry) => entry.section.isEnabled !== false) ? "Guardar y publicar" : "Publicar playlist vacía"}</button></div></div>
            </> : <div className="admin-playlist-empty"><Icon name="playlists" size={34} /><h3>Prepara las canciones de esta misa</h3><p>Selecciona una playlist existente o crea una nueva. Tus playlists anteriores se conservan.</p><button className="v2-button primary" onClick={createPlaylist}><Icon name="plus" size={18} />Crear playlist</button></div>}
          </section>
        </> : null}
        {view === "library" ? <div className="admin-library-layout">
          <aside className="admin-panel admin-library-list"><label className="admin-search"><Icon name="search" size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar una canción" aria-label="Buscar en el repertorio" /></label><div className="admin-library-filters">{categories.length ? <select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Categoría"><option value="all">Todas las categorías</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select> : null}<select value={momentFilter} onChange={(event) => setMomentFilter(event.target.value)} aria-label="Momento litúrgico"><option value="all">Todos los momentos</option>{liturgicalMoments.map((moment) => <option key={moment.id} value={moment.id}>{moment.short}</option>)}</select></div><p className="admin-result-count">{filteredSongs.length} canciones</p><ul>{filteredSongs.map((song) => <li key={song.id}><button className={selectedSong?.id === song.id ? "selected" : ""} onClick={() => { if (!editingSong || confirm("¿Quieres salir del editor sin guardar esta canción?")) { setSelectedSongId(song.id); setEditingSong(null); } }}><span className="admin-song-icon"><Icon name="music" size={18} /></span><span><strong>{song.title}</strong><small>{song.category ?? ((song.liturgicalMoments ?? []).map((id) => liturgicalMoments.find((moment) => moment.id === id)?.short).filter(Boolean).join(" · ") || "Repertorio del coro")}</small></span><Icon name="chevron-right" size={16} /></button></li>)}</ul>{!filteredSongs.length ? <p className="admin-no-results">No encontramos canciones. Prueba con otra palabra o categoría.</p> : null}</aside>
          <section className="admin-panel admin-song-detail">{editingSong ? <><div className="admin-panel-heading"><div><p className="v2-eyebrow">EDITOR DEL REPERTORIO</p><h2>{state.songs.some((song) => song.id === editingSong.id) ? "Editar canción" : "Nueva canción"}</h2></div></div><SongEditor key={editingSong.id} song={editingSong} onSave={(song) => void saveSong(song)} onCancel={() => setEditingSong(null)} /></> : selectedSong ? <><div className="admin-panel-heading"><div><p className="v2-eyebrow">REPERTORIO</p><h2>{selectedSong.title}</h2>{selectedSong.subtitle ? <p>{selectedSong.subtitle}</p> : null}</div><button className="v2-button secondary" onClick={() => setEditingSong(selectedSong)}><Icon name="edit" size={17} />Editar</button></div><div className="admin-song-metadata">{selectedSong.category ? <span>{selectedSong.category}</span> : null}{selectedSong.liturgicalMoments?.map((id) => <span key={id}>{liturgicalMoments.find((moment) => moment.id === id)?.short}</span>)}{selectedSong.tags.map((tag) => <span key={tag}>{tag}</span>)}</div><label className="admin-check-label admin-chords-toggle"><input type="checkbox" checked={showChords} onChange={(event) => setShowChords(event.target.checked)} />Mostrar acordes disponibles</label><div className="admin-lyrics"><LibrarySongRender song={selectedSong} showChords={showChords} /></div>{selectedSong.source || selectedSong.notes ? <details className="admin-song-source"><summary>Notas y fuente</summary>{selectedSong.source ? <p>{selectedSong.source}</p> : null}{selectedSong.notes ? <p>{selectedSong.notes}</p> : null}</details> : null}</> : <div className="admin-playlist-empty"><Icon name="music" size={34} /><h2>Tu repertorio, en un solo lugar</h2><p>Agrega una canción o recupera un respaldo desde Configuración.</p></div>}</section>
        </div> : null}
        {view === "settings" ? <div className="admin-settings-grid">
          <GospelEditor />
          <section className="admin-panel"><Icon name="download" size={28} /><h2>Respaldo del coro</h2><p>Descarga todas las canciones, letras, acordes, playlists y publicaciones en un archivo JSON.</p><p className="admin-setting-stat">{state.songs.length} canciones · {state.sets.length} playlists</p><button className="v2-button secondary" onClick={() => download(state, `coro-cumbres-respaldo-${new Date().toISOString().slice(0, 10)}.json`)}><Icon name="download" size={18} />Descargar respaldo</button></section>
          <section className="admin-panel"><Icon name="upload" size={28} /><h2>Recuperar la versión anterior</h2><p>Busca en este navegador las canciones y playlists que guardabas antes de V2. Conservaremos los originales y las versiones distintas.</p><button className="v2-button secondary" onClick={() => void findLegacyData()}><Icon name="search" size={18} />Buscar datos locales</button><p className="admin-small">Hazlo desde el navegador y dominio donde usabas CORO CUMBRES.</p></section>
          <section className="admin-panel"><Icon name="upload" size={28} /><h2>Importar un respaldo</h2><p>Agrega un archivo JSON de canciones o playlists. Las coincidencias idénticas se omiten; los conflictos se conservan como variantes.</p><input className="admin-file-input" ref={fileInput} type="file" accept="application/json,.json" onChange={(event) => void readImportFile(event)} /><button className="v2-button secondary" onClick={() => fileInput.current?.click()}><Icon name="upload" size={18} />Elegir archivo JSON</button></section>
          <section className="admin-panel"><Icon name="lock" size={28} /><h2>Acceso administrativo</h2><p>Solo las cuentas de Google autorizadas pueden gestionar el coro. La configuración de acceso se administra de forma segura en el servidor.</p><div className="admin-schedule-list">{masses.map((item) => <p key={item.id}><strong>{item.name}</strong><span>{item.time ?? "Horario pendiente de confirmación"}</span></p>)}</div></section>
          {importData ? <section className="admin-panel admin-import-preview"><h2>Revisa antes de importar</h2><p>{importLabel}</p><strong>{importData.songs.length} canciones · {importData.sets.length} playlists encontradas</strong><p>La importación no publica ni elimina canciones. Podrás asignar las playlists recuperadas a una misa después.</p><div className="admin-actions"><button className="v2-button secondary" onClick={() => download(importData, "coro-cumbres-original-recuperado.json")}><Icon name="download" size={17} />Guardar copia original</button><button className="v2-button primary" disabled={!importData.songs.length && !importData.sets.length} onClick={() => void importBackup()}><Icon name="upload" size={17} />Importar y conservar originales</button><button className="v2-button secondary" onClick={() => setImportData(null)}>Cancelar</button></div></section> : null}
        </div> : null}
        {dirty && (view !== "playlists" || !activeSet) ? <div className="admin-unsaved-bar"><span>Cambios pendientes de guardar</span><button className="v2-button primary" onClick={() => void save()}>Guardar cambios</button></div> : null}
      </fieldset>
      {busy ? <p className="admin-saving" role="status">Guardando de forma segura…</p> : null}
      <footer className="admin-footer"><Brand compact href="/" /><span>Una misma misión, en cada celebración.</span></footer>
    </section>
  );
}
