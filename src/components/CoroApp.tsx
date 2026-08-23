"use client";

import { ChangeEvent, CSSProperties, DragEvent, MouseEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { flattenSetItems, libraryFilters, liturgicalMoments, createSet, makeSetItem, normalizeItems, setTypeLabel, sortItems, sortSections } from "@/lib/liturgy";
import { makeSong, sectionLines, sectionsToText, songToFullLyrics, textToSections } from "@/lib/song-format";
import { loadLibrary, loadPrefs, loadSets, saveLibrary, savePrefs, saveSets, validateImport, validateSetImport } from "@/lib/storage";
import { publishPresenterState } from "@/lib/presenter-channel";
import { CoroSet, LiturgicalMoment, SetItem, SetSection, SetType, Song } from "@/lib/types";

type MainView = "sets" | "library";

function nowIso() {
  return new Date().toISOString();
}

function relativeDate(value: string) {
  const days = Math.round((Date.now() - new Date(value).getTime()) / 86_400_000);
  if (days <= 0) return "Actualizada hoy";
  if (days === 1) return "Actualizada ayer";
  return `Actualizada hace ${days} dias`;
}

function downloadJson(value: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function shareUrlFor(shareId: string) {
  return `https://corocumbres.online/p/${encodeURIComponent(shareId)}`;
}

function filenameFor(name: string) {
  return name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function closeDetails(event: MouseEvent<HTMLElement>) {
  event.currentTarget.closest("details")?.removeAttribute("open");
}

function songHasChords(song?: Song | null) {
  return Boolean(song?.sections.some((section) => section.lines?.some((line) => line.chords.length)));
}

function useCoroStore() {
  const [ready, setReady] = useState(false);
  const [songs, setSongs] = useState<Song[]>([]);
  const [sets, setSets] = useState<CoroSet[]>([]);
  const [fontScale, setFontScale] = useState(1);

  useEffect(() => {
    setSongs(loadLibrary());
    setSets(loadSets());
    setFontScale(loadPrefs().fontScale);
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) saveLibrary(songs);
  }, [ready, songs]);

  useEffect(() => {
    if (ready) saveSets(sets);
  }, [ready, sets]);

  useEffect(() => {
    if (ready) {
      const prefs = loadPrefs();
      savePrefs({ schemaVersion: 1, fontScale, theme: prefs.theme ?? "blue", showChords: prefs.showChords ?? false });
    }
  }, [ready, fontScale]);

  return { ready, songs, setSongs, sets, setSets, fontScale, setFontScale };
}

export function Dashboard() {
  const router = useRouter();
  const { ready, songs, setSongs, sets, setSets, fontScale, setFontScale } = useCoroStore();
  const [view, setView] = useState<MainView>("sets");
  const [query, setQuery] = useState("");
  const [momentFilter, setMomentFilter] = useState<"all" | LiturgicalMoment>("all");
  const [selectedSongId, setSelectedSongId] = useState<string | null>(null);
  const [openSetId, setOpenSetId] = useState<string | null>(null);
  const [editingSong, setEditingSong] = useState(false);
  const [previewTheme, setPreviewTheme] = useState<"blue" | "black">("blue");
  const [previewFontScale, setPreviewFontScale] = useState(1);
  const [previewShowChords, setPreviewShowChords] = useState(true);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [dragItemId, setDragItemId] = useState<string | null>(null);
  const [dragSongId, setDragSongId] = useState<string | null>(null);
  const [hotSectionId, setHotSectionId] = useState<string | null>(null);
  const libraryFileRef = useRef<HTMLInputElement>(null);
  const setFileRef = useRef<HTMLInputElement>(null);

  const visibleSets = useMemo(() => sets.filter((set) => !set.isArchived).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()), [sets]);
  const activeSet = sets.find((set) => set.id === openSetId) ?? visibleSets[0] ?? null;
  const selectedSong = songs.find((song) => song.id === selectedSongId) ?? songs[0] ?? null;

  useEffect(() => {
    const requestedSetId = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("set") : null;
    if (requestedSetId && visibleSets.some((set) => set.id === requestedSetId)) {
      setOpenSetId(requestedSetId);
      return;
    }
    if (!openSetId && visibleSets[0]) setOpenSetId(visibleSets[0].id);
  }, [openSetId, visibleSets]);

  useEffect(() => {
    if (!selectedSongId && songs[0]) setSelectedSongId(songs[0].id);
  }, [selectedSongId, songs]);

  const filteredSongs = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return songs.filter((song) => {
      const lyrics = song.sections.flatMap((s) => s.slides.flat()).join(" ").toLowerCase();
      const metadata = [song.title, song.subtitle, song.category, song.source, song.notes, ...song.tags].join(" ").toLowerCase();
      const matchesQuery = !needle || metadata.includes(needle) || lyrics.includes(needle);
      const matchesMoment = momentFilter === "all" || song.liturgicalMoments?.includes(momentFilter);
      return matchesQuery && matchesMoment;
    });
  }, [query, songs, momentFilter]);

  function updateSet(id: string, updater: (set: CoroSet) => CoroSet) {
    setSets((current) => current.map((set) => (set.id === id ? updater(set) : set)));
  }

  function addSet(type: SetType) {
    const set = createSet(type);
    setSets([set, ...sets]);
    setOpenSetId(set.id);
    setRenamingId(set.id);
    setShowCreateMenu(false);
    setView("sets");
  }

  function renameSet(id: string, name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    updateSet(id, (set) => ({ ...set, name: trimmed, updatedAt: nowIso() }));
    setRenamingId(null);
  }

  function archiveSet(id: string) {
    const set = sets.find((item) => item.id === id);
    if (!set || !confirm(`Archivar "${set.name}"?`)) return;
    updateSet(id, (item) => ({ ...item, isArchived: true, updatedAt: nowIso() }));
    if (openSetId === id) setOpenSetId(null);
  }

  function duplicateSet(id: string) {
    const source = sets.find((set) => set.id === id);
    if (!source) return;
    const copy = createSet(source.type, `${source.name} copia`);
    copy.date = source.date;
    copy.notes = source.notes;
    copy.sections = sortSections(source.sections).map((section) => ({
      ...section,
      id: `${section.id}-copy-${Date.now()}`,
      items: sortItems(section.items).map((item, position) => ({ ...item, id: `${item.id}-copy-${Date.now()}-${position}`, position }))
    }));
    setSets([copy, ...sets]);
    setOpenSetId(copy.id);
    setRenamingId(copy.id);
  }

  function addSongToSection(setId: string, sectionId: string, songId: string) {
    updateSet(setId, (set) => ({
      ...set,
      updatedAt: nowIso(),
      sections: sortSections(set.sections).map((section) =>
        section.id === sectionId
          ? { ...section, items: normalizeItems([...sortItems(section.items), makeSetItem(songId, section.items.length)]) }
          : section
      )
    }));
  }

  function removeItem(setId: string, sectionId: string, itemId: string) {
    updateSet(setId, (set) => ({
      ...set,
      updatedAt: nowIso(),
      sections: set.sections.map((section) =>
        section.id === sectionId ? { ...section, items: normalizeItems(sortItems(section.items).filter((item) => item.id !== itemId)) } : section
      )
    }));
  }

  function moveItem(setId: string, sectionId: string, itemId: string, direction: -1 | 1) {
    updateSet(setId, (set) => ({
      ...set,
      updatedAt: nowIso(),
      sections: set.sections.map((section) => {
        if (section.id !== sectionId) return section;
        const items = sortItems(section.items);
        const index = items.findIndex((item) => item.id === itemId);
        const target = index + direction;
        if (index < 0 || target < 0 || target >= items.length) return section;
        [items[index], items[target]] = [items[target], items[index]];
        return { ...section, items: normalizeItems(items) };
      })
    }));
  }

  function reorderItem(setId: string, sectionId: string, draggedId: string, targetId: string) {
    if (draggedId === targetId) return;
    updateSet(setId, (set) => ({
      ...set,
      updatedAt: nowIso(),
      sections: set.sections.map((section) => {
        if (section.id !== sectionId) return section;
        const items = sortItems(section.items);
        const from = items.findIndex((item) => item.id === draggedId);
        const to = items.findIndex((item) => item.id === targetId);
        if (from < 0 || to < 0) return section;
        const [moved] = items.splice(from, 1);
        items.splice(to, 0, moved);
        return { ...section, items: normalizeItems(items) };
      })
    }));
  }

  function deleteSong(song: Song) {
    if (!confirm(`Eliminar "${song.title}" de la biblioteca local? Se quitara de todos los Sets.`)) return;
    setSongs(songs.filter((item) => item.id !== song.id));
    setSets(sets.map((set) => ({
      ...set,
      updatedAt: nowIso(),
      sections: set.sections.map((section) => ({ ...section, items: normalizeItems(sortItems(section.items).filter((item) => item.songId !== song.id)) }))
    })));
  }

  function presentSet(set: CoroSet) {
    const flat = flattenSetItems(set);
    const first = flat[0] ?? null;
    const firstSong = songs.find((song) => song.id === first?.item.songId) ?? null;
    const prefs = loadPrefs();
    publishPresenterState({
      schemaVersion: 1,
      setId: set.id,
      setItemId: first?.item.id ?? null,
      setSectionId: first?.section.id ?? null,
      sectionLabel: first?.section.label ?? "",
      itemIndex: 0,
      songId: first?.item.songId ?? null,
      fullLyrics: songToFullLyrics(firstSong),
      songIndex: 0,
      black: false,
      theme: prefs.theme ?? "blue",
      showChords: prefs.showChords ?? false,
      fontScale
    });
    router.push(`/presenter?set=${set.id}`);
  }

  function exportSet(set: CoroSet) {
    const songIds = new Set(flattenSetItems(set).map(({ item }) => item.songId));
    downloadJson(
      {
        app: "CORO CUMBRES",
        schema: "coro-cumbres-set-v1",
        schemaVersion: 1,
        shareUrl: set.shareId ? shareUrlFor(set.shareId) : null,
        set,
        songs: songs.filter((song) => songIds.has(song.id))
      },
      `coro-cumbres-set-${filenameFor(set.name)}.json`
    );
  }

  async function importLibrary(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text()) as unknown;
      if (!validateImport(parsed)) throw new Error("Invalid schema");
      setSongs(parsed);
      alert("Biblioteca importada.");
    } catch {
      alert("El archivo no tiene un formato valido de CORO CUMBRES.");
    } finally {
      event.target.value = "";
    }
  }

  async function importSet(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text()) as { set?: unknown; songs?: unknown };
      if (!validateSetImport(parsed.set)) throw new Error("Invalid set");
      const importedSet = parsed.set;
      setSets([importedSet, ...sets.filter((set) => set.id !== importedSet.id)]);
      if (validateImport(parsed.songs)) setSongs([...parsed.songs.filter((song) => !songs.some((existing) => existing.id === song.id)), ...songs]);
      setOpenSetId(importedSet.id);
    } catch {
      alert("El archivo no tiene un formato valido de Set CORO CUMBRES.");
    } finally {
      event.target.value = "";
    }
  }

  if (!ready) return <main className="app-shell">Cargando CORO CUMBRES...</main>;

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">CORO CUMBRES</div>
        <nav className="nav-tabs">
          <button className={view === "library" ? "active-tab" : ""} onClick={() => setView("library")}>Biblioteca</button>
          <button className={view === "sets" ? "active-tab" : ""} onClick={() => setView("sets")}>Sets</button>
          <button disabled={!activeSet} onClick={() => activeSet && presentSet(activeSet)}>Presentar</button>
        </nav>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por titulo o letra" />
        <button onClick={() => window.open("/display", "_blank")}>Display</button>
        <button className="primary" disabled={!activeSet} onClick={() => activeSet && presentSet(activeSet)}>Presentar</button>
      </header>

      {view === "sets" ? (
        <section className="three-pane-shell">
          <SetSidebar
            sets={visibleSets}
            activeSetId={activeSet?.id ?? null}
            renamingId={renamingId}
            showCreateMenu={showCreateMenu}
            setShowCreateMenu={setShowCreateMenu}
            setRenamingId={setRenamingId}
            renameSet={renameSet}
            addSet={addSet}
            openSet={setOpenSetId}
          />
          {activeSet ? (
            <SetWorkspace
              set={activeSet}
              songs={songs}
              addSongToSection={addSongToSection}
              setSelectedSongId={setSelectedSongId}
              removeItem={removeItem}
              moveItem={moveItem}
              reorderItem={reorderItem}
              dragItemId={dragItemId}
              setDragItemId={setDragItemId}
              dragSongId={dragSongId}
              setDragSongId={setDragSongId}
              hotSectionId={hotSectionId}
              setHotSectionId={setHotSectionId}
              presentSet={presentSet}
              exportSet={exportSet}
              duplicateSet={duplicateSet}
              archiveSet={archiveSet}
            />
          ) : null}
          <LibraryPane
            songs={filteredSongs}
            query={query}
            setQuery={setQuery}
            momentFilter={momentFilter}
            setMomentFilter={setMomentFilter}
            selectedSong={selectedSong}
            setSelectedSongId={setSelectedSongId}
            activeSet={activeSet}
            addSongToSection={addSongToSection}
            setDragSongId={setDragSongId}
            setView={setView}
          />
        </section>
      ) : (
        <section className="library-workspace">
          <aside className="panel library-list-panel">
            <h2>Biblioteca</h2>
            <div className="actions">
              <button onClick={() => {
                const song = makeSong("Nueva cancion", "[Verso 1]\n\nPega aqui la letra");
                setSongs([song, ...songs]);
                setSelectedSongId(song.id);
                setEditingSong(true);
              }}>Nueva canción</button>
              <button onClick={() => downloadJson(songs, `coro-cumbres-library-${new Date().toISOString().slice(0, 10)}.json`)}>Exportar</button>
              <button onClick={() => libraryFileRef.current?.click()}>Importar Biblioteca</button>
              <button onClick={() => setFileRef.current?.click()}>Importar Set</button>
              <input ref={libraryFileRef} type="file" accept="application/json" hidden onChange={importLibrary} />
              <input ref={setFileRef} type="file" accept="application/json" hidden onChange={importSet} />
            </div>
            <LibraryFilters value={momentFilter} onChange={setMomentFilter} />
            <SongList songs={filteredSongs} selectedId={selectedSong?.id ?? null} onSelect={setSelectedSongId} onAdd={(id) => activeSet && addSongToSection(activeSet.id, activeSet.sections[0].id, id)} onMouseDragStart={setDragSongId} />
          </aside>
          <SongWorkspace
            song={selectedSong}
            editing={editingSong}
            setEditing={setEditingSong}
            theme={previewTheme}
            setTheme={setPreviewTheme}
            fontScale={previewFontScale}
            setFontScale={setPreviewFontScale}
            showChords={previewShowChords}
            setShowChords={setPreviewShowChords}
            onDelete={deleteSong}
            onSave={(updated) => {
              setSongs(songs.some((song) => song.id === updated.id) ? songs.map((song) => (song.id === updated.id ? updated : song)) : [updated, ...songs]);
              setSelectedSongId(updated.id);
              setEditingSong(false);
            }}
          />
        </section>
      )}
    </main>
  );
}

