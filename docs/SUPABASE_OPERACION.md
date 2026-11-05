# Operación de CORO CUMBRES con Supabase

## Estado y límites de esta entrega

El código está preparado y las migraciones `20261105170609_coro_cumbres_rbac.sql` y `20261105223755_consolidate_read_policies.sql` se aplicaron el 5 de noviembre de 2026 al proyecto CORO CUMBRES con referencia `zxrbyhtzurnlrrdaupyf`, nombre `corocumbres@proton.me's Project` y organización `vkuppicfmbsvtlxkltwp`. La auditoría inicial confirmó cero tablas en `public`/`private`, cero políticas y cero usuarios Auth. Después se importaron y verificaron 26 canciones, conservando identificadores y todos sus campos. La segunda migración elimina políticas de lectura superpuestas sin cambiar permisos. Los advisors remotos posteriores a ambas migraciones devolvieron 0 WARN y 0 ERROR. El smoke REST remoto confirmó cuatro misas públicas, biblioteca sin publicar oculta y escrituras anónimas denegadas. Google OAuth y las pruebas con usuarios reales siguen pendientes. No se debe modificar TRAVELFLY, TONY u otras aplicaciones ni crear un proyecto Supabase duplicado.

La cuenta del coro usa un perfil CLI separado. En la versión instalada, selecciona explícitamente `--profile /Users/smonkeycoin/.supabase/profiles/corocumbres.yaml` y comprueba también `--project-ref zxrbyhtzurnlrrdaupyf` antes de operar; el alias corto `--profile corocumbres` no funciona en esta versión. No dependas del perfil predeterminado. El acceso CLI y de red quedó resuelto y permitió verificar el proyecto, aplicar ambas migraciones y completar la importación segura. Las restricciones de los primeros intentos ya no son pasos pendientes. El script Node valida su propia URL/ref y no depende del perfil CLI.

La fuente de producción anterior se encontró en V2, con almacenamiento Vercel Blob privado. El respaldo leído para esta implementación contenía **26 canciones y 0 repertorios**; sus canciones coinciden con la biblioteca inicial auditada. La copia duradera y privada está en `/Users/smonkeycoin/Desktop/REPO/CORO_CUMBRES_BACKUPS/supabase-migration-20261105/workspace-before-supabase.json`. Antes de aplicar se releyó el Blob vigente y se comprobó igualdad completa con ese respaldo: SHA-256 canónico `f5be1d5591f93c524a6f5db1a742511868f92f4a5a9e93c51b0cf63938e8ea67`. Conserva esta copia y los respaldos de localStorage de cada administrador. El script nunca borra esos archivos ni modifica Blob.

No se debe interpretar la presencia de `.env.example`, una compilación correcta o las pruebas locales como una conexión remota verificada. La aplicación muestra un estado cerrado cuando faltan las variables públicas de Supabase.

## Configuración aplicada y mantenimiento del proyecto correcto

1. El proyecto verificado es `zxrbyhtzurnlrrdaupyf`. Ambas migraciones citadas arriba ya están aplicadas; no deben ejecutarse de nuevo como SQL manual. Antes de cualquier cambio futuro, inspecciona el historial, tablas, usuarios, datos y políticas existentes. No adaptes conflictos mediante borrados.
2. La aplicación utiliza `NEXT_PUBLIC_SUPABASE_URL=https://zxrbyhtzurnlrrdaupyf.supabase.co` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` en desarrollo y en el proyecto Vercel correcto. Se acepta `NEXT_PUBLIC_SUPABASE_ANON_KEY` como compatibilidad. Nunca publiques una clave `service_role` ni `sb_secret_` en una variable `NEXT_PUBLIC_*`.
3. Para cambios futuros, ejecuta sólo migraciones nuevas y vuelve a comprobar los advisors de seguridad/rendimiento en el proyecto verificado, usando la CLI instalada conforme a su `--help`. El resultado actual es 0 WARN y 0 ERROR. No copies comandos de otra aplicación ni asumas que un enlace local apunta al proyecto correcto.
4. Mantén los grants verificados de la Data API y RLS en `songs`, `masses`, `playlists` y `playlist_items`. `private.admin_allowlist` y `private.admin_memberships` permanecen fuera de la API pública. El contrato y las pruebas SQL están documentados en `supabase/README.md`.

La aplicación ordinaria sólo utiliza la clave pública y la sesión del administrador. La clave `SUPABASE_SERVICE_ROLE_KEY` se reserva al proceso Node de bootstrap descrito más abajo; no debe almacenarse en el frontend ni es necesaria en Vercel para atender usuarios.

## Google OAuth y administradores

Google Cloud ya tiene el proyecto autorizado **Coro Cumbres** (`corocumbres-auth`), sin cuenta de facturación vinculada. Branding y audiencia External/Testing están preparados con `trinopc1@gmail.com` como soporte/contacto, pero falta la aceptación específica del usuario de la política de datos de Google. Después de esa aceptación, configura un cliente OAuth para una aplicación web y registra como URI autorizada de redirección **`https://zxrbyhtzurnlrrdaupyf.supabase.co/auth/v1/callback`**, tras confirmar la referencia verificada. Activa Google en Supabase Auth con ese cliente y su secreto. Es el callback de Supabase, distinto del callback de la aplicación.

