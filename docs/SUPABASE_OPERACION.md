# Operación de CORO CUMBRES con Supabase

## Estado y límites de esta entrega

El código está preparado y las migraciones `20261105170609_coro_cumbres_rbac.sql` y `20261105223755_consolidate_read_policies.sql` se aplicaron el 5 de noviembre de 2026 al proyecto CORO CUMBRES con referencia `zxrbyhtzurnlrrdaupyf`, nombre `corocumbres@proton.me's Project` y organización `vkuppicfmbsvtlxkltwp`. La auditoría inicial confirmó cero tablas en `public`/`private`, cero políticas y cero usuarios Auth. Después se importaron y verificaron 26 canciones, conservando identificadores y todos sus campos. La segunda migración elimina políticas de lectura superpuestas sin cambiar permisos. Los advisors remotos posteriores a ambas migraciones devolvieron 0 WARN y 0 ERROR. El smoke REST remoto confirmó cuatro misas públicas, biblioteca sin publicar oculta y escrituras anónimas denegadas. Google OAuth real ya pasó con el primer administrador, junto con persistencia, publicación/despublicación y logout en preview. Quedan las pruebas reales del segundo administrador, una cuenta Google ajena y otro dispositivo; producción ya está READY. No se debe modificar TRAVELFLY, TONY u otras aplicaciones ni crear un proyecto Supabase duplicado.

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

Google Cloud tiene el proyecto autorizado **Coro Cumbres** (`corocumbres-auth`), sin cuenta de facturación vinculada. Branding y audiencia External/Testing están guardados con `trinopc1@gmail.com` como soporte/contacto. La política de datos y la creación del cliente Web **Coro Cumbres Web** fueron aprobadas expresamente por el usuario. Quedaron guardados sólo `userinfo.email`, `userinfo.profile` y `openid`, sin otros permisos sensibles/restringidos, y los dos usuarios de prueba.

El cliente registra únicamente el origen JavaScript `https://corocumbres.online` y la URI de redirección Google **`https://zxrbyhtzurnlrrdaupyf.supabase.co/auth/v1/callback`**. Google está habilitado en Supabase con ese cliente. El secreto sólo se transfirió en memoria y permanece fuera de documentación, repositorio y variables públicas. El OAuth real confirmó el intercambio; una representación diferente del secreto en Management GET no debe interpretarse como un fallo del cliente ni motivar otra escritura.

Supabase URL Configuration ya está aplicada y verificada: Site URL `https://corocumbres.online` y esta allowlist exacta:

- `https://corocumbres.online/auth/callback**`
- `http://localhost:3000/auth/callback**`
- `http://localhost:3028/auth/callback**`
- `https://corocumbres-jhk55bl3d-neuro-practice-s-projects.vercel.app/auth/callback**`

El sufijo cubre el parámetro `next`; no hay comodín de dominios. La activación de Google mantuvo estas URLs, la opción nonce y la opción de correo intactas. La aplicación inicia Google mediante `/auth/signin`, intercambia el código PKCE en `/auth/callback` y devuelve únicamente a destinos internos permitidos. No hace falta añadir localhost ni preview como callbacks de Google: todos usan el callback alojado de Supabase ya registrado.

La migración aprovisiona estos dos correos en la allowlist privada, con iguales permisos:

- `trinopc1@gmail.com`
- `martrampomp@gmail.com`

No crea sesiones ni supone que dichos usuarios hayan iniciado sesión. Los triggers vinculan `auth.users` con una identidad Google verificada cuyo correo coincide con la allowlist. `is_admin()` comprueba esa relación, la membresía y una sesión vigente de `auth.sessions`. Un correo enviado por el navegador no autoriza nada. Los usuarios ajenos reciben exactamente: **«Esta cuenta no tiene permisos de administración.»**