function SetSidebar(props: {
  sets: CoroSet[];
  activeSetId: string | null;
  renamingId: string | null;
  showCreateMenu: boolean;
  setShowCreateMenu: (value: boolean) => void;
  setRenamingId: (id: string | null) => void;
  renameSet: (id: string, name: string) => void;
  addSet: (type: SetType) => void;
  openSet: (id: string) => void;
}) {
  const groups: Array<{ type: SetType; label: string }> = [
    { type: "playlist", label: "PLAYLISTS" },
    { type: "mass", label: "MISAS" },
    { type: "sunday_mass", label: "MISA DOMINICAL" }
  ];

  return (
    <aside className="set-sidebar">
      <div className="sidebar-header">
        <h2>Sets</h2>
        <div className="create-set">
          <button className="primary compact-button" onClick={() => props.setShowCreateMenu(!props.showCreateMenu)}>+ Nuevo Set</button>
          {props.showCreateMenu ? (
            <div className="create-menu">
              <button onClick={() => props.addSet("playlist")}>Playlist</button>
              <button onClick={() => props.addSet("mass")}>Misa</button>
              <button onClick={() => props.addSet("sunday_mass")}>Misa Dominical</button>
            </div>
          ) : null}
        </div>
      </div>
      {groups.map((group) => (
        <section className="sidebar-group" key={group.type}>
          <h3 className="set-group-title">{group.label}</h3>
          <div className="sidebar-list">
            {props.sets.filter((set) => set.type === group.type).map((set) => (
              <div key={set.id} className={`set-row ${set.id === props.activeSetId ? "selected-set-row" : ""}`}>
                {props.renamingId === set.id ? (
                  <input
                    autoFocus
                    defaultValue={set.name}
                    onBlur={(event) => props.renameSet(set.id, event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") props.renameSet(set.id, event.currentTarget.value);
                      if (event.key === "Escape") props.setRenamingId(null);
                    }}
                  />
                ) : (
                  <button className="set-row-main" onClick={() => props.openSet(set.id)}>
                    <span>{set.name}</span>
                    <small>{flattenSetItems(set).length} canciones</small>
                  </button>
                )}
                <button className="icon-menu-button" title="Renombrar" onClick={() => props.setRenamingId(set.id)}>•••</button>
              </div>
            ))}
          </div>
        </section>
      ))}
    </aside>
  );
}

