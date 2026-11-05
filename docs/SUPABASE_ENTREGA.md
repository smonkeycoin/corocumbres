# CORO CUMBRES — estado de implementación Supabase

Fecha: 5 de noviembre de 2026, America/Cancun. **Entrega preparada; aceptación end-to-end pendiente.**

## Infraestructura y datos

- Proyecto verificado: `zxrbyhtzurnlrrdaupyf`, `corocumbres@proton.me's Project`, organización `vkuppicfmbsvtlxkltwp`.
- URL: `https://zxrbyhtzurnlrrdaupyf.supabase.co`.
- Auditoría previa: cero tablas públicas/privadas, cero políticas y cero usuarios Auth.
- Migración aplicada correctamente por CLI: `20261105170609_coro_cumbres_rbac.sql`.
- Tablas creadas: `public.songs`, `public.masses`, `public.playlists`, `public.playlist_items`, `private.admin_allowlist` y `private.admin_memberships`.
- RLS habilitado en las seis tablas. Anónimos leen misas, playlists publicadas y canciones relacionadas con secciones habilitadas. Las escrituras requieren membresía, identidad Google verificada y sesión vigente; las tablas privadas no tienen acceso de lectura desde la aplicación.
- Cuatro misas aprovisionadas; `noche` tiene horario NULL. Allowlist privada con los dos correos solicitados. No se crearon identidades ni sesiones ficticias.
- Respaldo de Vercel Blob: **26 canciones, 0 repertorios, 0 publicaciones**. Copia duradera: `/Users/smonkeycoin/Desktop/REPO/CORO_CUMBRES_BACKUPS/supabase-migration-20261105/workspace-before-supabase.json`.
- **Canciones importadas remotamente: 0 en esta ejecución.** La simulación comprobó 26 entradas únicas locales, pero la lectura REST del entorno restringido falló con `ENOTFOUND` antes de escribir. Falta ejecutar la simulación remota, la inserción y la comparación de todos los campos.
- Blob y localStorage permanecen intactos. La importación administrativa explícita conserva variantes y relaciones, sin publicar automáticamente.

## Autenticación y despliegue

- Supabase Auth responde; Google estaba **deshabilitado** en la comprobación real.
- `trinopc1@gmail.com` y `martrampomp@gmail.com` tienen los mismos permisos previstos y aprovisionamiento seguro preparado. Sus inicios de sesión reales siguen pendientes.
- La interfaz usa PKCE, cookies SSR, rutas protegidas, redirects internos y POST con comprobación de origen para iniciar/cerrar sesión. Login y POST consultan la configuración real de Auth antes de ofrecer Google; las claves públicas por sí solas no habilitan el botón.
- Vercel `corocumbres` (`prj_tpEKm6bQCNS9eUovHZGoIDBouuhC`) tiene URL y clave pública Supabase en Production/Development y en Preview sólo para `codex/supabase-google-rbac`. No recibió la clave service_role. Las variables nuevas sólo se usarán en un despliegue nuevo.
- La rama `codex/supabase-google-rbac` se publicó mediante el conector GitHub; su árbol coincide exactamente con el índice local validado. Vercel construyó una vista previa conectada. En navegador, las cuatro misas consultan la base y muestran el estado vacío previsto; la nocturna no tiene horario. El endpoint de evangelio respondió 200, fecha/título correctos y `private, no-store`.
- **No se desplegó esta integración en producción.** `https://corocumbres.online` conserva el despliegue previo de V2; su verificación anterior no acredita esta versión.
- Google Cloud se abrió con `trinopc1@gmail.com`; no se encontró un proyecto Coro. Se preparó el formulario `Coro Cumbres`, ID `corocumbres-auth`, sin facturación. Su creación requiere autorización específica tras rechazo de la revisión automática. No se modificaron proyectos ajenos.

## Validación comprobada

- 55 pruebas de aplicación: **55 correctas**, incluidas conservación de letras/acordes/referencias, deduplicación, paginación, redirects, origen POST, estado real del proveedor Google y calendario/almacenamiento editorial.
- 83 aserciones PostgreSQL/PGlite: **83 correctas**, incluidas ambos administradores, usuario ajeno, visitante, sesión expirada/revocada, publicar/despublicar, aislamiento, conflictos e integridad. Son fixtures locales de Auth, no sesiones Google reales.
- TypeScript, ESLint, build de producción y `git diff --check`: **correctos** en la copia de preparación.
- Archivos candidatos revisados contra las claves reales: **sin coincidencias**. Bundle público revisado sin canciones seed ni clave privilegiada; la cadena `sb_secret_` aparece sólo como validación de rechazo en el SDK/configuración.
- Pruebas HTTP anónimas previas y revisión visual local se hicieron durante el desarrollo. Falta repetirlas contra el candidato final conectado, junto con los dos administradores reales y otra cuenta Google.
- Evangelio original preservado: calendario canónico de 157 domingos 2026–2028, cambio lunes 00:00 America/Cancun y títulos editoriales existentes en Blob privado independiente.

## Para completar la aceptación

1. Crear/seleccionar el proyecto Google autorizado y configurar Branding, Audience y cliente OAuth de tipo Web. Usar únicamente `openid`, email y profile. Mientras la app esté en Testing, añadir las cuentas necesarias como usuarios de prueba.
2. Origen JavaScript: `https://corocumbres.online`. Callback Google exacto: `https://zxrbyhtzurnlrrdaupyf.supabase.co/auth/v1/callback`.
3. Introducir Client ID/Secret directamente en Supabase → Authentication → Sign In / Providers → Google y activarlo. No pegarlos en chat, commits ni variables públicas.
4. Supabase URL Configuration: Site URL `https://corocumbres.online`; redirect permitido `https://corocumbres.online/auth/callback`, más el callback localhost utilizado para las pruebas.
5. Resolver el acceso de red/CLI. Usar explícitamente el perfil de Coro; TRAVELFLY sigue siendo el perfil predeterminado según el usuario. La revisión automática falló por límite de uso al consultar ayuda del CLI; no se evitó esa revisión.
6. Repetir auditoría y advisors remotos; ejecutar el importador en dry-run y luego `--apply`, conservar informes privados y verificar las 26 canciones. No borrar los orígenes.
7. Probar ambos administradores, Google ajeno, visitante, logout y expiración; crear/reordenar/publicar/despublicar un repertorio y comprobar otro dispositivo y aislamiento por misa.
8. Con esas comprobaciones aprobadas, desplegar el commit verificado en el proyecto Vercel correcto y repetir pruebas públicas/privadas sobre producción.

Detalle operativo: `SUPABASE_OPERACION.md`. Contrato SQL y pruebas: `../supabase/README.md`.
