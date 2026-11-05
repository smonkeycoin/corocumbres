# CORO CUMBRES V2 — DEPLOYMENT REPORT

Fecha: 4 de noviembre de 2026 (America/Cancun).

**V2 está desplegado y verificado en https://corocumbres.online. La activación operativa está pendiente:** faltan las credenciales OAuth de Google, la allowlist de administradores y publicar las playlists reales. No se declara completado el criterio final de uso durante una misa mientras estas dependencias sigan pendientes.

## 1. Resumen de implementación

Portal público y workspace privado implementados sobre Next.js, con lectura de letras en dos interacciones desde la home cuando existe una playlist publicada. Se reutilizaron el modelo de canciones, el editor y el Presenter. No se introdujo Supabase.

La ubicación real del repositorio es `/Users/smonkeycoin/Desktop/REPO/CORO OS`. Se trabajó en el worktree aislado `/private/tmp/coro-cumbres-v2`, rama `feat/coro-cumbres-v2`, preservando los cambios locales previos del repositorio original. El código y las evidencias están subidos a GitHub.

## 2. Cambios visuales

Referencia disponible: [`CORO V2 SOT.png`](../CORO%20V2%20SOT.png). Se conservaron la identidad y el logotipo, azul marino y crema, fotografía litúrgica real, tarjetas redondeadas e iconos SVG. Desktop utiliza cuadrícula 2 × 2 según la instrucción explícita; móvil muestra cuatro tarjetas verticales y hero compacto. La primera misa aparece sin desplazamiento incluso a 320 × 568.

Se implementaron la pantalla de acceso, sidebar administrativo y vistas amplias de playlist y lectura. Las letras tienen controles de tamaño, canción anterior/siguiente y regreso con contexto de misa. Las capturas siguientes son de la aplicación ejecutándose, no mockups.

## 3. Cambios funcionales

- Cuatro misas exactas: Niños 10:00 AM, Dominical 12:00 PM, Dominical 1:30 PM y Noche Dominical con horario pendiente de confirmación.
- Administración: Inicio, Playlists, Repertorio, Configuración y acceso a Presenter.
- Playlists: crear, asignar, buscar/agregar canciones, eliminar referencias sin borrar canciones, reordenar mediante arrastre o botones, guardar borrador y publicar explícitamente.
- Repertorio: buscador, categorías, alta y editor compatible con letras, secciones, diapositivas, acordes y metadatos existentes.
- Recuperación aditiva desde localStorage y copias JSON. Las claves históricas no se eliminan ni se usan como fuente de verdad publicada.
- Presenter y Display protegidos; sincronización entre ventanas, navegación y blackout verificados.

## 4. Arquitectura de autenticación

NextAuth con proveedor Google, comprobación de correo verificado y allowlist exacta del servidor (`CORO_ADMIN_EMAILS`). Tener una cuenta Google o enviar un rol desde el cliente no concede permisos. La allowlist se vuelve a comprobar al acceder a datos privados; las sesiones JWT están cifradas y tienen duración limitada.

Las páginas administrativas, Presenter y Display verifican la sesión del lado del servidor. Las API privadas protegen tanto lectura como escritura y validan origen, contenido y límites. Los endpoints públicos sólo devuelven snapshots publicados. No se envía la semilla del repertorio en el JavaScript público.

**Producción actual:** sin configuración OAuth completa, login permanece deshabilitado, las rutas privadas redirigen a login y la API administrativa responde 503 sin datos. No se añadió ninguna vía alternativa para saltar la autenticación. GitHub permanece público por instrucción expresa del propietario; la protección solicitada corresponde a la aplicación, no al código e historial públicos.

## 5. Persistencia de playlists

Se aprovisionó y vinculó Vercel Blob **privado** al proyecto existente. El workspace separa repertorio, sets administrables, asignaciones y snapshots públicos. Las escrituras usan comparación ETag, rechazan conflictos con 409 y guardan una versión privada antes de cada cambio.

La publicación proyecta sólo títulos, letras, orden y momentos litúrgicos de las canciones seleccionadas. Los borradores posteriores no modifican lo público hasta publicar de nuevo. La lectura Blob solicita la representación original para obtener un ETag fuerte compatible con escritura condicional.

Se inicializaron y leyeron de vuelta las **26 canciones históricas**, equivalentes al contenido original. Producción contiene 0 sets y 0 misas publicadas: no había playlists compartidas que migrar y los datos exclusivos de navegadores deben recuperarse desde esos dispositivos. El procedimiento no destructivo está en [OPERACION_V2.md](OPERACION_V2.md).

## 6. Pruebas ejecutadas y resultados

