"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { flattenSetItems } from "@/lib/liturgy";
import { sectionLines, songToFullLyrics } from "@/lib/song-format";
import { loadPrefs, loadPresenterState, savePrefs } from "@/lib/storage";
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

function clampScale(scale: number) {
  return Math.min(1, Math.max(0.5, Number(scale.toFixed(2))));
}

function isBlackout(state: PresenterState) {
  return state.isBlackout ?? state.black ?? false;
}

function buildPresenterState(params: { set: CoroSet | null; songs: Song[]; itemIndex: number; isBlackout: boolean; fontScale: number; theme: Theme; showChords: boolean }): PresenterState {
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
    black: params.isBlackout,
    isBlackout: params.isBlackout,
    theme: params.theme,
    showChords: params.showChords,
    fontScale: clampScale(params.fontScale)
  };
}

export function Presenter({ initialSongs, initialSets }: { initialSongs: Song[]; initialSets: CoroSet[] }) {
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
    isBlackout: false,
    theme: "blue",
    showChords: false,
    fontScale: 1
  });

  useEffect(() => {
    const library = initialSongs;
    const storedSets = initialSets;
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
    setState(buildPresenterState({ set, songs: library, itemIndex: requestedSetId ? 0 : stored.itemIndex ?? 0, isBlackout: false, fontScale: prefs.fontScale, theme: prefs.theme ?? "blue", showChords: prefs.showChords ?? false }));
  }, [initialSongs, initialSets]);

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
  const activeShowChords = (state.showChords ?? false) && currentHasChords;
  const scaleLabel = `${Math.round(clampScale(state.fontScale) * 100)}%`;

  const updateCurrent = useCallback(
    (itemIndex: number, overrides?: Partial<PresenterState>) => {
      const nextState = buildPresenterState({
        set,
        songs,
        itemIndex,
        isBlackout: overrides?.isBlackout ?? overrides?.black ?? isBlackout(state),
        fontScale: overrides?.fontScale ?? state.fontScale,
        theme: (overrides?.theme ?? state.theme ?? "blue") as Theme,
        showChords: overrides?.showChords ?? state.showChords ?? false
      });
      setState({ ...nextState, ...overrides });
    },
    [set, songs, state]
  );

  const goSong = useCallback(
    (direction: -1 | 1) => {
      if (!flatItems.length) return;
      updateCurrent(Math.min(flatItems.length - 1, Math.max(0, state.itemIndex + direction)), { isBlackout: false, black: false });
    },
    [flatItems.length, state.itemIndex, updateCurrent]
  );

  function setTheme(theme: Theme) {
    savePrefs({ schemaVersion: 1, fontScale: state.fontScale, theme, showChords: state.showChords ?? false });
    updateCurrent(state.itemIndex, { theme });
  }

  function changeFont(delta: number) {
    const fontScale = clampScale(state.fontScale + delta);
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
      if (event.key.toLowerCase() === "b") updateCurrent(state.itemIndex, { isBlackout: !isBlackout(state), black: !isBlackout(state) });
      if (event.key.toLowerCase() === "f") enterFullscreen();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goSong, state, state.itemIndex, updateCurrent]);

  return (
    <main className="presenter">
      <header className="presenter-header">
        <Link href="/admin/playlists" className="back-link">← Volver al Set</Link>
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
              <button key={item.id} className={`row ${index === state.itemIndex ? "active" : ""}`} onClick={() => updateCurrent(index, { isBlackout: false, black: false })}>
                <span className="row-meta">{section.label}</span>
                <span className="row-title">{String(index + 1).padStart(2, "0")} {song?.title ?? "Cancion no encontrada"}</span>
              </button>
            );
          })}
        </div>
        <div className="actions"><Link href="/admin/repertorio">Repertorio</Link></div>
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
          <PresentationSurface
            song={currentSong}
            lyrics={fullLyrics}
            showChords={activeShowChords}
            theme={(state.theme ?? "blue") as Theme}
            isBlackout={isBlackout(state)}
            fontScale={state.fontScale}
            emptyMessage="Este Set no tiene canciones"
            mode="preview"
          />
        </div>
        <div className="controls">
          <button disabled={!flatItems.length || state.itemIndex === 0} onClick={() => goSong(-1)}>Canción anterior</button>
          <button className="primary" disabled={!flatItems.length || state.itemIndex >= flatItems.length - 1} onClick={() => goSong(1)}>Siguiente canción</button>
          <button onClick={() => changeFont(-0.1)}>A−</button>
          <button className={state.fontScale === 1 ? "primary" : ""} onClick={() => {
            savePrefs({ schemaVersion: 1, fontScale: 1, theme: state.theme ?? "blue", showChords: state.showChords ?? false });
            updateCurrent(state.itemIndex, { fontScale: 1 });
          }}>AUTO {scaleLabel}</button>
          <button disabled={state.fontScale >= 1} onClick={() => changeFont(0.1)}>A+</button>
          <button disabled={!currentHasChords} onClick={toggleChords}>{currentHasChords ? `Acordes ${state.showChords ? "ON" : "OFF"}` : "Sin acordes"}</button>
          <button className={(state.theme ?? "blue") === "blue" ? "primary" : ""} onClick={() => setTheme("blue")}>BLUE</button>
          <button className={(state.theme ?? "blue") === "black" ? "primary" : ""} onClick={() => setTheme("black")}>BLACK</button>
          <button className={isBlackout(state) ? "primary" : ""} onClick={() => updateCurrent(state.itemIndex, { isBlackout: !isBlackout(state), black: !isBlackout(state) })}>BLACKOUT</button>
          <button onClick={() => window.open("/display", "_blank")}>Open Display</button>
          <button onClick={enterFullscreen}>Fullscreen</button>
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

