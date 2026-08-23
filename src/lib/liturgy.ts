import { CoroSet, LiturgicalMoment, SetItem, SetSection, SetType } from "./types";
import { uid } from "./song-format";

export const liturgicalMoments: Array<{ id: LiturgicalMoment; label: string; short: string }> = [
  { id: "entrance", label: "ENTRADA", short: "Entrada" },
  { id: "kyrie", label: "SEÑOR TEN PIEDAD", short: "Piedad" },
  { id: "gloria", label: "GLORIA", short: "Gloria" },
  { id: "psalm", label: "SALMO", short: "Salmo" },
  { id: "gospel_acclamation", label: "ALELUYA", short: "Aleluya" },
  { id: "offertory", label: "OFERTORIO", short: "Ofertorio" },
  { id: "sanctus", label: "SANTO", short: "Santo" },
  { id: "memorial_acclamation", label: "ACLAMACIÓN", short: "Aclamación" },
  { id: "amen", label: "AMÉN", short: "Amén" },
  { id: "our_father", label: "PADRE NUESTRO", short: "Padre Nuestro" },
  { id: "peace", label: "PAZ", short: "Paz" },
  { id: "agnus_dei", label: "CORDERO DE DIOS", short: "Cordero" },
  { id: "communion", label: "COMUNIÓN", short: "Comunión" },
  { id: "thanksgiving", label: "ACCIÓN DE GRACIAS", short: "Acción de Gracias" },
  { id: "recessional", label: "SALIDA", short: "Salida" }
];

export const libraryFilters: Array<{ id: "all" | LiturgicalMoment; label: string }> = [
  { id: "all", label: "Todos" },
  ...liturgicalMoments.map((moment) => ({ id: moment.id, label: moment.short }))
];

export function makeSetItem(songId: string, position: number): SetItem {
  return { id: uid("item"), songId, position };
}

export function normalizeItems(items: SetItem[]) {
  return items.map((item, position) => ({ ...item, position }));
}

export function sortItems(items: SetItem[]) {
  return [...items].sort((a, b) => a.position - b.position).map((item, position) => ({ ...item, position }));
}

export function sortSections(sections: SetSection[]) {
  return [...sections].sort((a, b) => a.position - b.position).map((section, position) => ({ ...section, position, items: sortItems(section.items) }));
}

export function createSet(type: SetType, name?: string): CoroSet {
  const now = new Date().toISOString();
  const id = uid("set");
  const defaultName =
    name ??
    (type === "playlist" ? "Nueva Playlist" : type === "mass" ? "Nueva Misa" : "Nueva Misa Dominical");
  return {
    id,
    name: defaultName,
    type,
    sections: type === "playlist" ? [makeFreeSection()] : makeLiturgicalSections(),
    createdAt: now,
    updatedAt: now,
    isArchived: false,
    shareId: uid("share")
  };
}

export function makeFreeSection(items: SetItem[] = []): SetSection {
  return { id: uid("section"), type: "free", label: "CANCIONES", position: 0, isEnabled: true, items: normalizeItems(items) };
}

export function makeLiturgicalSections() {
  return liturgicalMoments.map((moment, position) => ({
    id: uid("section"),
    type: moment.id,
    label: moment.label,
    position,
    isEnabled: true,
    items: []
  }));
}

export function setTypeLabel(type: SetType) {
  if (type === "playlist") return "PLAYLISTS";
  if (type === "mass") return "MISAS";
  return "MISA DOMINICAL";
}

export function flattenSetItems(set: CoroSet | null) {
  return sortSections(set?.sections ?? []).flatMap((section) =>
    sortItems(section.items).map((item) => ({ section, item }))
  );
}