| Verificación | Resultado y alcance |
| --- | --- |
| Typecheck, lint, build de producción | PASS en el código desplegado |
| Pruebas automatizadas de backend y datos administrativos | 23 PASS |
| Navegación pública y responsive | 154 comprobaciones PASS, Chromium y WebKit, cinco tamaños: 320 × 568, 390 × 844, 412 × 915, 768 × 1024 y 1440 × 1000 |
| E2E administrativo/público local | 14 escenarios PASS; sesiones firmadas de prueba, sin login OAuth real |
| Persistencia Vercel Blob real | PASS: lecturas independientes, carrera de creación, rechazo de escritura obsoleta, publicación compartida, aislamiento de borradores, acceso privado y respaldos |
| Preservación histórica | PASS: 26 canciones intactas y archivo seed byte por byte idéntico |
| Smoke del dominio de producción | 25 comprobaciones PASS; home, cuatro API públicas, navegación a playlist, cinco rutas privadas, bloqueo de repertorio, móvil y ausencia de errores JavaScript |
| OAuth Google real y administración autorizada en producción | BLOQUEADO por configuración ausente; no se marca PASS |
| Auditoría de dependencias | 0 vulnerabilidades de producción; 8 avisos moderados transitivos sólo de desarrollo |

Los tamaños de dispositivos se verificaron en navegadores automatizados; no son pruebas sobre teléfonos físicos.

| Escenario solicitado | Evidencia ejecutada | Estado en producción |
| --- | --- | --- |
| A: anónimo → Niños → letra → siguiente → playlist | PASS local con playlist publicada de QA; primera letra en 2 interacciones | Pendiente de playlists reales; la vista vacía funciona |
| B: anónimo intenta repertorio | PASS local (401) y producción (503 de configuración, sin datos) | Protegido |
| C: Google sin ADMIN | PASS de autorización con identidad firmada de prueba, incluyendo rol falsificado y correo no verificado | OAuth real pendiente |
| D: admin guarda/publica y otro dispositivo ve cambios | PASS con dos contextos de navegador independientes; persistencia Blob también verificada por solicitudes independientes | Login real y publicación real pendientes |
| E: canciones históricas intactas | PASS local y lectura del workspace privado de producción | 26 conservadas |

Evidencias: [E2E](../qa/admin-browser.json), [responsive](../qa/public-browser.json), [Blob](../qa/blob-integration.json), [preservación](../qa/source-preservation.json), [inicialización](../qa/production-data-initialization.json), [auditoría](../qa/dependency-audit.json), [smoke publicado](../qa/production/smoke.json).

## 7. Commit SHA

Código desplegado: `ebee3398b20f99a121e8a1d93f5800358f0c6f04`.

Mensaje: `feat(coro): implement v2 public portal and admin experience`.

Este reporte y las capturas posteriores al despliegue se registran en un commit documental posterior en la misma rama. No cambian el código desplegado.

## 8. Rama y estado del push

Rama: `feat/coro-cumbres-v2`. Push del código a `origin` completado sin force push. Repositorio: https://github.com/smonkeycoin/corocumbres. No se reescribió el historial ni se fusionaron cambios sobre el directorio original con trabajo pendiente.

## 9. URL de producción

https://corocumbres.online

Deployment inmutable: https://corocumbres-mpaqo0pc5-neuro-practice-s-projects.vercel.app

## 10. Estado real del redeploy

**READY**, deployment `dpl_8ZJcSR4U511sTdQ7qrorUAUdkSKJ`, target `production`, proyecto existente `corocumbres` (`prj_tpEKm6bQCNS9eUovHZGoIDBouuhC`), equipo `team_LG4vLJ75SnXcNtNqKI61bIj9`.

Los aliases `corocumbres.online`, `www.corocumbres.online` y `corocumbres.vercel.app` apuntan a este deployment. Se verificó el dominio canónico con navegador y API tras finalizar el build. No se modificó DNS ni se creó un proyecto nuevo. [Metadatos de despliegue](../qa/production/deployment.json).

## 11. Bloqueos y pendientes

1. Configurar en Vercel las variables privadas `AUTH_GOOGLE_ID` y `AUTH_GOOGLE_SECRET`, obtenidas de un cliente OAuth Google autorizado. Callback: `https://corocumbres.online/api/auth/callback/google`.
2. Definir `CORO_ADMIN_EMAILS` con las identidades administrativas que autorice el propietario. No se asumió ninguna identidad.
3. Redeploy tras configurar estas variables y ejecutar el inicio de sesión real de un administrador y de una cuenta ajena a la allowlist. `AUTH_SECRET`, `NEXTAUTH_URL` y el almacenamiento privado ya están configurados.
4. Desde el navegador donde existan playlists históricas, descargar copia e importar en Configuración; asignarlas a las misas y publicar. Los datos exclusivos de ese navegador no son accesibles desde el servidor.
5. Confirmar el horario nocturno cuando corresponda. Mientras tanto permanece explícitamente pendiente.

## Capturas reales

Producción, tomadas sobre `corocumbres.online`:

- [Home desktop](../qa/production/home-desktop.png)
- [Home mobile](../qa/production/home-mobile.png)
- [Playlist pública actual: aún sin publicación](../qa/production/playlist-publica.png)
- [Acceso administrativo: configuración pendiente](../qa/production/login.png)

Entorno QA local, con datos y sesiones de prueba identificados; no representan un login Google de producción:

- [Playlist pública con canciones](../qa/screenshots/playlist-publica.png)
- [Administración](../qa/screenshots/administracion.png)
- [Repertorio](../qa/screenshots/repertorio.png)
- [Lectura móvil](../qa/screenshots/letra-mobile.png)
- [Presenter](../qa/screenshots/presenter.png)
- [Display](../qa/screenshots/display.png)