function LibraryPane(props: {
  songs: Song[];
  query: string;
  setQuery: (value: string) => void;
  momentFilter: "all" | LiturgicalMoment;
  setMomentFilter: (value: "all" | LiturgicalMoment) => void;
  selectedSong: Song | null;
  setSelectedSongId: (id: string) => void;
  activeSet: CoroSet | null;
  addSongToSection: (setId: string, sectionId: string, songId: string) => void;
  setDragSongId: (id: string | null) => void;
  setView: (view: MainView) => void;
}) {
  const firstSection = sortSections(props.activeSet?.sections ?? []).find((section) => section.isEnabled !== false);

  return (
    <aside className="library-pane">
      <div className="pane-title-row">
        <h2>Biblioteca</h2>
        <button className="compact-button" onClick={() => props.setView("library")}>Editar</button>
      </div>
      <input value={props.query} onChange={(event) => props.setQuery(event.target.value)} placeholder="Buscar canción" />
      <LibraryFilters value={props.momentFilter} onChange={props.setMomentFilter} />
      <SongList
        songs={props.songs}
        selectedId={props.selectedSong?.id ?? null}
        onSelect={props.setSelectedSongId}
        onAdd={(id) => {
          if (props.activeSet && firstSection) props.addSongToSection(props.activeSet.id, firstSection.id, id);
        }}
        onMouseDragStart={props.setDragSongId}
        draggable
      />
    </aside>
  );
}

