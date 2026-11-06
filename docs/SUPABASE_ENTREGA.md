# CORO CUMBRES — estado de implementación Supabase

Fecha: 5 de noviembre de 2026, America/Cancun. **Producción READY y login público con Google habilitado; aceptación restante de cuentas y dispositivos pendiente.**

## Infraestructura y datos

- Proyecto verificado: `zxrbyhtzurnlrrdaupyf`, `corocumbres@proton.me's Project`, organización `vkuppicfmbsvtlxkltwp`.
- URL: `https://zxrbyhtzurnlrrdaupyf.supabase.co`.
- Auditoría previa: cero tablas públicas/privadas, cero políticas y cero usuarios Auth.
- Migraciones aplicadas correctamente en el proyecto verificado: `20261105170609_coro_cumbres_rbac.sql` y `20261105223755_consolidate_read_policies.sql`. La segunda separa las operaciones de escritura y consolida SELECT sin ampliar permisos; recibió revisión independiente de seguridad.
- Tablas creadas: `public.songs`, `public.masses`, `public.playlists`, `public.playlist_items`, `private.admin_allowlist` y `private.admin_memberships`.
- RLS habilitado en las seis tablas. Anónimos leen misas, playlists publicadas y canciones relacionadas con secciones habilitadas. Las escrituras requieren membresía, identidad Google verificada y sesión vigente; las tablas privadas no tienen acceso de lectura desde la aplicación.
- Cuatro misas aprovisionadas; `noche` tiene horario NULL. Allowlist privada con los dos correos solicitados. No se crearon identidades ni sesiones ficticias permanentes.
- Respaldo de Vercel Blob: **26 canciones, 0 repertorios, 0 publicaciones**. Copia duradera: `/Users/smonkeycoin/Desktop/REPO/CORO_CUMBRES_BACKUPS/supabase-migration-20261105/workspace-before-supabase.json`.
- **Canciones importadas remotamente: 26, verificadas: 26.** Una nueva simulación remota comprobó base vacía y 26 canciones únicas entre semillas y respaldo, sin variantes ni cambios de ID. Antes de aplicar se releyó Blob: coincidía exactamente con el respaldo completo (SHA-256 canónico `f5be1d5591f93c524a6f5db1a742511868f92f4a5a9e93c51b0cf63938e8ea67`). Cada INSERT se releyó y comparó en todos los campos y timestamps. Informe privado: `applied-library-20261105.json` en el directorio de respaldo. La importación no publicó repertorios. Posteriormente se probó una publicación temporal y se despublicó; queda un borrador privado de verificación.
- Blob y localStorage permanecen intactos. La importación administrativa explícita conserva variantes y relaciones, sin publicar automáticamente.

## Autenticación y despliegue

- Supabase Auth tiene Google **habilitado**, confirmado tanto por Management API como por el servicio público Auth. Se modificaron exclusivamente los campos del cliente, secreto y activación del proveedor. El secreto no figura en documentos ni informes; el intercambio OAuth real confirmó su validez.
- URL Configuration aplicada y verificada: Site URL `https://corocumbres.online`; callbacks `/auth/callback**` para producción, localhost 3000/3028 y la vista previa exacta `corocumbres-jhk55bl3d-neuro-practice-s-projects.vercel.app`. El sufijo cubre el parámetro `next`; no se autorizó un comodín de dominios. Sólo cambiaron `site_url` y `uri_allow_list`.
- `trinopc1@gmail.com` completó Google OAuth, callback al preview y acceso a `/admin` con las 26 canciones. La consulta de base confirmó identidad Google verificada, membresía administrativa y una sesión vigente. Tras cerrar sesión quedaron cero sesiones de esa cuenta y `/admin` redirigió a `/login`. `martrampomp@gmail.com` conserva los mismos permisos previstos; Google solicita su contraseña y el usuario debe completar ese paso.
- La interfaz usa PKCE, cookies SSR, rutas protegidas, redirects internos y POST con comprobación de origen para iniciar/cerrar sesión. Login y POST consultan la configuración real de Auth antes de ofrecer Google; las claves públicas por sí solas no habilitan el botón.
- Vercel `corocumbres` (`prj_tpEKm6bQCNS9eUovHZGoIDBouuhC`) tiene URL y clave pública Supabase en Production/Development y en Preview sólo para `codex/supabase-google-rbac`. No recibió la clave service_role. La vista previa y el despliegue de producción READY usan esas variables.
- La rama `codex/supabase-google-rbac` se publicó mediante el conector GitHub; su árbol coincidió exactamente con el índice local validado al publicarse. Vercel construyó una vista previa conectada. En navegador, las cuatro misas consultan la base y muestran el estado vacío previsto; la nocturna no tiene horario. El endpoint de evangelio respondió 200, fecha/título correctos y `private, no-store`.
- **Producción desplegada y READY**, por autorización expresa del usuario sin esperar al segundo administrador. `https://corocumbres.online/login` abre públicamente y ofrece el botón Google habilitado; no exige acceso a Vercel.
- Google Cloud: proyecto autorizado **Coro Cumbres** (`corocumbres-auth`), sin facturación vinculada. Política de datos aceptada con autorización explícita; cliente Web **Coro Cumbres Web** creado después de la aprobación del usuario. Únicos permisos guardados: `userinfo.email`, `userinfo.profile` y `openid`, sin permisos sensibles/restringidos adicionales. Ambos usuarios de prueba quedaron guardados. Origen JavaScript único `https://corocumbres.online` y callback Google único `https://zxrbyhtzurnlrrdaupyf.supabase.co/auth/v1/callback`. No se modificaron proyectos ajenos.

