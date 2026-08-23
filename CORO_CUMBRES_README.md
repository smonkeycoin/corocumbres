# CORO CUMBRES V0.1

CORO CUMBRES es una biblioteca de canciones y Sets para coro de iglesia. Funciona local-first y no requiere internet una vez cargada.

## Deployment

- GitHub: https://github.com/smonkeycoin/corocumbres
- Production: https://corocumbres.online
- Hosting: Vercel
- Deploy flow: `main` -> production

Nota: el deploy en Vercel no agrega sincronización cloud. En V0.1, canciones, Sets y estado de presentación siguen guardándose en el `localStorage` de cada navegador.

## Modelo

- `Library`: todas las canciones. Es la fuente de verdad de lyrics.
- `Set`: selección de canciones para una ocasión.
- Tipos de Set:
  - `PLAYLIST`: lista libre.
  - `MISA`: estructura litúrgica flexible.
  - `MISA DOMINICAL`: template completo de Misa dominical.

Las Misas tienen momentos como `ENTRADA`, `GLORIA`, `OFERTORIO`, `SANTO`, `COMUNIÓN` y `SALIDA`. Ningún momento es obligatorio; puede quedar vacío.

## Arquitectura

- Next.js App Router
- TypeScript
- Persistencia en `localStorage`
- Sin backend, login, cloud, Supabase ni Stripe
- Display `ONE SONG = ONE SCREEN`
- Canciones con lyrics + acordes opcionales

## Rutas

- `/`: Biblioteca, Sets, workspace de edición, import/export
- `/presenter`: control del operador para un Set
- `/display`: pantalla limpia para TV/proyector
- `/p/[shareId]`: vista móvil read-only preparada para compartir Sets; en V0 local-only lee datos del mismo navegador

## Display

Modelo congelado:

- Fondo azul karaoke `#1769D2`
- Texto blanco
- Font mono: `IBM Plex Mono`, con fallback `Roboto Mono`/monospace
- Acordes opcionales en amarillo cálido `#FFD166`
- Canción completa
- Fit-to-screen por medición real DOM
- Sin slides, animaciones, branding, título ni controles
- Si no cabe al mínimo, activa scroll manual

## Atajos

- `Right Arrow`: siguiente canción real del Set
- `Space`: siguiente canción si no se está editando
- `Left Arrow`: canción anterior
- `B`: blackout
- `F`: fullscreen

## Acordes

El editor acepta acordes inline:

```text
[D]Dios no se cansa de [G]amar
[A7]Dios no se cansa de [D]esperar
```

Internamente se guardan como `Chord { symbol, position }` asociado a cada línea de letra. Presenter tiene toggle `Acordes ON/OFF`, sincronizado con `/display`.

## Sharing Local V0

`Compartir` descarga un JSON portable del Set y sus canciones. No se inventa un link público falso; `shareId` y `/p/[shareId]` quedan listos para fase cloud.

## Datos

Las canciones semilla transcritas están en `src/lib/seed-songs.ts`. Los Sets se guardan en `localStorage` bajo `coro-cumbres:sets`.

## Limitaciones V0.1

- No hay sync cloud real.
- No hay RBAC.
- No hay control remoto LAN.
- No hay paginación ni slide splitting en presentación.