function SetWorkspace(props: {
  set: CoroSet;
  songs: Song[];
  addSongToSection: (setId: string, sectionId: string, songId: string) => void;
  setSelectedSongId: (id: string) => void;
  removeItem: (setId: string, sectionId: string, itemId: string) => void;
  moveItem: (setId: string, sectionId: string, itemId: string, direction: -1 | 1) => void;
  reorderItem: (setId: string, sectionId: string, draggedId: string, targetId: string) => void;
  dragItemId: string | null;
  setDragItemId: (id: string | null) => void;
  dragSongId: string | null;
  setDragSongId: (id: string | null) => void;
  hotSectionId: string | null;
  setHotSectionId: (id: string | null) => void;
  presentSet: (set: CoroSet) => void;
  exportSet: (set: CoroSet) => void;
  duplicateSet: (id: string) => void;
  archiveSet: (id: string) => void;
}) {
  const sections = sortSections(props.set.sections).filter((section) => section.isEnabled !== false);

  return (
      <section className="set-workspace-panel">
        <div className="workspace-header">
          <div>
            <h2>{props.set.name}</h2>
            <p className="muted">{setTypeLabel(props.set.type)} · {flattenSetItems(props.set).length} canciones · {relativeDate(props.set.updatedAt)}</p>
          </div>
          <div className="actions">
            <button onClick={() => props.exportSet(props.set)}>Compartir</button>
            <button onClick={() => props.duplicateSet(props.set.id)}>Duplicar</button>
            <details className="workspace-actions-menu">
              <summary aria-label="Mas acciones">•••</summary>
              <div>
                <button className="danger" onClick={(event) => {
                  closeDetails(event);
                  props.archiveSet(props.set.id);
                }}>Archivar</button>
              </div>
            </details>
            <button className="primary" onClick={() => props.presentSet(props.set)}>Presentar</button>
          </div>
        </div>
        <div className={props.set.type === "playlist" ? "set-free-list" : "mass-sections"}>
          {sections.map((section) => (
            <SetSectionView
              key={section.id}
              section={section}
              set={props.set}
              songs={props.songs}
              dragItemId={props.dragItemId}
              setDragItemId={props.setDragItemId}
              dragSongId={props.dragSongId}
              setDragSongId={props.setDragSongId}
              setHotSectionId={props.setHotSectionId}
              isHot={props.hotSectionId === section.id}
              addSongToSection={props.addSongToSection}
              removeItem={props.removeItem}
              moveItem={props.moveItem}
              reorderItem={props.reorderItem}
              setSelectedSongId={props.setSelectedSongId}
            />
          ))}
        </div>
      </section>
  );
}

