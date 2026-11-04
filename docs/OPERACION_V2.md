# CORO CUMBRES V2 — operación

## Configuración de producción

Proyecto existente: `corocumbres` (`prj_tpEKm6bQCNS9eUovHZGoIDBouuhC`), equipo `team_LG4vLJ75SnXcNtNqKI61bIj9`, dominio `https://corocumbres.online`.

Variables privadas del servidor: `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `AUTH_SECRET`, `CORO_ADMIN_EMAILS`, `NEXTAUTH_URL` y `BLOB_READ_WRITE_TOKEN` (o vínculo OIDC mediante `BLOB_STORE_ID`). Nunca usar prefijos `NEXT_PUBLIC_` para estas credenciales. El cliente OAuth Google debe permitir `https://corocumbres.online/api/auth/callback/google`. `CORO_ADMIN_EMAILS` contiene correos exactos separados por comas. El correo debe estar verificado por Google. Sin configuración completa, administración permanece cerrada.

## Migración sin pérdida

1. Iniciar sesión como administrador autorizado desde el navegador y dominio donde se utilizaba la versión anterior.
2. Abrir Configuración, recuperar los datos de este dispositivo y descargar la copia original antes de importar.
3. Importar. El servidor conserva canciones y playlists existentes; si encuentra versiones diferentes con el mismo ID, guarda ambas y remapea las referencias.
4. Abrir Playlists, seleccionar cada misa y asignar una playlist recuperada. Guardar borrador y luego publicar.
5. Abrir la URL pública en otro navegador y comprobar letras y orden.

Las claves `coro-cumbres:songs`, `coro-cumbres:sets` y `coro-os:v1:*` se leen únicamente como fuentes de migración. No se borran ni reemplazan. Los datos exclusivos de un navegador no pueden recuperarse desde el servidor sin este paso. Las cuatro misas comienzan sin canciones publicadas hasta que se asignan y publican playlists reales. La misa nocturna no tiene horario inventado.

## Datos y publicación

`coro-v2/workspace.json` vive en Vercel Blob privado. Contiene repertorio, sets, asignaciones y snapshots publicados independientes. El servidor realiza escrituras condicionales por ETag; un conflicto devuelve 409 sin sobrescribir. Antes de cada cambio guarda una versión privada en `coro-v2/history/`. No hay eliminación permanente de canciones ni playlists. Archivar conserva los datos.

Una publicación es una copia de las letras y títulos de canciones incluidas en una playlist; no expone notas, fuentes, acordes ni otras canciones. Cambiar un borrador o el repertorio no cambia el snapshot público hasta volver a publicar. Publicar una playlist vacía retira su contenido público sin borrar el repertorio.

Para recuperar un cambio anterior, utilizar las versiones privadas de `coro-v2/history/` y el importador aditivo. No reemplazar manualmente el objeto vigente sin comparar ETag y guardar respaldo. Los respaldos contienen información privada y sólo deben manejarse con acceso administrativo.

## Verificación

`npm run typecheck`, `npm run lint`, `npm run build`, `npm test`. `tests/blob.integration.ts` requiere las credenciales existentes; escribe exclusivamente en un prefijo QA privado y nunca en el workspace de producción. El adaptador `CORO_DATA_FILE` está limitado a desarrollo/test y es ignorado en producción. Las sesiones firmadas utilizadas por E2E son fixtures locales y no sustituyen una prueba real del consentimiento OAuth Google.

El Presenter y Display continúan disponibles en `/presenter` y `/display`, ambos protegidos. Su coordinación entre pestañas usa el canal existente; el repertorio llega del servidor después de verificar la sesión.
