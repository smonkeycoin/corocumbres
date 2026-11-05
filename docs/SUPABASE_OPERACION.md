# Operación de CORO CUMBRES con Supabase

## Estado y límites de esta entrega

El código está preparado y la migración `20261105170609_coro_cumbres_rbac.sql` se aplicó el 5 de noviembre de 2026 al proyecto CORO CUMBRES con referencia `zxrbyhtzurnlrrdaupyf`, nombre `corocumbres@proton.me's Project` y organización `vkuppicfmbsvtlxkltwp`. La auditoría previa confirmó cero tablas en `public`/`private`, cero políticas y cero usuarios Auth. La CLI confirmó la aplicación correcta de esa única migración. No confundir ese resultado con una importación de canciones o una prueba OAuth: ambas siguen pendientes. No se debe modificar TRAVELFLY, TONY u otras aplicaciones ni crear un proyecto Supabase duplicado.

La cuenta del coro usa un perfil CLI separado. Selecciona explícitamente su perfil con `--profile <perfil-coro>` y comprueba el proyecto antes de operar; no dependas del perfil predeterminado TRAVELFLY. El acceso al Llavero requiere la autorización del entorno. Durante esta entrega, la revisión automática dejó de poder resolver solicitudes CLI ampliadas por un límite de uso; el entorno restringido devolvió `ENOTFOUND` al intentar la lectura REST. No se inició ninguna inserción de canciones.

La fuente de producción anterior se encontró en V2, con almacenamiento Vercel Blob privado. El respaldo leído para esta implementación contenía **26 canciones y 0 repertorios**; sus canciones coinciden con la biblioteca inicial auditada. El archivo de trabajo es `/private/tmp/coro-v2-workspace-before-supabase.json`. Antes de una migración real, guarda una copia duradera y privada fuera de `/tmp`, verifica de nuevo el Blob vigente y conserva también los respaldos de localStorage de cada administrador. El script nunca borra esos archivos ni modifica Blob.

No se debe interpretar la presencia de `.env.example`, una compilación correcta o las pruebas locales como una conexión remota verificada. La aplicación muestra un estado cerrado cuando faltan las variables públicas de Supabase.

## Configuración del proyecto correcto

1. Identifica el proyecto CORO CUMBRES en Supabase y registra su referencia. Inspecciona tablas, migraciones, usuarios, datos y políticas existentes antes de aplicar `supabase/migrations/20261105170609_coro_cumbres_rbac.sql`. Es aditiva y falla si ya existen tablas incompatibles; no debe adaptarse mediante borrados.
2. Configura `NEXT_PUBLIC_SUPABASE_URL=https://zxrbyhtzurnlrrdaupyf.supabase.co` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` en desarrollo y en el proyecto Vercel correcto. Se acepta `NEXT_PUBLIC_SUPABASE_ANON_KEY` como compatibilidad. Nunca publiques una clave `service_role` ni `sb_secret_` en una variable `NEXT_PUBLIC_*`.
3. Ejecuta las migraciones y los advisors de seguridad/rendimiento únicamente en el proyecto verificado, usando la CLI instalada conforme a su `--help`. No copies comandos de otra aplicación ni asumas que un enlace local apunta al proyecto correcto.
4. Verifica los grants de la Data API y RLS en `songs`, `masses`, `playlists` y `playlist_items`. `private.admin_allowlist` y `private.admin_memberships` permanecen fuera de la API pública. El contrato y las pruebas SQL están documentados en `supabase/README.md`.

La aplicación ordinaria sólo utiliza la clave pública y la sesión del administrador. La clave `SUPABASE_SERVICE_ROLE_KEY` se reserva al proceso Node de bootstrap descrito más abajo; no debe almacenarse en el frontend ni es necesaria en Vercel para atender usuarios.

## Google OAuth y administradores

En Google Cloud, configura un cliente OAuth para una aplicación web y registra como URI autorizada de redirección **`https://zxrbyhtzurnlrrdaupyf.supabase.co/auth/v1/callback`**, tras confirmar la referencia verificada. Activa Google en Supabase Auth con ese cliente y su secreto. Es el callback de Supabase, distinto del callback de la aplicación.