Comprueba con cada administrador un inicio de sesión real, sesión persistente, callback, expiración y cierre de sesión. El logout es POST con comprobación de origen; RLS deja de aceptar un JWT administrativo cuando desaparece su sesión. El primer administrador ya completó OAuth y callback, accedió a las 26 canciones y tuvo identidad Google verificada, membresía y una sesión vigente confirmadas en base. Tras logout, esa cuenta quedó con cero sesiones y `/admin` redirigió a `/login`. Para `martrampomp@gmail.com`, Google solicita contraseña: el usuario debe completarla. Expiración real, cuenta Google ajena y segundo dispositivo permanecen pendientes.

## Migración de canciones completada y procedimiento reutilizable

**Importación completada: 26 insertadas y 26 verificadas; el respaldo no contenía repertorios. Estado actual posterior a las pruebas: 26 canciones intactas, 1 borrador privado y 0 publicaciones.** No repitas la importación del respaldo auditado como tarea pendiente. Los comandos siguientes documentan el procedimiento para nuevos datos o una recuperación que se haya revisado explícitamente.

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

Resultados comprobados: 55 pruebas de aplicación, 83 aserciones PostgreSQL/PGlite y 29 aserciones transaccionales sobre PostgreSQL remoto; TypeScript, ESLint y build correctos; smoke REST público remoto correcto y advisors remotos sin WARN/ERROR. OAuth real del primer administrador y el flujo de guardar/publicar/despublicar/logout pasaron en preview. El despliegue público fue autorizado expresamente y está READY; el dominio y el login público se verificaron. Las pruebas restantes de cuentas y dispositivos indicadas abajo continúan pendientes.

```sh
npm run typecheck
npm test
npm run build
```

Los tests unitarios comprueban validación, redirects, origen POST, conservación de canciones, planificación de migración y calendario del evangelio en Cancún. La suite `supabase/tests/run-rls.mjs` ejecuta políticas y transacciones sobre PostgreSQL real compilado a WASM (PGlite); adapta tablas Auth y claims para identidades de prueba. No sustituye Google OAuth, cookies reales, JWT en el gateway de Supabase, advisors remotos ni verificación de producción.

El fixture remoto `supabase/tests/live-rls-rollback.sql` completó 29 aserciones con identidades/claims SQL temporales y `ROLLBACK`. Una consulta separada a las **22:47:26.912697 UTC del 5 de noviembre de 2026** confirmó cero filas de prueba en Auth, membresías y tablas de aplicación, y ningún esquema de prueba restante. En ese punto histórico los totales eran 26 canciones, 0 repertorios y 4 misas, sin usuarios/identidades/sesiones Auth reales. Después se creó la identidad real del primer administrador y el borrador de verificación; esos totales históricos no describen el estado actual. Los archivos privados `live-rls-rollback-final-evidence.json` y `live-rls-final-cleanup.json`, en el directorio de respaldo citado arriba, documentan el resultado y la limpieza.

Esa verificación remota comprueba el SQL real del proyecto; no acredita intercambio Google OAuth, cookies ni JWT del gateway. El fixture no envía correos ni crea identidades permanentes. No debe ejecutarse como una comprobación rutinaria después de que existan administradores reales: incorpora una guarda que se detiene si alguno ya está creado.

La última versión publicada es `a849cde7f0d469ceb64acda5bd09f501f6fe9594`, preview READY `https://corocumbres-jhk55bl3d-neuro-practice-s-projects.vercel.app`. El usuario autorizó expresamente el redeploy público inmediato a `https://corocumbres.online`, sin esperar al segundo administrador. Producción está READY y su login público ofrece Google habilitado. El commit posterior será sólo documental; el código ejecutable desplegado permanece en `a849cde`.

En ese preview se guardó `set-ses44bsl-mw474kwp`, **Verificación de integración — temporal**, misa `ninos`, domingo `2099-01-04`, orden **Busca Primero → Alabanzas**. La recarga confirmó persistencia. Pasó de v1 borrador a v2 publicado y después a v3 borrador. REST anónimo vio exactamente las 2 canciones relacionadas mientras estuvo publicado, mantuvo otras 24 ocultas y no encontró repertorios en las otras 3 misas. Tras despublicar, el visitante ve cero playlists/ítems/canciones. El borrador privado se conserva intencionalmente para probar al segundo administrador; las 26 canciones siguen intactas.