export function Display({ initialSongs }: { initialSongs: Song[] }) {
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
    black: false,
    isBlackout: false,
    theme: "blue",
    showChords: false,
    fontScale: 1
  });

  useEffect(() => {
    setSongs(initialSongs);
    setState(loadPresenterState());
    return subscribePresenterState(setState);
  }, [initialSongs]);

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
    <main className="display">
      <PresentationSurface
        song={song}
        lyrics={lyrics}
        showChords={(state.showChords ?? false) && songHasChords(song)}
        theme={(state.theme ?? "blue") as Theme}
        isBlackout={isBlackout(state)}
        fontScale={state.fontScale}
        emptyMessage=""
        mode="display"
      />
    </main>
  );
}

function PresentationSurface({
  song,
  lyrics,
  fontScale,
  showChords,
  theme,
  isBlackout,
  emptyMessage,
  mode
}: {
  song?: Song | null;
  lyrics: string;
  fontScale: number;
  showChords: boolean;
  theme: Theme;
  isBlackout: boolean;
  emptyMessage: string;
  mode: "display" | "preview";
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [fontSize, setFontSize] = useState(mode === "display" ? 72 : 34);
  const [safeOverflow, setSafeOverflow] = useState(false);

  useLayoutEffect(() => {
    const frame = frameRef.current;
    const text = textRef.current;
    if (!frame || !text || isBlackout || !lyrics) return;

    let cancelled = false;
    let fontReady = false;
    let raf = 0;
    const fit = () => {
      if (cancelled || !fontReady) return;
      const availableWidth = frame.clientWidth;
      const availableHeight = frame.clientHeight;
      if (!availableWidth || !availableHeight) return;

      const min = mode === "display" ? 10 : 6;
      const max = mode === "display" ? 110 : 72;
      let low = min;
      let high = max;
      let best = min;
      const tolerance = 0.5;
      const targetScale = clampScale(fontScale);

      text.style.width = `${availableWidth}px`;
      text.style.maxWidth = `${availableWidth}px`;
      text.style.overflow = "hidden";

      while (high - low > tolerance) {
        const mid = (low + high) / 2;
        text.style.fontSize = `${mid}px`;
        const fits = text.scrollHeight <= availableHeight && text.scrollWidth <= availableWidth;
        if (fits) {
          best = mid;
          low = mid;
        } else {
          high = mid;
        }
      }

      let finalSize = Math.max(min, Math.min(best, best * targetScale));
      text.style.fontSize = `${finalSize}px`;

      if (text.scrollHeight > availableHeight || text.scrollWidth > availableWidth) {
        low = min;
        high = finalSize;
        finalSize = min;
        while (high - low > tolerance) {
          const mid = (low + high) / 2;
          text.style.fontSize = `${mid}px`;
          const fits = text.scrollHeight <= availableHeight && text.scrollWidth <= availableWidth;
          if (fits) {
            finalSize = mid;
            low = mid;
          } else {
            high = mid;
          }
        }
      }

      text.style.fontSize = `${finalSize}px`;
      const overflow = text.scrollHeight > availableHeight || text.scrollWidth > availableWidth;
      setSafeOverflow(overflow);
      setFontSize(Number(finalSize.toFixed(2)));
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
    resizeObserver.observe(text);
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
  }, [lyrics, fontScale, showChords, theme, isBlackout, mode]);

  if (isBlackout) {
    return <div className="presentation-surface presentation-blackout" data-mode={mode} data-blackout="true" />;
  }

  return (
    <div className={`presentation-surface presentation-${mode} theme-${theme}`} data-mode={mode} data-fit-font-size={fontSize} data-overflow={safeOverflow}>
      <div className="presentation-frame" ref={frameRef}>
        {lyrics ? (
          <div className="presentation-text" ref={textRef} style={{ fontSize }}>
            <DisplaySong song={song} lyrics={lyrics} showChords={showChords} />
          </div>
        ) : (
          <span className="empty-presenter-state">{emptyMessage}</span>
        )}
      </div>
      {mode === "preview" && safeOverflow ? <div className="presentation-warning">Esta canción excede el área segura.</div> : null}
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
