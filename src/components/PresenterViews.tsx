"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { flattenSetItems } from "@/lib/liturgy";
import { sectionLines, songToFullLyrics } from "@/lib/song-format";
import { loadLibrary, loadPrefs, loadPresenterState, loadSets, savePrefs } from "@/lib/storage";
import { publishPresenterState, subscribePresenterState } from "@/lib/presenter-channel";
import { CoroSet, PresenterState, Song } from "@/lib/types";

type Theme = "blue" | "black";

function isTypingTarget(target: EventTarget | null) {
  const element = target as HTMLElement | null;
  if (!element) return false;
  return ["INPUT", "TEXTAREA", "SELECT"].includes(element.tagName) || element.isContentEditable;
}

function enterFullscreen() {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => undefined);
}

function songHasChords(song?: Song | null) {
  return Boolean(song?.sections.some((section) => section.lines?.some((line) => line.chords.length)));
}

function buildPresenterState(params: { set: CoroSet | null; songs: Song[]; itemIndex: number; black: boolean; fontScale: number; theme: Theme; showChords: boolean }): PresenterState {
  const flat = flattenSetItems(params.set);
  const safeIndex = Math.min(Math.max(params.itemIndex, 0), Math.max(flat.length - 1, 0));
  const current = flat[safeIndex] ?? null;
  const song = params.songs.find((candidate) => candidate.id === current?.item.songId) ?? null;
  return {
    schemaVersion: 1,
    setId: params.set?.id ?? null,
    setItemId: current?.item.id ?? null,
    setSectionId: current?.section.id ?? null,
    sectionLabel: current?.section.label ?? "",
    itemIndex: safeIndex,
    songId: song?.id ?? current?.item.songId ?? null,
    fullLyrics: songToFullLyrics(song),
    songIndex: safeIndex,
    black: params.black,
    theme: params.theme,
    showChords: params.showChords,
    fontScale: params.fontScale
  };
}

