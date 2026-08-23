# CORO CUMBRES Chord Audit

Fecha: 2026-08-22

## Resumen

Se audito la cadena de acordes desde fuentes visuales, seeds TypeScript, modelo runtime y renderer. El renderer de Display/Presenter ya soporta `SongSection.lines -> SongLine.chords`, pero bibliotecas locales antiguas o importadas podian conservar solo `slides`, perdiendo los acordes aunque `Acordes ON` estuviera activo.

Se agrego recuperacion local: cuando una cancion conocida no tiene acordes en `localStorage`, CORO CUMBRES busca la misma cancion por `id` o titulo normalizado en `seedSongs` y restaura sus secciones estructuradas con acordes.

## Tabla

| Source file | Song | Original chord data found? | Imported data contains chords? | Current seed model contains chords? | Renderer displays chords? | Problem stage |
| --- | --- | --- | --- | --- | --- | --- |
| `LYRICS/3899816e-4f3d-4b3d-8345-49b22ee850ed.JPG` | Dios no se cansa | YES: inspeccion visual muestra filas `C G Am`, `F C`, `F G C`, etc. | NO en bibliotecas locales antiguas si la cancion quedo solo con `slides`. | YES: `src/lib/seed-songs.ts` tiene `lines[].chords`. | YES cuando `showChords` esta ON y la cancion tiene `lines`. | Storage/import antiguo podia descartar `lines` y conservar solo lyrics. |
| `LYRICS/02e18a61-c0f5-413f-898e-356dae54c461.JPG` | Hemos entregado | YES: inspeccion visual muestra acordes `C`, `G`, `Am`, `F`, etc. encima de lyrics. | NO en bibliotecas locales antiguas si la cancion quedo solo con `slides`. | YES: `src/lib/seed-songs.ts` tiene `lines[].chords`. | YES cuando `showChords` esta ON y la cancion tiene `lines`. | Storage/import antiguo podia descartar `lines` y conservar solo lyrics. |
| `LYRICS/93699162-be4a-4cfd-8af5-6ac0ad35ee9b.JPG` | Varios cantos manuscritos | PARTIAL/UNKNOWN: reporte de transcripcion previo indica acordes manuscritos adicionales, pero requiere segunda revision humana. | NO. | NO: acordes omitidos por incertidumbre. | NO. | Fuente ambigua; no se cargan acordes sin confirmacion visual fiable. |
| Otros JPG en `LYRICS/` | Canciones restantes | No confirmado en esta auditoria como fuente fiable de acordes. | NO. | NO. | NO. | No se inventan acordes. |

## Parser

El parser actual reconoce:

- acordes inline como `[D]Dios no se cansa`;
- filas completas de acordes sobre lyrics, por ejemplo `D A G D`;
- tokens como `Bm`, `Em`, `A7`, `F#m`, `D/F#`, `Gsus4`, `Cmaj7`.

## Fix aplicado

- `loadLibrary()` recupera acordes semilla si la cancion local conocida no tiene `lines[].chords`.
- `saveLibrary()` mantiene la estructura completa del modelo `Song`.
- Display/Presenter renderizan acordes desde `sectionLines(section)`.

## No realizado

No se inventaron acordes ni se buscaron acordes en internet. Las fuentes manuscritas ambiguas quedan pendientes de revision humana.

## Position QA

Fecha: 2026-08-22

Se compararon las fuentes visuales disponibles contra el render de CORO CUMBRES usando `Acordes ON`. Hay dos canciones con acordes confirmados de forma fiable en las fuentes actuales. No se declara PASS para una tercera cancion porque las demas fuentes no tienen acordes claros o requieren revision humana.

| Source filename | Song | Chord count in model | Alignment result | Mismatches | Corrections performed |
| --- | --- | ---: | --- | --- | --- |
| `LYRICS/3899816e-4f3d-4b3d-8345-49b22ee850ed.JPG` | Dios no se cansa | 17 | PASS aproximado. Las filas `C G Am`, `F C`, `F G C`, `F G C G Am` quedan sobre las mismas zonas de palabra que la imagen fuente. | Ninguno confirmado en esta pasada. | Ninguna. |
| `LYRICS/02e18a61-c0f5-413f-898e-356dae54c461.JPG` | Hemos entregado | 40 | PASS aproximado. Las filas `C G Am`, `F G C G`, `Am F`, `G C G`, `C G F` quedan alineadas con los inicios/zonas de frase que muestra la imagen fuente. | Ninguno confirmado en esta pasada. | Ninguna. |
| `LYRICS/93699162-be4a-4cfd-8af5-6ac0ad35ee9b.JPG` | Varios cantos manuscritos | 0 | NOT TESTED. La fuente es manuscrita y el reporte previo marco acordes adicionales como pendientes de revision humana. | No aplica. | Ninguna; no se cargan acordes ambiguos. |

Decision de fit: con `lyrics-only` se permite wrapping natural; con `lyrics+chords` se prefiere reducir font size antes de wrapping agresivo para conservar la relacion acorde/linea. Las filas de acordes participan en el calculo de fit del Display.