En Supabase Auth, establece Site URL `https://corocumbres.online` y agrega a la allowlist de redirect URLs `https://corocumbres.online/auth/callback` y `http://localhost:3000/auth/callback` para desarrollo. Si se prueba en el puerto 3028, agrega también `http://localhost:3028/auth/callback` durante esa prueba. Autoriza dominios adicionales sólo si son despliegues propios realmente utilizados. La aplicación inicia Google mediante `/auth/signin`, intercambia el código PKCE en `/auth/callback` y devuelve únicamente a destinos internos permitidos.

La migración aprovisiona estos dos correos en la allowlist privada, con iguales permisos:

- `trinopc1@gmail.com`
- `martrampomp@gmail.com`

No crea sesiones ni supone que dichos usuarios hayan iniciado sesión. Los triggers vinculan `auth.users` con una identidad Google verificada cuyo correo coincide con la allowlist. `is_admin()` comprueba esa relación, la membresía y una sesión vigente de `auth.sessions`. Un correo enviado por el navegador no autoriza nada. Los usuarios ajenos reciben exactamente: **«Esta cuenta no tiene permisos de administración.»**

Comprueba con cada administrador un inicio de sesión real, sesión persistente, callback, expiración y cierre de sesión. El logout es POST con comprobación de origen; RLS deja de aceptar un JWT administrativo cuando desaparece su sesión. Estos pasos siguen pendientes mientras falte la configuración Google/Supabase.

## Migración de canciones: simulación e inserción verificadas

El script `scripts/migrate-library.ts` siempre lee `src/lib/seed-songs.ts` y admite un respaldo adicional `--input`. Reconoce un arreglo de canciones, un workspace con `songs` o un wrapper `{state: workspace}`. Primero valida todo el archivo. Si contiene repertorios o referencias de publicación/asignación, **se detiene antes de escribir**: deben recuperarse mediante la importación administrativa para conservar sus relaciones, revisar fecha/misa y guardarlos como borradores. El archivo original permanece intacto.

Carga las variables mediante un gestor de secretos o un archivo local privado. El siguiente comando usa la carga de entorno de Node; el archivo indicado debe contener la URL y las claves del proyecto verificado y no debe versionarse. No copies secretos a argumentos CLI, historial o informes.

```sh
node --env-file=.env.migration.local --import tsx scripts/migrate-library.ts \
  --project-ref REF \
  --input /ruta/privada/workspace-respaldo.json \
  --report /ruta/privada/migracion-simulacion.json
```

Por defecto se realiza **dry-run**: lee la biblioteca remota para calcular el plan, sin INSERT, UPDATE, DELETE ni RPC mutables. `--project-ref` es obligatorio y debe coincidir exactamente con el host HTTPS de la URL configurada; no se acepta una URL de otro proyecto. Si falta configuración, se muestran los conteos locales y el bloqueo, sin fingir una lectura remota. `--report` es opcional y crea un archivo nuevo con permisos privados; rechaza reemplazar un archivo existente.

Después de revisar el plan y confirmar el respaldo, ejecuta explícitamente:

```sh
node --env-file=.env.migration.local --import tsx scripts/migrate-library.ts \
  --project-ref REF \
  --input /ruta/privada/workspace-respaldo.json \
  --report /ruta/privada/migracion-aplicada.json \
  --apply
```

La operación sólo hace **INSERT**. Nunca usa upsert, sobreescribe canciones, despublica ni borra registros. Las canciones equivalentes se deduplican por todo su contenido; los timestamps de registros existentes permanecen intactos. Ante el mismo ID con contenido diferente, conserva la variante con un sufijo hash estable y registra el mapeo por origen. Una repetición reconoce el contenido previamente insertado. Si una variante importada fue editada posteriormente, conserva ambas versiones con otro identificador estable.