function SetSectionView(props: {
  set: CoroSet;
  section: SetSection;
  songs: Song[];
  dragItemId: string | null;
  setDragItemId: (id: string | null) => void;
  dragSongId: string | null;
  setDragSongId: (id: string | null) => void;
  setHotSectionId: (id: string | null) => void;
  isHot: boolean;
  addSongToSection: (setId: string, sectionId: string, songId: string) => void;
  removeItem: (setId: string, sectionId: string, itemId: string) => void;
  moveItem: (setId: string, sectionId: string, itemId: string, direction: -1 | 1) => void;
  reorderItem: (setId: string, sectionId: string, draggedId: string, targetId: string) => void;
  setSelectedSongId: (id: string) => void;
}) {
  const liveDragItemId = useRef<string | null>(null);
  const items = sortItems(props.section.items);

  function handleDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    props.setHotSectionId(null);
    const songId = event.dataTransfer.getData("text/song-id") || props.dragSongId;
    if (songId) props.addSongToSection(props.set.id, props.section.id, songId);
  }

  return (
    <section
      className={`set-section ${props.isHot ? "section-hot" : ""}`}
      data-section-id={props.section.id}
      onDragOver={(event) => {
        event.preventDefault();
        props.setHotSectionId(props.section.id);
      }}
      onDragLeave={() => props.setHotSectionId(null)}
      onDrop={handleDrop}
      onMouseEnter={() => {
        if (props.dragSongId) props.setHotSectionId(props.section.id);
      }}
      onMouseUp={() => {
        if (props.dragSongId) props.addSongToSection(props.set.id, props.section.id, props.dragSongId);
        props.setDragSongId(null);
        props.setHotSectionId(null);
      }}
      onMouseMove={(event) => {
        const draggedId = liveDragItemId.current;
        if (!draggedId) return;
        const target = document.elementFromPoint(event.clientX, event.clientY)?.closest("[data-set-item-id]") as HTMLElement | null;
        const targetId = target?.dataset.setItemId;
        if (targetId && targetId !== draggedId) props.reorderItem(props.set.id, props.section.id, draggedId, targetId);
      }}
    >
      {props.set.type !== "playlist" ? <h3 className="liturgical-subtitle">{props.section.label}</h3> : null}
      <div className="list">
        {items.map((item, index) => {
          const song = props.songs.find((candidate) => candidate.id === item.songId);
          return (
            <div
              className={`setlist-item draggable-item ${props.dragItemId === item.id ? "dragging" : ""}`}
              key={item.id}
              data-set-item-id={item.id}
              onMouseDown={(event) => {
                if ((event.target as HTMLElement).closest("button")) return;
                liveDragItemId.current = item.id;
                props.setDragItemId(item.id);
              }}
              onMouseEnter={() => {
                const draggedId = liveDragItemId.current || props.dragItemId;
                if (draggedId && draggedId !== item.id) props.reorderItem(props.set.id, props.section.id, draggedId, item.id);
              }}
              onMouseUp={() => {
                liveDragItemId.current = null;
                props.setDragItemId(null);
              }}
            >
              <div className="number">{String(index + 1).padStart(2, "0")}</div>
              <button className="set-song-title" onClick={() => song && props.setSelectedSongId(song.id)}>
                <span>{song?.title ?? "Cancion no encontrada"}</span>
                {songHasChords(song) ? <small className="chord-pill">Acordes</small> : null}
              </button>
              <details className="song-actions-menu">
                <summary aria-label="Acciones">•••</summary>
                <div>
                  <button onClick={(event) => {
                    closeDetails(event);
                    if (song) props.setSelectedSongId(song.id);
                  }}>Seleccionar</button>
                  <button onClick={(event) => {
                    closeDetails(event);
                    props.moveItem(props.set.id, props.section.id, item.id, -1);
                  }}>Mover arriba</button>
                  <button onClick={(event) => {
                    closeDetails(event);
                    props.moveItem(props.set.id, props.section.id, item.id, 1);
                  }}>Mover abajo</button>
                  <button className="danger" onClick={(event) => {
                    closeDetails(event);
                    props.removeItem(props.set.id, props.section.id, item.id);
                  }}>Quitar del Set</button>
                </div>
              </details>
              {item.note ? <div className="row-meta set-item-note">{item.note}</div> : null}
            </div>
          );
        })}
        {!items.length ? <div className="section-drop-hint">Suelta canciones aquí</div> : null}
      </div>
    </section>
  );
}