export function Presenter() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [sets, setSets] = useState<CoroSet[]>([]);
  const [state, setState] = useState<PresenterState>({
    schemaVersion: 1,
    setId: null,
    setItemId: null,
    setSectionId: null,
    sectionLabel: "",
    itemIndex: 0,
    songId: null,
    fullLyrics: "",
    songIndex: 0,
    black: false,
    theme: "blue",
    showChords: false,
    fontScale: 1
  });

  useEffect(() => {
    const library = loadLibrary();
    const storedSets = loadSets();
    const prefs = loadPrefs();
    const requestedSetId = new URLSearchParams(window.location.search).get("set");
    const stored = loadPresenterState();
    const set =
      storedSets.find((item) => item.id === requestedSetId) ??
      storedSets.find((item) => item.id === stored.setId) ??
      storedSets.find((item) => !item.isArchived) ??
      null;

    setSongs(library);
    setSets(storedSets);
    setState(buildPresenterState({ set, songs: library, itemIndex: requestedSetId ? 0 : stored.itemIndex ?? 0, black: false, fontScale: prefs.fontScale, theme: prefs.theme ?? "blue", showChords: prefs.showChords ?? false }));
  }, []);

  useEffect(() => {
    publishPresenterState(state);
  }, [state]);

  const set = sets.find((item) => item.id === state.setId) ?? null;
  const flatItems = useMemo(() => flattenSetItems(set), [set]);
  const current = flatItems[state.itemIndex] ?? null;
  const currentSong = songs.find((song) => song.id === current?.item.songId) ?? null;
  const previous = flatItems[state.itemIndex - 1] ?? null;
  const next = flatItems[state.itemIndex + 1] ?? null;
  const previousSong = songs.find((song) => song.id === previous?.item.songId) ?? null;
  const nextSong = songs.find((song) => song.id === next?.item.songId) ?? null;
  const fullLyrics = songToFullLyrics(currentSong);
  const currentHasChords = songHasChords(currentSong);

  const updateCurrent = useCallback(
    (itemIndex: number, overrides?: Partial<PresenterState>) => {
      const nextState = buildPresenterState({
        set,
        songs,
        itemIndex,
        black: overrides?.black ?? state.black,
        fontScale: overrides?.fontScale ?? state.fontScale,
        theme: (overrides?.theme ?? state.theme ?? "blue") as Theme,
        showChords: overrides?.showChords ?? state.showChords ?? false
      });
      setState({ ...nextState, ...overrides });
    },
    [set, songs, state.black, state.fontScale, state.showChords, state.theme]
  );

  const goSong = useCallback(
    (direction: -1 | 1) => {
      if (!flatItems.length) return;
      updateCurrent(Math.min(flatItems.length - 1, Math.max(0, state.itemIndex + direction)), { black: false });
    },
    [flatItems.length, state.itemIndex, updateCurrent]
  );

  function setTheme(theme: Theme) {
    savePrefs({ schemaVersion: 1, fontScale: state.fontScale, theme, showChords: state.showChords ?? false });
    updateCurrent(state.itemIndex, { theme });
  }

  function changeFont(delta: number) {
    const fontScale = Math.min(1.35, Math.max(0.75, Number((state.fontScale + delta).toFixed(2))));
    savePrefs({ schemaVersion: 1, fontScale, theme: state.theme ?? "blue", showChords: state.showChords ?? false });
    updateCurrent(state.itemIndex, { fontScale });
  }

  function toggleChords() {
    if (!currentHasChords) return;
    const showChords = !(state.showChords ?? false);
    savePrefs({ schemaVersion: 1, fontScale: state.fontScale, theme: state.theme ?? "blue", showChords });
    updateCurrent(state.itemIndex, { showChords });
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;
      if (event.key === "ArrowRight" || event.key === " ") {
        event.preventDefault();
        goSong(1);
      }
      if (event.key === "ArrowLeft") goSong(-1);
      if (event.key.toLowerCase() === "b") updateCurrent(state.itemIndex, { black: !state.black });
      if (event.key.toLowerCase() === "f") enterFullscreen();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goSong, state.black, state.itemIndex, updateCurrent]);

  return (
    <main className="presenter">
      <header className="presenter-header">
        <Link href={`/?set=${set?.id ?? ""}`} className="back-link">← Volver al Set</Link>
        <strong>CORO CUMBRES</strong>
        <span>{set?.name ?? "Sin Set"}</span>
        <button onClick={() => window.open("/display", "_blank")}>Open Display</button>
      </header>
      <aside className="presenter-list-panel">
        <h2>{set?.name ?? "Set"}</h2>
        <div className="list">
          {flatItems.map(({ item, section }, index) => {
            const song = songs.find((candidate) => candidate.id === item.songId);
            return (
              <button key={item.id} className={`row ${index === state.itemIndex ? "active" : ""}`} onClick={() => updateCurrent(index, { black: false })}>
                <span className="row-meta">{section.label}</span>
                <span className="row-title">{String(index + 1).padStart(2, "0")} {song?.title ?? "Cancion no encontrada"}</span>
              </button>
            );
          })}
        </div>
        <div className="actions"><Link href="/">Biblioteca</Link></div>
      </aside>
      <section className="presenter-main">
        <div>
          <p className="muted">SET</p>
          <h1>{set?.name ?? "Sin Set"}</h1>
          <p className="muted">{flatItems.length ? `${state.itemIndex + 1} / ${flatItems.length}` : "0 / 0"}</p>
        </div>
        <div className="song-context">
          <div><span>MOMENTO</span><strong>{current?.section.label ?? "Sin momento"}</strong></div>
          <div><span>CURRENT SONG</span><strong>{currentSong?.title ?? "Sin cancion"}</strong></div>
          <div><span>NEXT</span><strong>{nextSong ? `${next?.section.label} — ${nextSong.title}` : "Fin"}</strong></div>
        </div>
        <div className="full-preview">
          {state.black ? null : fullLyrics ? (
            <DisplaySong song={currentSong} lyrics={fullLyrics} showChords={(state.showChords ?? false) && currentHasChords} />
          ) : (
            <span className="empty-presenter-state">Este Set no tiene canciones</span>
          )}
        </div>
        <div className="controls">
          <button disabled={!flatItems.length || state.itemIndex === 0} onClick={() => goSong(-1)}>Canción anterior</button>
          <button className="primary" disabled={!flatItems.length || state.itemIndex >= flatItems.length - 1} onClick={() => goSong(1)}>Siguiente canción</button>
          <button onClick={() => updateCurrent(state.itemIndex, { black: !state.black })}>Black</button>
          <button onClick={() => window.open("/display", "_blank")}>Open Display</button>
          <button onClick={enterFullscreen}>Fullscreen</button>
          <button disabled={!currentHasChords} onClick={toggleChords}>{currentHasChords ? `Acordes ${state.showChords ? "ON" : "OFF"}` : "Sin acordes"}</button>
          <button onClick={() => setTheme((state.theme ?? "blue") === "blue" ? "black" : "blue")}>{(state.theme ?? "blue") === "blue" ? "Black Theme" : "Blue Theme"}</button>
          <button onClick={() => changeFont(-0.1)}>A-</button>
          <button onClick={() => updateCurrent(state.itemIndex, { fontScale: 1 })}>AUTO</button>
          <button onClick={() => changeFont(0.1)}>A+</button>
        </div>
      </section>
      <aside className="presenter-context-panel">
        <h2>Contexto</h2>
        <div className="next-song-card"><span>Anterior</span>{previousSong ? `${previous?.section.label} — ${previousSong.title}` : "Inicio"}</div>
        <div className="next-song-card"><span>Siguiente</span>{nextSong ? `${next?.section.label} — ${nextSong.title}` : "Fin"}</div>
      </aside>
    </main>
  );
}

