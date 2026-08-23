"use client";

import { useEffect, useState } from "react";
import { sortItems, sortSections } from "@/lib/liturgy";
import { sectionLines, songToFullLyrics } from "@/lib/song-format";
import { loadLibrary, loadSets } from "@/lib/storage";
import { CoroSet, Song } from "@/lib/types";

export function SharedPlaylist({ shareId }: { shareId: string }) {
  const [songs, setSongs] = useState<Song[]>([]);
  const [set, setSet] = useState<CoroSet | null>(null);
  const [openSongId, setOpenSongId] = useState<string | null>(null);
  const [showChords, setShowChords] = useState(false);

  useEffect(() => {
    const library = loadLibrary();
    const found = loadSets().find((item) => item.shareId === shareId && !item.isArchived) ?? null;
    setSongs(library);
    setSet(found);
  }, [shareId]);

  const openSong = songs.find((song) => song.id === openSongId) ?? null;

  if (!set) {
    return (
      <main className="shared-page">
        <h1>Set no disponible</h1>
        <p>En V0 local-only, esta ruta solo puede abrir Sets guardados en este navegador. El enlace publico real queda preparado para la fase cloud.</p>
      </main>
    );
  }

  return (
    <main className="shared-page">
      <header>
        <p className="shared-kicker">{set.type === "sunday_mass" ? "MISA DOMINICAL" : set.type === "mass" ? "MISA" : "PLAYLIST"}</p>
        <h1>{set.name}</h1>
        {set.date ? <p>{set.date}</p> : null}
      </header>
      {!openSong ? (
        <div className="shared-structured-list">
          {sortSections(set.sections).map((section) => {
            const items = sortItems(section.items);
            if (!items.length && set.type === "playlist") return null;
            return (
              <section key={section.id}>
                {set.type !== "playlist" ? <h2>{section.label}</h2> : null}
                <ol className="shared-list">
                  {items.map((item) => {
                    const song = songs.find((candidate) => candidate.id === item.songId);
                    return (
                      <li key={item.id}>
                        <button onClick={() => song && setOpenSongId(song.id)}>{song?.title ?? "Cancion no encontrada"}</button>
                      </li>
                    );
                  })}
                </ol>
              </section>
            );
          })}
        </div>
      ) : (
        <article className="shared-lyrics">
          <button onClick={() => setOpenSongId(null)}>Volver</button>
          <button onClick={() => setShowChords((value) => !value)}>{showChords ? "Letra" : "Acordes"}</button>
          <h2>{openSong.title}</h2>
          {showChords ? (
            <div className="shared-chord-lines">
              {openSong.sections.map((section) => (
                <section key={section.id}>
                  {sectionLines(section).map((line) =>
                    line.lyrics ? (
                      <div key={line.id}>
                        {line.chords.length ? <pre className="shared-chords">{line.chords.map((chord) => `[${chord.symbol}]`).join(" ")}</pre> : null}
                        <p>{line.lyrics}</p>
                      </div>
                    ) : null
                  )}
                </section>
              ))}
            </div>
          ) : (
            <p>{songToFullLyrics(openSong)}</p>
          )}
        </article>
      )}
    </main>
  );
}
