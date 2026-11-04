import type { CoroSet, Song } from "./types";
import type { MassId } from "./masses";

/** Only this deliberately small projection may cross the public boundary. */
export type PublicPlaylistItem = {
  id: string;
  songId: string;
  title: string;
  moment: string;
  lyrics: string;
};

export type PublicPlaylistSnapshot = {
  massId: MassId;
  revision: number;
  publishedAt: string;
  items: PublicPlaylistItem[];
};

export type WorkspaceState = {
  schemaVersion: 2;
  revision: number;
  songs: Song[];
  sets: CoroSet[];
  assignments: Record<MassId, string | null>;
  published: Record<MassId, PublicPlaylistSnapshot | null>;
  /** Private provenance for legacy share links; only publication may update it. */
  publicationSources?: Record<MassId, string | null>;
};

export type WorkspaceResponse = { state: WorkspaceState; etag: string };

export type ImportSummary = {
  addedSongs: number;
  addedSets: number;
  songConflicts: number;
  setConflicts: number;
};
