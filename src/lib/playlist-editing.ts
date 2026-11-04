import type { CoroSet, SetSection } from "./types";

type Entry = { section: SetSection; item: SetSection["items"][number] };

function shortHash(value: string) {
  let hash = 2166136261;
  for (const character of value) { hash ^= character.charCodeAt(0); hash = Math.imul(hash, 16777619); }
  return (hash >>> 0).toString(36);
}

/** Reorders the supplied items; omitted/disabled items are retained in their original slots. */
export function reorderPlaylistSections(set: CoroSet, orderedItemIds: string[]): SetSection[] {
  const originalSections = [...set.sections].sort((a, b) => a.position - b.position);
  const allEntries: Entry[] = originalSections.flatMap((section) => [...section.items].sort((a, b) => a.position - b.position).map((item) => ({ section, item })));
  const byId = new Map(allEntries.map((entry) => [entry.item.id, entry]));
  const requested = [...new Set(orderedItemIds)].filter((id) => byId.has(id));
  const selected = new Set(requested);
  let index = 0;
  const ordered = allEntries.map((entry) => selected.has(entry.item.id) ? byId.get(requested[index++])! : entry);
  const used = new Set<string>();
  const reserved = new Set(originalSections.map((section) => section.id));
  const sections: SetSection[] = [];
  let previousSource: string | null = null;

  for (const { section, item } of ordered) {
    if (previousSource === section.id) {
      const current = sections[sections.length - 1];
      current.items.push({ ...item, position: current.items.length });
      continue;
    }
    let id = section.id;
    if (used.has(id)) {
      const stem = `${section.id.slice(0, 235)}-split-${shortHash(item.id)}`;
      id = stem;
      let suffix = 1;
      while (used.has(id) || reserved.has(id)) id = `${stem}-${suffix++}`;
    }
    used.add(id);
    sections.push({ ...section, id, position: sections.length, items: [{ ...item, position: 0 }] });
    previousSource = section.id;
  }
  for (const section of originalSections) {
    if (!section.items.length) sections.push({ ...section, position: sections.length, items: [] });
  }
  return sections;
}