export function Display() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [state, setState] = useState<PresenterState>({
    schemaVersion: 1,
    setId: null,
    setItemId: null,
    setSectionId: null,
    sectionLabel: "",
    itemIndex: 0,
    songId: null,
    fullLyrics: "",
    songIndex: 0,
    black: true,
    theme: "blue",
    showChords: false,
    fontScale: 1
  });

  useEffect(() => {
    setSongs(loadLibrary());
    setState(loadPresenterState());
    return subscribePresenterState(setState);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "f") enterFullscreen();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const song = songs.find((item) => item.id === state.songId);
  const lyrics = state.fullLyrics || songToFullLyrics(song);

  return (
    <main className={`display ${state.black ? "display-blackout" : ""} theme-${state.theme ?? "blue"}`}>
      {!state.black && lyrics ? <AutoFitLyrics song={song} lyrics={lyrics} fontScale={state.fontScale} showChords={state.showChords ?? false} /> : null}
    </main>
  );
}

function AutoFitLyrics({ song, lyrics, fontScale, showChords }: { song?: Song | null; lyrics: string; fontScale: number; showChords: boolean }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [fontSize, setFontSize] = useState(78);
  const [scrollMode, setScrollMode] = useState(false);

  useLayoutEffect(() => {
    const frame = frameRef.current;
    const text = textRef.current;
    if (!frame || !text) return;

    let cancelled = false;
    let fontReady = false;
    let raf = 0;
    const fit = () => {
      if (cancelled || !fontReady) return;
      const fitPadding = 4;
      const min = 18;
      const max = Math.round(96 * fontScale);
      let low = min;
      let high = max;
      let best = min;

      text.style.overflowY = "hidden";
      for (let i = 0; i < 12; i += 1) {
        const mid = Math.floor((low + high) / 2);
        text.style.fontSize = `${mid}px`;
        const fits = text.scrollHeight <= frame.clientHeight - fitPadding && text.scrollWidth <= frame.clientWidth;
        if (fits) {
          best = mid;
          low = mid + 1;
        } else {
          high = mid - 1;
        }
      }

      text.style.fontSize = `${best}px`;
      setFontSize(best);
      setScrollMode(text.scrollHeight > frame.clientHeight || text.scrollWidth > frame.clientWidth);
    };

    const fitAfterFontLoad = async () => {
      try {
        await document.fonts?.load('600 48px "IBM Plex Mono"');
        await document.fonts?.load('500 34px "IBM Plex Mono"');
        await document.fonts?.ready;
      } catch {
        // Fallback mono stack still needs the same real measurement pass.
      }
      fontReady = true;
      raf = requestAnimationFrame(fit);
    };

    const resizeObserver = new ResizeObserver(fit);
    resizeObserver.observe(frame);
    document.addEventListener("fullscreenchange", fit);
    window.addEventListener("resize", fit);
    void fitAfterFontLoad();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      document.removeEventListener("fullscreenchange", fit);
      window.removeEventListener("resize", fit);
    };
  }, [lyrics, fontScale, showChords]);

  return (
    <div className={`display-frame ${scrollMode ? "scroll-mode" : ""}`} ref={frameRef}>
      <div className="display-text" ref={textRef} style={{ fontSize }}>
        <DisplaySong song={song} lyrics={lyrics} showChords={showChords} />
      </div>
    </div>
  );
}

function DisplaySong({ song, lyrics, showChords }: { song?: Song | null; lyrics: string; showChords: boolean }) {
  if (!showChords || !song) return <pre className="lyrics-only">{lyrics}</pre>;
  return (
    <>
      {song.sections.map((section) => (
        <div className="display-section" key={section.id}>
          {sectionLines(section).map((line) =>
            line.lyrics ? (
              <div className="song-line" key={line.id}>
                {line.chords.length ? <pre className="chord-row">{renderChordRow(line.lyrics, line.chords)}</pre> : null}
                <pre className="lyric-row">{line.lyrics}</pre>
              </div>
            ) : (
              <div className="blank-song-line" key={line.id} />
            )
          )}
        </div>
      ))}
    </>
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
