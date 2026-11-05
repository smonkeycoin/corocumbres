# Supabase — CORO CUMBRES

Esta carpeta contiene una migración aditiva y pruebas de PostgreSQL. No vincula ni modifica automáticamente ningún proyecto remoto. Antes de aplicarla, verifica que el proyecto sea CORO CUMBRES e inspecciona sus tablas, políticas y usuarios existentes. La migración falla si las tablas de aplicación ya existen; no las reemplaza ni borra datos.

## Contrato de datos

- `songs`: conserva IDs de texto de hasta 300 caracteres, `title`, `subtitle`, `category`, `tags`, `liturgical_moments`, `source`, `notes`, `sections` JSONB y timestamps. `sections` conserva letras, líneas, acordes y slides sin convertirlos a texto plano.
- `masses`: `ninos` a las 10:00, `dominical-12` a las 12:00, `dominical-1330` a las 13:30 y `noche` con `time = NULL`. Conserva los IDs y las rutas de V2.
- `playlists`: `id`, `title`, `type`, `mass_id`, `sunday_date`, `status`, `sections`, `notes`, `is_archived`, `share_id`, autoría UUID, timestamps y `version`. `sections` contiene metadata de `SetSection` sin `items`.
- `playlist_items`: `(playlist_id, id)` como clave; `section_id`, `song_id`, `position`, `note`, `liturgical_moment`. La posición es única dentro de cada sección de una playlist. Las canciones referenciadas no pueden eliminarse.
- `private.admin_allowlist` y `private.admin_memberships`: privadas, sin permisos de lectura o escritura para clientes, incluidos administradores. Las membresías referencian `auth.users` y no se exponen mediante PostgREST.

Los administradores tienen CRUD mediante RLS. Los visitantes y usuarios autenticados no autorizados sólo leen las misas, playlists publicadas, ítems de secciones habilitadas y sus canciones relacionadas. Despublicar revoca ese acceso inmediatamente, salvo que otra publicación también utilice la canción. No hay una copia pública permanente de la biblioteca.

## Autorización

`rpc('is_admin')` devuelve exclusivamente un booleano para el usuario actual. Consulta en la base de datos la membresía, la allowlist, el correo confirmado de `auth.users`, su estado de bloqueo una sesión existente en `auth.sessions` cuyo `session_id` pertenezca al usuario y cuyo `not_after` no haya vencido, y una identidad `google` con el mismo correo y `identity_data.email_verified = true`.

Los correos iniciales se encuentran únicamente en la migración y en la allowlist privada. Los triggers sobre `auth.users` y `auth.identities` aprovisionan la membresía cuando la confirmación y la identidad estén disponibles, independientemente de su orden de creación. También retiran membresías cuando cambia o desaparece la identidad. No se confía en `user_metadata`, el correo recibido del navegador ni datos de autorización guardados en localStorage.

No se necesita una clave `service_role` para el frontend, el callback ni las operaciones administrativas. La API de Supabase valida la firma y caducidad del JWT antes de establecer el rol y `auth.uid()` usados por RLS. Además, RLS comprueba la sesión en cada operación: un JWT administrativo previo deja de autorizar cuando Supabase elimina su sesión al cerrar sesión. Las peticiones sin `session_id`, con una sesión ajena o con una sesión vencida fallan de forma segura.

## Guardado atómico

```ts
const { data, error } = await supabase.rpc('save_playlist', {
  p_playlist: {
    id: set.id,
    title: set.name,
    type: set.type,
    mass_id: set.massId ?? null,
    sunday_date: set.date ?? null,
    status: set.status ?? 'draft',
    notes: set.notes ?? null,
    sections: set.sections, // SetSection completas, con items y songId en camelCase.
    is_archived: set.isArchived,
    share_id: set.shareId ?? null,
    created_at: set.createdAt,
  },
  p_expected_version: set.version ?? null,
  p_import: false,
});
```

El resultado es una fila `playlists` en snake_case, con metadata de secciones sin ítems. Lee `playlist_items` y reconstruye `CoroSet` por `section_id`, ordenando por `position`. Al editar se requiere la versión leída previamente; `40001` significa que debe recargarse antes de guardar. La función bloquea la fila y guarda metadata e ítems en una sola transacción. Un error de referencia o validación revierte todos los cambios.

Una publicación requiere misa, fecha dominical y playlist no archivada. `(mass_id, sunday_date)` es único tanto en borradores como en publicaciones. Una nueva playlist sin asignación puede mantenerse como borrador. La importación con `p_import = true` fuerza `draft` y rechaza IDs existentes (`23505`), aunque se solicite publicar. No publiques importaciones automáticamente.

Las migraciones de datos deben conservar un respaldo del Blob privado V2 y del localStorage histórico. Deben importar canciones primero, resolver conflictos de IDs de forma explícita y guardar después las playlists como borradores. Esta migración estructural no extrae ni borra ninguna de esas fuentes. Las fechas legadas no dominicales requieren adaptación explícita antes de asignarse a `sunday_date`; no deben descartarse silenciosamente.

