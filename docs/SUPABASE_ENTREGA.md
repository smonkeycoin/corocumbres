# CORO CUMBRES — estado de implementación Supabase

Fecha: 5 de noviembre de 2026, America/Cancun. **Entrega preparada; aceptación end-to-end pendiente.**

## Infraestructura y datos

- Proyecto verificado: `zxrbyhtzurnlrrdaupyf`, `corocumbres@proton.me's Project`, organización `vkuppicfmbsvtlxkltwp`.
- URL: `https://zxrbyhtzurnlrrdaupyf.supabase.co`.
- Auditoría previa: cero tablas públicas/privadas, cero políticas y cero usuarios Auth.
- Migraciones aplicadas correctamente en el proyecto verificado: `20261105170609_coro_cumbres_rbac.sql` y `20261105223755_consolidate_read_policies.sql`. La segunda separa las operaciones de escritura y consolida SELECT sin ampliar permisos; recibió revisión independiente de seguridad.
- Tablas creadas: `public.songs`, `public.masses`, `public.playlists`, `public.playlist_items`, `private.admin_allowlist` y `private.admin_memberships`.
- RLS habilitado en las seis tablas. Anónimos leen misas, playlists publicadas y canciones relacionadas con secciones habilitadas. Las escrituras requieren membresía, identidad Google verificada y sesión vigente; las tablas privadas no tienen acceso de lectura desde la aplicación.
- Cuatro misas aprovisionadas; `noche` tiene horario NULL. Allowlist privada con los dos correos solicitados. No se crearon identidades ni sesiones ficticias permanentes.
- Respaldo de Vercel Blob: **26 canciones, 0 repertorios, 0 publicaciones**. Copia duradera: `/Users/smonkeycoin/Desktop/REPO/CORO_CUMBRES_BACKUPS/supabase-migration-20261105/workspace-before-supabase.json`.
- **Canciones importadas remotamente: 26, verificadas: 26.** Una nueva simulación remota comprobó base vacía y 26 canciones únicas entre semillas y respaldo, sin variantes ni cambios de ID. Antes de aplicar se releyó Blob: coincidía exactamente con el respaldo completo (SHA-256 canónico `f5be1d5591f93c524a6f5db1a742511868f92f4a5a9e93c51b0cf63938e8ea67`). Cada INSERT se releyó y comparó en todos los campos y timestamps. Informe privado: `applied-library-20261105.json` en el directorio de respaldo. No se publicaron repertorios.
- Blob y localStorage permanecen intactos. La importación administrativa explícita conserva variantes y relaciones, sin publicar automáticamente.

## Autenticación y despliegue

- Supabase Auth responde; Google estaba **deshabilitado** en la comprobación real.
- `trinopc1@gmail.com` y `martrampomp@gmail.com` tienen los mismos permisos previstos y aprovisionamiento seguro preparado. Sus inicios de sesión reales siguen pendientes.
- La interfaz usa PKCE, cookies SSR, rutas protegidas, redirects internos y POST con comprobación de origen para iniciar/cerrar sesión. Login y POST consultan la configuración real de Auth antes de ofrecer Google; las claves públicas por sí solas no habilitan el botón.
- Vercel `corocumbres` (`prj_tpEKm6bQCNS9eUovHZGoIDBouuhC`) tiene URL y clave pública Supabase en Production/Development y en Preview sólo para `codex/supabase-google-rbac`. No recibió la clave service_role. La vista previa publicada ya usa esas variables; en Production surtirán efecto al desplegar o promover el candidato.
- La rama `codex/supabase-google-rbac` se publicó mediante el conector GitHub; su árbol coincidió exactamente con el índice local validado al publicarse. Vercel construyó una vista previa conectada. En navegador, las cuatro misas consultan la base y muestran el estado vacío previsto; la nocturna no tiene horario. El endpoint de evangelio respondió 200, fecha/título correctos y `private, no-store`.
- **No se desplegó esta integración en producción.** `https://corocumbres.online` conserva el despliegue previo de V2; su verificación anterior no acredita esta versión.
- Google Cloud: el usuario autorizó expresamente crear `Coro Cumbres`, ID `corocumbres-auth`. El proyecto se creó correctamente y la página Billing confirmó que no tiene cuenta de facturación vinculada. Se inició la configuración de Google Auth con el nombre Coro Cumbres; el usuario autorizó `trinopc1@gmail.com` como soporte y contacto. Nombre, audiencia External/Testing y correo están preparados; falta su autorización específica para aceptar la política de datos de Google y guardar el formulario. No se crearon todavía credenciales OAuth ni se modificaron proyectos ajenos.

## Validación comprobada