Después de cada INSERT, el script vuelve a leer la canción por ID y compara título, categoría, etiquetas, notas, referencias de archivos, momentos, secciones, letras, acordes, slides y timestamps normalizados. El informe separa `plannedInserts`, `inserted` y `verified`. Ante un fallo, detiene las inserciones y reporta el avance; los INSERT anteriores permanecen y una nueva simulación permite continuar de forma idempotente. Conserva siempre los originales y no consideres completa la migración si `verified` no coincide con `inserted`.

Para el respaldo auditado de 26 canciones idénticas al seed, una base vacía debe planear 26 inserciones, no 52. Eso es un conteo esperado local, no una afirmación de migración remota realizada.

## Datos que sólo existen en un navegador

La recuperación administrativa inspecciona las claves actuales e históricas, incluidas `coro-cumbres:songs`, `coro-cumbres:sets`, `coro-os:v1:library`, `coro-os:v1:sets`, `coro-os:v1:playlists` y `coro-os:v1:setlist`. Importa explícitamente, conserva variantes y remapea cada lote de repertorios a sus propias canciones. No borra localStorage. Exporta antes el respaldo y comprueba el contenido desde otro dispositivo después de importar.

Las cuatro misas conservan los IDs V2: `ninos`, `dominical-12`, `dominical-1330` y `noche`. La última no tiene horario inventado. Una publicación requiere misa y domingo explícitos; importar no publica automáticamente.

## Pruebas y cierre operativo

```sh
npm run typecheck
npm test
npm run build
```

Los tests unitarios comprueban validación, redirects, origen POST, conservación de canciones, planificación de migración y calendario del evangelio en Cancún. La suite `supabase/tests/run-rls.mjs` ejecuta políticas y transacciones sobre PostgreSQL real compilado a WASM (PGlite); adapta tablas Auth y claims para identidades de prueba. No sustituye Google OAuth, cookies reales, JWT en el gateway de Supabase, advisors remotos ni verificación de producción.

Antes del despliegue definitivo, registra el proyecto utilizado, estado de ambos administradores, cantidades insertadas/verificadas y repertorios publicados. Prueba también un visitante y un Google no autorizado consultando/modificando la API directamente, aislamiento por misa, publicar/despublicar, conflictos de edición y persistencia en otro dispositivo. Realiza commit/push/redeploy sólo después de las verificaciones aplicables; reporta sus resultados reales y cualquier bloqueo restante.

El evangelio conserva la implementación ya publicada en la rama remota V2 (código `6f8f758`, reporte `69d3f6b`), que era posterior a la copia local inicialmente auditada (`385dd48`). El calendario canónico `src/data/evangelios-dominicales.json` contiene 157 domingos de 2026–2028 con referencias y fuentes. No se reemplazó por un feed externo. Las personalizaciones existentes siguen en Blob privado, bajo `coro-v2/gospel-titles/YYYY-MM-DD.json`, con ETag y sin tocar el workspace de canciones/repertorios. Su API administrativa usa ahora Supabase y la misma comprobación `is_admin`.

Conserva `BLOB_READ_WRITE_TOKEN` o `BLOB_STORE_ID` del almacén editorial existente sólo en el servidor. Sin Blob configurado, el calendario público sigue funcionando y el editor informa el bloqueo; no finge guardar. El reloj `America/Cancun` selecciona el próximo domingo inclusive, cambia exactamente en medianoche del lunes, comprueba cada minuto y al recuperar foco/visibilidad. Una fecha fuera de cobertura muestra el texto neutral original y nunca reutiliza el título de otra fecha. Los informes originales de despliegue se conservan como evidencia histórica; sus pruebas NextAuth no acreditan la nueva integración Supabase.
