/** Run only with Node/tsx. Never import this module from the application. */
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { seedSongs } from "../src/lib/seed-songs";
import { MigrationError, fromRow, planLibraryMigration, readSnapshot, sameStoredSong, toRow, validateMigrationKeys, validateProjectUrl, type SongRow } from "./migration-library-helpers";
import type { Song } from "../src/lib/types";

async function main() {
  const args = process.argv.slice(2);
  let projectRef = "";
  let input: string | undefined;
  let reportFile: string | undefined;
  let apply = false;
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === "--apply") apply = true;
    else if (["--project-ref", "--input", "--report"].includes(arg)) {
      const value = args[++index];
      if (!value || value.startsWith("--")) throw new MigrationError(`Falta el valor de ${arg}.`);
      if (arg === "--project-ref") projectRef = value;
      if (arg === "--input") input = resolve(value);
      if (arg === "--report") reportFile = resolve(value);
    } else throw new MigrationError("Uso: node --import tsx scripts/migrate-library.ts --project-ref REF [--input FILE] [--report FILE] [--apply]");
  }
  if (!projectRef) throw new MigrationError("Se requiere --project-ref explícito; no se deduce el proyecto desde otras aplicaciones.");
  if (input && reportFile === input) throw new MigrationError("El informe no puede reemplazar el respaldo de entrada.");
  const snapshot = input ? readSnapshot(JSON.parse(await readFile(input, "utf8"))) : { songs: [] as Song[], sets: 0, publications: 0 };
  const sources = [seedSongs, snapshot.songs];
  const offline = planLibraryMigration(sources, []);
  console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", projectRef, seedSongs: seedSongs.length, backupSongs: snapshot.songs.length, uniqueInputSongs: offline.inserts.length, inputDuplicates: offline.duplicates, backupSets: snapshot.sets, backupPublicationReferences: snapshot.publications }, null, 2));
  if (snapshot.sets || snapshot.publications) throw new MigrationError("El respaldo contiene repertorios o publicaciones. No se escribió ningún dato. Usa la importación administrativa para remapear sus canciones y guardar repertorios como borradores; conserva este archivo completo.");

  const url = validateProjectUrl(process.env.NEXT_PUBLIC_SUPABASE_URL, projectRef);
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  validateMigrationKeys(publishableKey, serviceKey);
  // Import occurs only after input and target validation. No OAuth session/client persistence.
  const { createClient } = await import("@supabase/supabase-js");
  const client = createClient(url, serviceKey!, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  const existing: Song[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await client.from("songs").select("*").order("id").range(offset, offset + 499);
    if (error) throw new MigrationError("No se pudo leer la biblioteca del proyecto verificado. Comprueba la migración, la red y las credenciales; no se inició la escritura.");
    existing.push(...(data as SongRow[]).map(fromRow));
    if (data.length < 500) break;
  }
  const plan = planLibraryMigration(sources, existing);
  const report = { mode: apply ? "apply" : "dry-run", projectRef, generatedAt: new Date().toISOString(), source: input ?? "seedSongs", seedSongs: seedSongs.length,
    backupSongs: snapshot.songs.length, remoteBefore: existing.length, plannedInserts: plan.inserts.length,
    equivalentSongsPreserved: plan.duplicates, variantsPreserved: plan.variants, inserted: 0, verified: 0, mappings: plan.mappings };
  // Reserve report with exclusive creation before writes; never replace an existing backup/report.
  if (reportFile) await writeFile(reportFile, JSON.stringify(report, null, 2), { flag: "wx", mode: 0o600 });
  try {
    if (apply) {
      for (const song of plan.inserts) {
        const { error } = await client.from("songs").insert(toRow(song));
        if (error) throw new MigrationError("La inserción se detuvo. No se sobrescribió ningún registro. Repite primero dry-run: los registros ya guardados se reconocerán por contenido.");
        report.inserted++;
        const verified = await client.from("songs").select("*").eq("id", song.id).single();
        if (verified.error || !verified.data || !sameStoredSong(song, fromRow(verified.data as SongRow))) throw new MigrationError("La verificación posterior no coincide en todos los campos y timestamps. Se detuvo la migración; conserva el respaldo y revisa el informe antes de continuar.");
        report.verified++;
      }
    }
  } finally {
    // Only the newly created report is updated; source JSON, existing records and storage stay untouched.
    if (reportFile) await writeFile(reportFile, JSON.stringify(report, null, 2), { mode: 0o600 });
    console.log(JSON.stringify(report, null, 2));
  }
}

main().catch(error => {
  // Do not serialize SDK/network exceptions: they may include request headers or credentials.
  console.error(error instanceof MigrationError ? error.message : "La migración no pudo completarse. No se imprimen detalles de credenciales o de red.");
  process.exitCode = 1;
});