- 55 pruebas de aplicación: **55 correctas**, incluidas conservación de letras/acordes/referencias, deduplicación, paginación, redirects, origen POST, estado real del proveedor Google y calendario/almacenamiento editorial.
- 83 aserciones PostgreSQL/PGlite: **83 correctas**, incluidas ambos administradores, usuario ajeno, visitante, sesión expirada/revocada, publicar/despublicar, aislamiento, conflictos e integridad. Son fixtures locales de Auth, no sesiones Google reales.
- Fixture transaccional en el PostgreSQL remoto de `zxrbyhtzurnlrrdaupyf`: **29 aserciones correctas**, con `BEGIN`/`ROLLBACK`. Verificó autorización equivalente de los dos administradores, visitante anónimo, Google ajeno, metadata falsificada, sesiones vencidas/revocadas, publicación/despublicación, aislamiento de misas, versiones e integridad. Se utilizaron identidades y claims SQL temporales; no fue un inicio Google real ni una validación de JWT/cookies del navegador. No se invocaron endpoints OAuth ni se enviaron correos.
- Consulta separada posterior al rollback, **2026-11-05 22:47:26.912697 UTC**: cero usuarios, identidades, sesiones, membresías, canciones, repertorios, ítems y esquemas de prueba. También quedaron cero usuarios/identidades/sesiones Auth totales; los datos persistentes siguen en **26 canciones, 0 repertorios y 4 misas**. Evidencias privadas con permisos 0600: `live-rls-rollback-final-evidence.json` y `live-rls-final-cleanup.json` en el directorio de respaldo.
- TypeScript, ESLint, build de producción y `git diff --check`: **correctos** en la copia de preparación.
- Archivos candidatos revisados contra las claves reales: **sin coincidencias**. Bundle público revisado sin canciones seed ni clave privilegiada; la cadena `sb_secret_` aparece sólo como validación de rechazo en el SDK/configuración.
- Smoke REST remoto contra Supabase: **correcto**. El visitante consulta las cuatro misas; la biblioteca sin publicar permanece oculta; las escrituras anónimas se rechazan. No se publicaron datos de prueba.
- Advisors remotos de seguridad y rendimiento después de ambas migraciones: **0 WARN y 0 ERROR**. Los cuatro avisos de políticas permisivas superpuestas quedaron resueltos.
- La vista previa publicada se comprobó mediante HTTP y navegador. Continúan pendientes los dos administradores reales y otra cuenta Google, el flujo OAuth completo y la prueba entre dispositivos.
- Evangelio original preservado: calendario canónico de 157 domingos 2026–2028, cambio lunes 00:00 America/Cancun y títulos editoriales existentes en Blob privado independiente.

## Para completar la aceptación

1. Completar Google Auth en el proyecto ya creado y autorizado **Coro Cumbres** (`corocumbres-auth`). La aceptación específica de la política de datos de Google continúa pendiente del usuario; después pueden guardarse Branding/Audience y crearse las credenciales OAuth Web. No hace falta crear otro proyecto. Mientras permanezca en External/Testing, añadir las cuentas necesarias como usuarios de prueba.
2. Configurar únicamente `openid`, email y profile. Origen JavaScript: `https://corocumbres.online`. Callback Google exacto: `https://zxrbyhtzurnlrrdaupyf.supabase.co/auth/v1/callback`.
3. Introducir Client ID/Secret directamente en Supabase → Authentication → Sign In / Providers → Google y activarlo. No pegarlos en chat, commits ni variables públicas.
4. Verificar Supabase URL Configuration: Site URL `https://corocumbres.online`; redirects permitidos para `/auth/callback` en producción y en los dominios propios/locales usados para las pruebas.
5. Probar ambos administradores reales, Google ajeno, visitante, callback, logout y expiración; crear/reordenar/publicar/despublicar un repertorio y comprobar otro dispositivo y aislamiento por misa.
6. Con esas comprobaciones aprobadas, promover el commit verificado en el proyecto Vercel correcto y repetir pruebas públicas/privadas sobre producción.

El acceso CLI, ambas migraciones, la importación de 26 canciones y los advisors remotos están completados. **No debe repetirse la importación del respaldo como un paso pendiente.** Conservar los informes y los orígenes intactos.

Detalle operativo: `SUPABASE_OPERACION.md`. Contrato SQL y pruebas: `../supabase/README.md`.

## Versión de referencia y evidencia posterior

- Commit de referencia publicado: `2d445dd8808285710e890873f64bfd8b80c76c05`; implementación principal: `9014e427f66344a1335e6a0254f782a7cf056ca7`. Rama remota publicada correctamente.
- Vista previa de ese commit, READY: https://corocumbres-nnw31kptc-neuro-practice-s-projects.vercel.app (`dpl_4NyK5pZUT519pAdUn9wZX2gXFPJz`, target preview).
- Verificación de esa vista previa: login informa Google deshabilitado y desactiva el botón; inspección escritorio/móvil 390×844; /admin termina en login, API administrativa de evangelio 401, callback inválido permanece en login, API antigua de workspace 404, evangelio público 200 con no-store. La solicitud de comprobación de /.env.local no pudo completarse mediante la herramienta y no se cuenta como validada.
- El árbol remoto de ese commit es `7dbd337763102ad63755bcb9db2e38209f9974df`; se publicó mediante el conector GitHub. Un fetch posterior verificó commit y árbol, y la referencia local de la copia de preparación quedó alineada con `2d445dd`, sin alterar archivos ni índice. El repositorio de trabajo original conserva su historia y sus archivos, sin reset. Esta revisión registra la importación, la segunda migración, los advisors y las comprobaciones remotas posteriores. El SHA y la URL del despliegue correspondiente se registran en la entrega y en el recibo privado de publicación.
- La producción continúa sin promover esta integración. Google OAuth y aceptación con usuarios reales siguen pendientes; las 26 canciones ya fueron importadas y verificadas.