En Supabase Auth, establece Site URL `https://corocumbres.online` y agrega a la allowlist de redirect URLs `https://corocumbres.online/auth/callback` y `http://localhost:3000/auth/callback` para desarrollo. Si se prueba en el puerto 3028, agrega también `http://localhost:3028/auth/callback` durante esa prueba. Autoriza dominios adicionales sólo si son despliegues propios realmente utilizados. La aplicación inicia Google mediante `/auth/signin`, intercambia el código PKCE en `/auth/callback` y devuelve únicamente a destinos internos permitidos.

La migración aprovisiona estos dos correos en la allowlist privada, con iguales permisos:

- `trinopc1@gmail.com`
- `martrampomp@gmail.com`

No crea sesiones ni supone que dichos usuarios hayan iniciado sesión. Los triggers vinculan `auth.users` con una identidad Google verificada cuyo correo coincide con la allowlist. `is_admin()` comprueba esa relación, la membresía y una sesión vigente de `auth.sessions`. Un correo enviado por el navegador no autoriza nada. Los usuarios ajenos reciben exactamente: **«Esta cuenta no tiene permisos de administración.»**

Comprueba con cada administrador un inicio de sesión real, sesión persistente, callback, expiración y cierre de sesión. El logout es POST con comprobación de origen; RLS deja de aceptar un JWT administrativo cuando desaparece su sesión. Estos pasos siguen pendientes mientras falte completar Google OAuth; Supabase y sus datos ya están configurados.

## Migración de canciones completada y procedimiento reutilizable

**Estado actual: 26 insertadas y 26 verificadas; 0 repertorios y 0 publicaciones.** No repitas la importación del respaldo auditado como tarea pendiente. Los comandos siguientes documentan el procedimiento para nuevos datos o una recuperación que se haya revisado explícitamente.

El script `scripts/migrate-library.ts` siempre lee `src/lib/seed-songs.ts` y admite un respaldo adicional `--input`. Reconoce un arreglo de canciones, un workspace con `songs` o un wrapper `{state: workspace}`. Primero valida todo el archivo. Si contiene repertorios o referencias de publicación/asignación, **se detiene antes de escribir**: deben recuperarse mediante la importación administrativa para conservar sus relaciones, revisar fecha/misa y guardarlos como borradores. El archivo original permanece intacto.

Carga las variables mediante un gestor de secretos o un archivo local privado. El siguiente comando usa la carga de entorno de Node; el archivo indicado debe contener la URL y las claves del proyecto verificado y no debe versionarse. No copies secretos a argumentos CLI, historial o informes.

```sh
node --env-file=.env.migration.local --import tsx scripts/migrate-library.ts \
  --project-ref zxrbyhtzurnlrrdaupyf \
  --input /ruta/privada/workspace-respaldo.json \
  --report /ruta/privada/migracion-simulacion.json
```

Por defecto se realiza **dry-run**: lee la biblioteca remota para calcular el plan, sin INSERT, UPDATE, DELETE ni RPC mutables. `--project-ref` es obligatorio y debe coincidir exactamente con el host HTTPS de la URL configurada; no se acepta una URL de otro proyecto. Si falta configuración, se muestran los conteos locales y el bloqueo, sin fingir una lectura remota. `--report` es opcional y crea un archivo nuevo con permisos privados; rechaza reemplazar un archivo existente.

Sólo para una importación futura de datos nuevos, después de revisar el plan y confirmar su respaldo, la escritura se habilita explícitamente así:

```sh
node --env-file=.env.migration.local --import tsx scripts/migrate-library.ts \
  --project-ref zxrbyhtzurnlrrdaupyf \
  --input /ruta/privada/workspace-respaldo.json \
  --report /ruta/privada/migracion-aplicada.json \
  --apply
```

La operación sólo hace **INSERT**. Nunca usa upsert, sobreescribe canciones, despublica ni borra registros. Las canciones equivalentes se deduplican por todo su contenido; los timestamps de registros existentes permanecen intactos. Ante el mismo ID con contenido diferente, conserva la variante con un sufijo hash estable y registra el mapeo por origen. Una repetición reconoce el contenido previamente insertado. Si una variante importada fue editada posteriormente, conserva ambas versiones con otro identificador estable.

Después de cada INSERT, el script vuelve a leer la canción por ID y compara título, categoría, etiquetas, notas, referencias de archivos, momentos, secciones, letras, acordes, slides y timestamps normalizados. El informe separa `plannedInserts`, `inserted` y `verified`. Ante un fallo, detiene las inserciones y reporta el avance; los INSERT anteriores permanecen y una nueva simulación permite continuar de forma idempotente. Conserva siempre los originales y no consideres completa la migración si `verified` no coincide con `inserted`.