function LibraryFilters({ value, onChange }: { value: "all" | LiturgicalMoment; onChange: (value: "all" | LiturgicalMoment) => void }) {
  return (
    <div className="filter-chips">
      {libraryFilters.map((filter) => (
        <button key={filter.id} className={value === filter.id ? "chip active-chip" : "chip"} onClick={() => onChange(filter.id)}>
          {filter.label}
        </button>
      ))}
    </div>
  );
}

function SongList({ songs, selectedId, onSelect, onAdd, onMouseDragStart, draggable = false }: { songs: Song[]; selectedId: string | null; onSelect: (id: string) => void; onAdd: (id: string) => void; onMouseDragStart?: (id: string | null) => void; draggable?: boolean }) {
  return (
    <div className="list">
      {songs.map((song) => (
        <div
          key={song.id}
          className={`library-row ${song.id === selectedId ? "active" : ""}`}
          data-song-id={song.id}
          draggable={draggable}
          onDragStart={(event) => event.dataTransfer.setData("text/song-id", song.id)}
          onMouseDown={(event) => {
            if ((event.target as HTMLElement).closest("button")) return;
            onMouseDragStart?.(song.id);
          }}
          onMouseUp={() => onMouseDragStart?.(null)}
        >
          <button className="row row-plain" onClick={() => onSelect(song.id)}>
            <span className="row-title">{song.title}</span>
            <span className="row-meta">
              {songToFullLyrics(song).split("\n").filter(Boolean).length} líneas
              {songHasChords(song) ? <small className="library-chord-badge">ACORDES</small> : null}
            </span>
          </button>
          <button className="compact-add" onClick={() => onAdd(song.id)}>+ Agregar</button>
        </div>
      ))}
    </div>
  );
}