Evidencias privadas: `real-admin-login-check-20261105.json`, `real-ui-draft-persistence.json`, `real-ui-published-anonymous-rest.json`, `real-ui-unpublished-and-logout-sql.json` y `real-ui-unpublished-anonymous-rest.json`. Están en el directorio de respaldo, junto con la evidencia del proveedor y `release-receipt.json`, sin secretos/tokens.

Para cerrar: el usuario debe completar la contraseña de Google del segundo administrador; comprobar sus permisos equivalentes sobre el borrador, la denegación de un Google ajeno, expiración real y persistencia desde otro dispositivo. El despliegue público ya está READY independientemente de esas pruebas pendientes; completar la aceptación restante sobre producción. No se deben confundir fixtures SQL o el éxito del primer administrador con pruebas reales de cuentas/dispositivos aún pendientes.

El evangelio conserva la implementación ya publicada en la rama remota V2 (código `6f8f758`, reporte `69d3f6b`), que era posterior a la copia local inicialmente auditada (`385dd48`). El calendario canónico `src/data/evangelios-dominicales.json` contiene 157 domingos de 2026–2028 con referencias y fuentes. No se reemplazó por un feed externo. Las personalizaciones existentes siguen en Blob privado, bajo `coro-v2/gospel-titles/YYYY-MM-DD.json`, con ETag y sin tocar el workspace de canciones/repertorios. Su API administrativa usa ahora Supabase y la misma comprobación `is_admin`.

Conserva `BLOB_READ_WRITE_TOKEN` o `BLOB_STORE_ID` del almacén editorial existente sólo en el servidor. Sin Blob configurado, el calendario público sigue funcionando y el editor informa el bloqueo; no finge guardar. El reloj `America/Cancun` selecciona el próximo domingo inclusive, cambia exactamente en medianoche del lunes, comprueba cada minuto y al recuperar foco/visibilidad. Una fecha fuera de cobertura muestra el texto neutral original y nunca reutiliza el título de otra fecha. Los informes originales de despliegue se conservan como evidencia histórica; sus pruebas NextAuth no acreditan la nueva integración Supabase.

Producción **READY** para el código probado `a849cde7f0d469ceb64acda5bd09f501f6fe9594`: `dpl_gfTYASYNZMjRfvonvTvxYhZM5PiT`, URL `https://corocumbres-ls0jq86b7-neuro-practice-s-projects.vercel.app`, build de 25.818 segundos. Los alias `corocumbres.online` y `www.corocumbres.online` quedaron asignados sin error. Navegador directo en `/login`: sitio público y Google habilitado. HTTP anónimo con User-Agent iPhone Safari: 200, botón Google presente/habilitado, sin mensaje antiguo de preparación ni protección Vercel. No se observaron errores de runtime en los últimos 10 minutos consultados; la herramienta de drains devolvió 404 y su estado no se considera verificado. Estas comprobaciones no sustituyen OAuth real del segundo administrador, cuenta ajena ni segundo dispositivo.

Smoke HTTP de producción (`scripts/smoke-http.mjs`): **13 de 13 comprobaciones correctas**. Portal público; `/admin`, `/presenter` y `/display` redirigen a login; cuatro POST con origen incorrecto reciben 403; callback inválido permanece interno; seed, entorno y workspace administrativo no se exponen; evangelio responde 200 con `no-store`.

Inicio OAuth en producción comprobado: POST `/auth/signin` con Origin válido devuelve 303 hacia `/auth/v1/authorize` del proyecto Supabase correcto, proveedor Google, callback `https://corocumbres.online/auth/callback?next=%2Fadmin`, PKCE presente y `no-store`. Verifica el inicio del flujo; el intercambio Google completo comprobado anteriormente fue en preview.
