/** Count and actual page length matter when PostgREST's cap is below the requested range. */
export async function readAllPages<T>(fetchPage: (offset: number, limit: number) => Promise<{ rows: T[]; total: number | null }>, limit = 500): Promise<T[]> {
  const rows: T[] = [];
  for (;;) {
    const page = await fetchPage(rows.length, limit);
    rows.push(...page.rows);
    if (page.total !== null && rows.length >= page.total) return rows;
    if (!page.rows.length) {
      if (page.total !== null && rows.length < page.total) throw new Error("El repertorio cambió durante la lectura. Recarga antes de editarlo.");
      return rows;
    }
  }
}