function SongWorkspace(props: {
  song: Song | null;
  editing: boolean;
  setEditing: (value: boolean) => void;
  theme: "blue" | "black";
  setTheme: (theme: "blue" | "black") => void;
  fontScale: number;
  setFontScale: (scale: number) => void;
  showChords: boolean;
  setShowChords: (value: boolean) => void;
  onDelete: (song: Song) => void;
  onSave: (song: Song) => void;
}) {
  const song = props.song;
  const hasChords = songHasChords(song);
  const scalePercent = Math.round(props.fontScale * 100);

  function changeScale(delta: number) {
    props.setFontScale(Math.min(1.4, Math.max(0.7, Number((props.fontScale + delta).toFixed(2)))));
  }

  if (!song) {
    return (
      <section className="song-workspace-panel">
        <div className="song-workspace-empty">No hay canciones.</div>
      </section>
    );
  }

  return (
    <section className="song-workspace-panel">
      <div className="song-workspace-header">
        <div>
          <p className="set-group-title">CANCIÓN</p>
          <h2>{song.title}</h2>
          <p className="muted">{songToFullLyrics(song).split("\n").filter(Boolean).length} líneas{hasChords ? " · con acordes" : ""}</p>
        </div>
        <details className="workspace-actions-menu">
          <summary aria-label="Mas acciones">•••</summary>
          <div>
            <button className="danger" onClick={(event) => {
              closeDetails(event);
              props.onDelete(song);
            }}>Eliminar</button>
          </div>
        </details>
      </div>

      {props.editing ? (
        <SongEditor song={song} onSave={props.onSave} onCancel={() => props.setEditing(false)} />
      ) : (
        <>
          <div className="song-toolbar">
            <button className="primary" onClick={() => props.setEditing(true)}>Editar</button>
            <div className="font-scale-control" aria-label="Tamaño de letra">
              <button onClick={() => changeScale(-0.1)}>A−</button>
              <button onClick={() => props.setFontScale(1)}>AUTO {scalePercent}%</button>
              <button onClick={() => changeScale(0.1)}>A+</button>
            </div>
            <div className="segmented-control" aria-label="Tema de vista">
              <button className={props.theme === "blue" ? "selected-segment" : ""} onClick={() => props.setTheme("blue")}>BLUE</button>
              <button className={props.theme === "black" ? "selected-segment" : ""} onClick={() => props.setTheme("black")}>BLACK</button>
            </div>
            {hasChords ? (
              <button onClick={() => props.setShowChords(!props.showChords)}>Acordes {props.showChords ? "ON" : "OFF"}</button>
            ) : (
              <span className="no-chords-state">Sin acordes</span>
            )}
          </div>
          <div className={`full-song-view song-theme-${props.theme}`} style={{ "--song-preview-scale": props.fontScale } as CSSProperties}>
            <LibrarySongRender song={song} showChords={props.showChords && hasChords} />
          </div>
          {song.source ? <details className="song-details"><summary>Detalles</summary><p className="muted">{song.source}</p></details> : null}
        </>
      )}
    </section>
  );
}