## Pruebas ejecutables

```sh
node supabase/tests/run-rls.mjs
```

El runner usa `@electric-sql/pglite` y aplica todos los SQL de `migrations/` a PostgreSQL real compilado a WASM. No usa credenciales ni red. `tests/rls.sql` ejecuta 83 aserciones de autorización, RLS, CRUD, relaciones, publicación/despublicación, aislamiento de las cuatro misas, transacciones, versiones y aprovisionamiento/revocación de administradores. Los cambios de la suite se revierten.

La prueba reemplaza únicamente las tablas mínimas de Supabase Auth y la extracción de `auth.uid()` / `auth.jwt()` para establecer identidades controladas. No simula las políticas RLS ni la ejecución SQL. No verifica el intercambio OAuth real, cookies, JWT vencidos en el gateway, logout remoto, otro dispositivo ni producción. Esas comprobaciones requieren el proyecto Supabase correcto y Google OAuth configurado.

Antes de producción también deben ejecutarse los advisors de seguridad y rendimiento en el proyecto correcto y verificarse los permisos del esquema expuesto en la Data API. No se ejecutaron advisors remotos sobre otros proyectos.

Referencias: [identidades de Supabase](https://supabase.com/docs/guides/auth/identities), [sesiones y revocación](https://supabase.com/docs/guides/auth/sessions), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [seguridad de la Data API](https://supabase.com/docs/guides/api/securing-your-api).

## Verificación del proyecto real

El 5 de noviembre de 2026 se aplicaron ambas migraciones al proyecto CORO CUMBRES `zxrbyhtzurnlrrdaupyf`. Se importaron y verificaron por lectura posterior 26 canciones, conservando todos sus identificadores, campos y timestamps. No se publicaron playlists. La revisión posterior encontró 26 canciones, 0 playlists, 4 misas y ninguna advertencia o error en los advisors de seguridad/rendimiento.

La segunda migración separa los permisos de escritura y combina las condiciones de lectura por rol. Mantiene el acceso anónimo exclusivamente público, incluso si se examinan las políticas con claims sintéticos en SQL. Las 83 aserciones locales pasan con ambas migraciones.

La prueba HTTP usa exclusivamente la clave pública y requiere una referencia explícita:

```sh
node --env-file=.env.local supabase/tests/smoke-rest.mjs \
  --project-ref zxrbyhtzurnlrrdaupyf \
  --expect-private-library --check-denials
```

`--expect-private-library` corresponde al estado inicial sin publicaciones; no debe utilizarse para afirmar que una biblioteca publicada es privada. `--check-denials` verifica que las escrituras anónimas sean rechazadas mediante filtros `id IS NULL`; las claves primarias no permiten nulos, por lo que estas solicitudes no pueden modificar filas aunque hubiese un defecto de permisos. La prueba pasó contra el proyecto real después de ambas migraciones.

`tests/live-rls-rollback.sql` contiene 29 verificaciones adicionales para el esquema Auth real. Debe revisarse y enviarse íntegramente en una sola conexión: abre una transacción y termina con `ROLLBACK`. No usa endpoints Auth ni envía correos. Aborta si alguno de los administradores reales ya existe; sus identidades temporales nunca deben sustituir un inicio de sesión real. Después de ejecutarlo hay que comprobar que no queden usuarios `c0800000-*`, canciones `__coro_rls_*` ni esquema `coro_live_check`. Estas pruebas de base de datos no sustituyen la verificación OAuth con las dos cuentas reales.

El fixture se ejecutó contra `zxrbyhtzurnlrrdaupyf` y aprobó las 29 aserciones. La comprobación independiente posterior, a las **22:47:26 UTC del 5 de noviembre de 2026**, confirmó cero usuarios, identidades, sesiones, membresías, canciones, playlists, ítems o esquemas de prueba. Los conteos persistentes permanecieron en **26 canciones, 0 playlists y 4 misas**; Auth tenía 0 usuarios, 0 identidades y 0 sesiones. No se llamó ningún endpoint OAuth ni se enviaron correos.

La primera ejecución se revirtió al detectar una diferencia entre motores en el código del rechazo de clave foránea. La aserción acepta ahora únicamente los dos códigos equivalentes (`23503` en Supabase y `23001` en PGlite); las demás expectativas siguen siendo estrictas. Se verificó la limpieza antes de repetir. La evidencia final y la consulta de limpieza se guardaron con permisos `0600` en el respaldo privado, en `live-rls-rollback-final-evidence.json` y `live-rls-final-cleanup.json`.

Para operaciones CLI usa explícitamente el archivo del perfil CORO y la referencia del proyecto. En la versión instalada, el nombre corto del perfil no basta:

```sh
supabase --profile /Users/smonkeycoin/.supabase/profiles/corocumbres.yaml \
  db advisors --linked --project-ref zxrbyhtzurnlrrdaupyf --type all --level warn
```