## Validación comprobada

- 55 pruebas de aplicación: **55 correctas**, incluidas conservación de letras/acordes/referencias, deduplicación, paginación, redirects, origen POST, estado real del proveedor Google y calendario/almacenamiento editorial.
- 83 aserciones PostgreSQL/PGlite: **83 correctas**, incluidas ambos administradores, usuario ajeno, visitante, sesión expirada/revocada, publicar/despublicar, aislamiento, conflictos e integridad. Son fixtures locales de Auth, no sesiones Google reales.
- Fixture transaccional en el PostgreSQL remoto de `zxrbyhtzurnlrrdaupyf`: **29 aserciones correctas**, con `BEGIN`/`ROLLBACK`. Verificó autorización equivalente de los dos administradores, visitante anónimo, Google ajeno, metadata falsificada, sesiones vencidas/revocadas, publicación/despublicación, aislamiento de misas, versiones e integridad. Se utilizaron identidades y claims SQL temporales; no fue un inicio Google real ni una validación de JWT/cookies del navegador. No se invocaron endpoints OAuth ni se enviaron correos.
- Consulta separada posterior al rollback, **2026-11-05 22:47:26.912697 UTC**: cero usuarios, identidades, sesiones, membresías, canciones, repertorios, ítems y esquemas de prueba. En ese momento histórico quedaron cero usuarios/identidades/sesiones Auth totales y **26 canciones, 0 repertorios y 4 misas**. El login real y el borrador descritos abajo son posteriores; estos totales no representan el estado actual. Evidencias privadas con permisos 0600: `live-rls-rollback-final-evidence.json` y `live-rls-final-cleanup.json` en el directorio de respaldo.
- TypeScript, ESLint, build de producción y `git diff --check`: **correctos** en la copia de preparación.
- Archivos candidatos revisados contra las claves reales: **sin coincidencias**. Bundle público revisado sin canciones seed ni clave privilegiada; la cadena `sb_secret_` aparece sólo como validación de rechazo en el SDK/configuración.
- Smoke REST remoto contra Supabase: **correcto**. El visitante consulta las cuatro misas; la biblioteca sin publicar permanece oculta; las escrituras anónimas se rechazan. Durante la prueba real posterior se publicó y despublicó un repertorio temporal; actualmente no hay publicaciones visibles para visitantes.
- Advisors remotos de seguridad y rendimiento después de ambas migraciones: **0 WARN y 0 ERROR**. Los cuatro avisos de políticas permisivas superpuestas quedaron resueltos.
- Prueba real en preview: el primer administrador creó `set-ses44bsl-mw474kwp`, **Verificación de integración — temporal**, misa `ninos`, domingo `2099-01-04`, orden **Busca Primero → Alabanzas**. La recarga conservó datos y orden. Transiciones verificadas: v1 borrador → v2 publicado → v3 borrador.
- REST anónimo durante la publicación: exactamente las 2 canciones relacionadas visibles, otras 24 ocultas y las otras 3 misas sin repertorios. Después de despublicar: cero playlists, ítems y canciones visibles anónimamente. Las **26 canciones permanecen intactas**; queda **1 borrador privado**, conservado intencionalmente para probar el segundo administrador.
- Evidencias privadas sin credenciales: `real-admin-login-check-20261105.json`, `real-ui-draft-persistence.json`, `real-ui-published-anonymous-rest.json`, `real-ui-unpublished-and-logout-sql.json` y `real-ui-unpublished-anonymous-rest.json`, en el directorio de respaldo. La configuración del proveedor y su intercambio real se registran en `google-provider-1793922043976.json` y `google-provider-oauth-real-verification.json`.
- Evangelio original preservado: calendario canónico de 157 domingos 2026–2028, cambio lunes 00:00 America/Cancun y títulos editoriales existentes en Blob privado independiente.