function LibrarySongRender({ song, showChords }: { song: Song; showChords: boolean }) {
  if (!showChords) {
    return <pre className="library-lyrics-only">{songToFullLyrics(song)}</pre>;
  }

  return (
    <div className="library-chord-song">
      {song.sections.map((section) => (
        <section key={section.id} className="library-song-section">
          <h3>{section.label}</h3>
          {sectionLines(section).map((line) =>
            line.lyrics ? (
              <div className="library-song-line" key={line.id}>
                {line.chords.length ? <pre className="library-chord-row">{renderChordRow(line.lyrics, line.chords)}</pre> : null}
                <pre className="library-lyric-row">{line.lyrics}</pre>
              </div>
            ) : (
              <div className="library-blank-line" key={line.id} />
            )
          )}
        </section>
      ))}
    </div>
  );
}

function renderChordRow(lyrics: string, chords: Array<{ symbol: string; position: number }>) {
  const length = Math.max(lyrics.length, ...chords.map((chord) => chord.position + chord.symbol.length));
  const chars = Array.from({ length }, () => " ");
  for (const chord of chords) {
    const start = Math.min(Math.max(chord.position, 0), Math.max(length - 1, 0));
    chord.symbol.split("").forEach((char, index) => {
      if (start + index < chars.length) chars[start + index] = char;
    });
  }
  return chars.join("").trimEnd();
}

function SongEditor({ song, onSave, onCancel }: { song: Song; onSave: (song: Song) => void; onCancel: () => void }) {
  const [title, setTitle] = useState(song.title);
  const [lyrics, setLyrics] = useState(sectionsToText(song.sections));
  const [moments, setMoments] = useState<LiturgicalMoment[]>(song.liturgicalMoments ?? []);

  function toggleMoment(moment: LiturgicalMoment) {
    setMoments((current) => current.includes(moment) ? current.filter((item) => item !== moment) : [...current, moment]);
  }

  return (
    <div className="editor song-editor-full">
      <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Titulo" />
      <div>
        <p className="muted">Momento de la Misa</p>
        <div className="filter-chips">
          {liturgicalMoments.map((moment) => (
            <button key={moment.id} className={moments.includes(moment.id) ? "chip active-chip" : "chip"} onClick={() => toggleMoment(moment.id)}>
              {moment.short}
            </button>
          ))}
        </div>
      </div>
      <textarea value={lyrics} onChange={(event) => setLyrics(event.target.value)} />
      <div className="actions">
        <button onClick={() => setLyrics(sectionsToText(textToSections(lyrics)))}>Auto Format</button>
        <button className="primary" onClick={() => onSave({ ...song, title: title.trim() || "Sin titulo", liturgicalMoments: moments, sections: textToSections(lyrics), updatedAt: nowIso() })}>Guardar</button>
        <button onClick={onCancel}>Cancelar</button>
      </div>
      <p className="muted">Usa encabezados como [Verso 1], [Coro] y separa bloques con lineas en blanco. Display mostrara la cancion completa.</p>
    </div>
  );
}