Para el respaldo auditado de 26 canciones idénticas al seed, una base vacía debe planear 26 inserciones, no 52. En esta entrega, el plan remoto se comprobó y ejecutó con **26 insertadas y 26 verificadas**, sin variantes ni cambios de ID; el informe privado es `applied-library-20261105.json`. Antes de aplicarlo se releyó el Blob vigente y se comprobó que todo el documento coincidía con el respaldo.

## Datos que sólo existen en un navegador

La recuperación administrativa inspecciona las claves actuales e históricas, incluidas `coro-cumbres:songs`, `coro-cumbres:sets`, `coro-os:v1:library`, `coro-os:v1:sets`, `coro-os:v1:playlists` y `coro-os:v1:setlist`. Importa explícitamente, conserva variantes y remapea cada lote de repertorios a sus propias canciones. No borra localStorage. Exporta antes el respaldo y comprueba el contenido desde otro dispositivo después de importar.

Las cuatro misas conservan los IDs V2: `ninos`, `dominical-12`, `dominical-1330` y `noche`. La última no tiene horario inventado. Una publicación requiere misa y domingo explícitos; importar no publica automáticamente.

## Pruebas y cierre operativo

Resultados comprobados: 55 pruebas de aplicación, 83 aserciones PostgreSQL/PGlite y 29 aserciones transaccionales sobre PostgreSQL remoto; TypeScript, ESLint y build correctos; smoke REST público remoto correcto y advisors remotos sin WARN/ERROR. Las pruebas con Google real y la promoción a producción continúan pendientes.

```sh
npm run typecheck
npm test
npm run build
```

Los tests unitarios comprueban validación, redirects, origen POST, conservación de canciones, planificación de migración y calendario del evangelio en Cancún. La suite `supabase/tests/run-rls.mjs` ejecuta políticas y transacciones sobre PostgreSQL real compilado a WASM (PGlite); adapta tablas Auth y claims para identidades de prueba. No sustituye Google OAuth, cookies reales, JWT en el gateway de Supabase, advisors remotos ni verificación de producción.

El fixture remoto `supabase/tests/live-rls-rollback.sql` completó 29 aserciones con identidades/claims SQL temporales y `ROLLBACK`. Una consulta separada a las **22:47:26.912697 UTC del 5 de noviembre de 2026** confirmó cero filas de prueba en Auth, membresías y tablas de aplicación, y ningún esquema de prueba restante. Los totales persistentes permanecen en 26 canciones, 0 repertorios y 4 misas; Auth sigue con 0 usuarios, identidades y sesiones reales. Los archivos privados `live-rls-rollback-final-evidence.json` y `live-rls-final-cleanup.json`, en el directorio de respaldo citado arriba, documentan el resultado y la limpieza.

Esa verificación remota comprueba el SQL real del proyecto; no acredita intercambio Google OAuth, cookies ni JWT del gateway. El fixture no envía correos ni crea identidades permanentes. No debe ejecutarse como una comprobación rutinaria después de que existan administradores reales: incorpora una guarda que se detiene si alguno ya está creado.

La versión de referencia `2d445dd8808285710e890873f64bfd8b80c76c05` tiene una vista previa READY; esta revisión incorpora la evidencia remota posterior. El SHA y la URL del despliegue correspondiente se registran en la entrega y en el recibo privado de publicación. Esta integración todavía no se promovió a `https://corocumbres.online`. Antes de promoverla, confirma el estado real de ambos administradores y registra las pruebas pendientes. Prueba también un visitante y un Google no autorizado consultando/modificando la API directamente, aislamiento por misa, publicar/despublicar, conflictos de edición y persistencia en otro dispositivo. Realiza commit/push/redeploy sólo después de las verificaciones aplicables; reporta sus resultados reales y cualquier bloqueo restante.

El evangelio conserva la implementación ya publicada en la rama remota V2 (código `6f8f758`, reporte `69d3f6b`), que era posterior a la copia local inicialmente auditada (`385dd48`). El calendario canónico `src/data/evangelios-dominicales.json` contiene 157 domingos de 2026–2028 con referencias y fuentes. No se reemplazó por un feed externo. Las personalizaciones existentes siguen en Blob privado, bajo `coro-v2/gospel-titles/YYYY-MM-DD.json`, con ETag y sin tocar el workspace de canciones/repertorios. Su API administrativa usa ahora Supabase y la misma comprobación `is_admin`.

Conserva `BLOB_READ_WRITE_TOKEN` o `BLOB_STORE_ID` del almacén editorial existente sólo en el servidor. Sin Blob configurado, el calendario público sigue funcionando y el editor informa el bloqueo; no finge guardar. El reloj `America/Cancun` selecciona el próximo domingo inclusive, cambia exactamente en medianoche del lunes, comprueba cada minuto y al recuperar foco/visibilidad. Una fecha fuera de cobertura muestra el texto neutral original y nunca reutiliza el título de otra fecha. Los informes originales de despliegue se conservan como evidencia histórica; sus pruebas NextAuth no acreditan la nueva integración Supabase.