## Para completar la aceptación

1. El usuario debe completar la contraseña solicitada por Google para `martrampomp@gmail.com`; después comprobar su acceso y permisos equivalentes con el borrador privado conservado.
2. Probar una cuenta Google ajena y el mensaje exacto de denegación, expiración real de sesión y persistencia desde un segundo dispositivo. Las pruebas SQL de estos casos ya pasaron, pero no sustituyen estas comprobaciones de navegador.
3. Completar las pruebas de aceptación restantes sobre producción. El despliegue público ya está READY; las pruebas del segundo administrador, Google ajeno y otro dispositivo siguen pendientes.

Google Cloud, sus tres permisos básicos, los dos usuarios de prueba y el proveedor Supabase están configurados. No se deben recrear credenciales ni repetir la configuración como paso pendiente.

El acceso CLI, ambas migraciones, la importación de 26 canciones y los advisors remotos están completados. **No debe repetirse la importación del respaldo como un paso pendiente.** Conservar los informes y los orígenes intactos.

Detalle operativo: `SUPABASE_OPERACION.md`. Contrato SQL y pruebas: `../supabase/README.md`.

## Versión publicada y evidencia posterior

- Última versión publicada: `a849cde7f0d469ceb64acda5bd09f501f6fe9594`, rama `codex/supabase-google-rbac`, árbol `da5311ed24b09b8cad401f7b8fdafd3d31c8a5f1`.
- Preview READY: https://corocumbres-jhk55bl3d-neuro-practice-s-projects.vercel.app (`dpl_E6JyhrzxwV1phktA2c3JE8XxUT5h`, target preview). Sobre esta versión se verificaron OAuth real, administración, persistencia, publicación/despublicación y logout descritos arriba.
- La versión anterior `2d445dd8808285710e890873f64bfd8b80c76c05` y su preview conservan valor histórico. Sus capturas de Google deshabilitado corresponden al estado anterior a la configuración del proveedor y no describen el estado actual.
- Esta actualización documental registra evidencia posterior al commit publicado. El usuario autorizó el redeploy público y producción ya está READY. El commit de esta evidencia será sólo documental; el código ejecutable desplegado sigue siendo `a849cde`. El recibo privado `release-receipt.json` conserva la referencia del despliegue y distingue las pruebas ya completadas de las pendientes.

Producción **READY** para el código probado `a849cde7f0d469ceb64acda5bd09f501f6fe9594`: `dpl_gfTYASYNZMjRfvonvTvxYhZM5PiT`, URL `https://corocumbres-ls0jq86b7-neuro-practice-s-projects.vercel.app`, build de 25.818 segundos. Los alias `corocumbres.online` y `www.corocumbres.online` quedaron asignados sin error. Navegador directo en `/login`: sitio público y Google habilitado. HTTP anónimo con User-Agent iPhone Safari: 200, botón Google presente/habilitado, sin mensaje antiguo de preparación ni protección Vercel. No se observaron errores de runtime en los últimos 10 minutos consultados; la herramienta de drains devolvió 404 y su estado no se considera verificado. Estas comprobaciones no sustituyen OAuth real del segundo administrador, cuenta ajena ni segundo dispositivo.

Smoke HTTP de producción (`scripts/smoke-http.mjs`): **13 de 13 comprobaciones correctas**. Portal público; `/admin`, `/presenter` y `/display` redirigen a login; cuatro POST con origen incorrecto reciben 403; callback inválido permanece interno; seed, entorno y workspace administrativo no se exponen; evangelio responde 200 con `no-store`.

Inicio OAuth en producción comprobado: POST `/auth/signin` con Origin válido devuelve 303 hacia `/auth/v1/authorize` del proyecto Supabase correcto, proveedor Google, callback `https://corocumbres.online/auth/callback?next=%2Fadmin`, PKCE presente y `no-store`. Verifica el inicio del flujo; el intercambio Google completo comprobado anteriormente fue en preview.
