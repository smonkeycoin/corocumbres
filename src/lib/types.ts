export type SectionType = "verse" | "chorus" | "bridge" | "intro" | "outro" | "other";

export type Slide = string[];

export type Chord = {
  symbol: string;
  position: number;
};

export type SongLine = {
  id: string;
  lyrics: string;
  chords: Chord[];
};

export type LiturgicalMoment =
  | "entrance"
  | "kyrie"
  | "gloria"
  | "psalm"
  | "gospel_acclamation"
  | "offertory"
  | "sanctus"
  | "memorial_acclamation"
  | "amen"
  | "our_father"
  | "peace"
  | "agnus_dei"
  | "communion"
  | "thanksgiving"
  | "recessional";

export type SongSection = {
  id: string;
  type: SectionType;
  label: string;
  lines?: SongLine[];
  slides: Slide[];
};

export type Song = {
  id: string;
  title: string;
  subtitle?: string;
  category?: string;
  tags: string[];
  liturgicalMoments?: LiturgicalMoment[];
  source?: string;
  notes?: string;
  sections: SongSection[];
  createdAt: string;
  updatedAt: string;
};

export type SetType = "playlist" | "mass" | "sunday_mass";

export type SetItem = {
  id: string;
  songId: string;
  position: number;
  note?: string;
};

export type SetSection = {
  id: string;
  type: LiturgicalMoment | "free";
  label: string;
  position: number;
  isEnabled?: boolean;
  items: SetItem[];
};

export type Mass = {
  id: string;
  name: string;
  time: string | null;
  sortOrder: number;
};

export type CoroSet = {
  massId?: string;
  status?: "draft" | "published";
  version?: number;
  publishedAt?: string | null;
  id: string;
  name: string;
  type: SetType;
  date?: string;
  notes?: string;
  sections: SetSection[];
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  isArchived: boolean;
  shareId?: string;
};

export type Preferences = {
  schemaVersion: 1;
  fontScale: number;
  theme?: "blue" | "black";
  showChords?: boolean;
};

export type PresenterState = {
  schemaVersion: 1;
  setId: string | null;
  setItemId?: string | null;
  setSectionId?: string | null;
  sectionLabel?: string;
  itemIndex: number;
  songId: string | null;
  fullLyrics?: string;
  songIndex?: number;
  black?: boolean;
  isBlackout?: boolean;
  theme?: "blue" | "black";
  showChords?: boolean;
  fontScale: number;
};
