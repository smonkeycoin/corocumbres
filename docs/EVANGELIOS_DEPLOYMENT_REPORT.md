# Evangelio dominical dinámico — entrega y producción

Verificado el **5 de noviembre de 2026, 12:15, America/Cancun**.

La función pública está desplegada y operativa en [corocumbres.online](https://corocumbres.online). Muestra **8 NOV 2026 — Las diez vírgenes y sus lámparas** debajo de «Música que nos une en la fe.». La asignación corresponde a Mt 25, 1-13, XXXII Domingo Ordinario, ciclo A. La referencia y el texto bíblico no aparecen en la interfaz pública.

## Calendario y fuentes

**157 domingos: 52 en 2026, 52 en 2027 y 53 en 2028.** El cambio de ciclo ocurre en el primer domingo de Adviento, no en enero. Todos los registros contienen fecha, año litúrgico, ciclo, celebración, referencia, título y fuentes.

El [calendario documentado](EVANGELIOS_DOMINICALES.md) y el [JSON canónico](../src/data/evangelios-dominicales.json) contienen las fuentes por fecha. Se contrastaron los tres calendarios USCCB con GCatholic México y normas primarias CEM; se consultaron también Desde la Fe, CEE, Diócesis de Irapuato y FAMVIN para particularidades mexicanas. Corpus Christi permanece en jueves conforme al calendario nacional.

**Revisión excepcional futura:** el 12 diciembre 2027 conserva III Adviento según las fuentes disponibles. No se presume una dispensa guadalupana futura: revisar el decreto CEM correspondiente cuando se publique. No se requiere ninguna intervención semanal.

## Arquitectura y preservación

Se auditó la ruta solicitada `/Users/smonkeycoin/Desktop/REPO/CORO OS`: contiene V0.1/main con trabajo previo sin commit. Producción utiliza V2 en `feat/coro-cumbres-v2`. La implementación se realizó sobre esa rama en una copia aislada del mismo repositorio, `/private/tmp/coro-evangelios-v2`, preservando la copia de trabajo original.

Se reutilizan NextAuth/Google y Vercel Blob privado. No se añadió Supabase ni una base de datos. El calendario vive en JSON; los títulos personalizados se guardan en objetos separados con control ETag. La API pública devuelve solo fecha/título. La API administrativa acepta únicamente fecha de selección, título y ETag, tras verificar sesión Google autorizada, origen y formato.

El reloj IANA `America/Cancun` determina el próximo domingo inclusive. SSR dinámico e hidratación comparten la fecha inicial; el navegador actualiza en medianoche, al recuperar foco y al reanudar la pestaña. También puede seleccionar el nuevo registro sin red. Sin registro se muestra una frase neutral; ante fallos editoriales se conserva el título canónico.

Se comprobó igualdad byte por byte con la versión base de `seed-songs.ts`, `server/workspace.ts`, `server/auth.ts` y `masses.ts`. No se modificaron canciones, playlists, almacenamiento existente, navegación, tarjetas de misas ni configuración de acceso. Los estilos añadidos se limitan al bloque editorial y al editor.

## Verificación ejecutada

| Comprobación | Resultado |
| --- | --- |
| TypeScript, ESLint, diff sin errores, build de producción | PASS |
| Suite automatizada completa | **53/53 PASS** |
| E2E local con navegador y almacenamiento aislado | **17/17 PASS** |
| Smoke sobre dominio de producción | **8/8 PASS** |
| Auditoría de dependencias de producción | **0 vulnerabilidades** |
| Validación de calendario | 157 fechas únicas, todos los domingos, sin huecos; selección verificada para los 1,096 días civiles |
| SSR/hidratación y navegador | Sin errores observados |
| Diseño responsive | 320, 390, 768 y 1440 px, cuatro tarjetas conservadas, sin desbordamiento horizontal |

Las pruebas incluyen los días 5, 8, 9, 15 y 16 de noviembre de 2026; cambio A→B del 29 noviembre; los otros cambios de Adviento; año civil; Ramos, Pascua y Pentecostés de los tres años; 53 domingos de 2028; fallback fuera de cobertura; usuarios anónimos y Google sin permisos; edición con fecha/referencia/ciclo inmutables; conflicto ETag; CSRF; fallos de almacenamiento y límite público de dos segundos.

Se verificó el cambio de una página abierta desde 8 noviembre a 15 noviembre a las 05:00 UTC del lunes (00:00 Cancún), con una sola carga del documento, también sobre el código de producción y un dispositivo configurado en Asia/Tokyo. El reloj del navegador fue simulado; no se cambió el reloj del servidor ni ningún dato de producción.

La administración local se comprobó con sesiones NextAuth firmadas de prueba y atributos Google controlados. **No equivale a un inicio OAuth real ni a una escritura editorial real en Blob de producción.**

Evidencias: [E2E local](../qa/gospel/browser.json), [smoke de producción](../qa/gospel/production/report.json), [desktop publicado](../qa/gospel/production/desktop.png), [móvil publicado](../qa/gospel/production/mobile.png). Scripts reproducibles: [local](../tests/gospel-browser.mjs), [producción](../tests/gospel-production.mjs).

## Despliegue

- **Producción:** https://corocumbres.online
- **Deployment inmutable:** https://corocumbres-4tw66gafc-neuro-practice-s-projects.vercel.app
- **Estado:** READY, target production, Next.js 16.4.5.
- **Commit de código:** `6f8f758fc5c37aafb02da2cdb8b71892638c92db`.
- **Rama:** `feat/coro-cumbres-v2`, push completado sin force push.
- **Deployment:** `dpl_DxbNKkPuRXCoAgxY7drenqrgJ3N7`.
- **Proyecto/equipo existentes:** `prj_tpEKm6bQCNS9eUovHZGoIDBouuhC` / `team_LG4vLJ75SnXcNtNqKI61bIj9`.
- **Build remoto:** 17 segundos según logs; READY y aliases confirmados por API Vercel.
- **Logs posteriores:** sin registros error/fatal para este deployment en la ventana consultada de 17:05–17:15 UTC. La consulta de drains devolvió 404; no se afirma tener un sistema externo de monitorización configurado.

Este reporte, el script de smoke y las capturas posteriores se conservan en un commit documental posterior; no cambian el código desplegado.

## Único bloqueo operativo administrativo

La configuración de producción conserva el bloqueo previo: faltan `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` y `CORO_ADMIN_EMAILS`. Se verificaron solo nombres de variables, sin descifrar secretos. El botón Google permanece deshabilitado y las API administrativas rechazan acceso con 503, sin revelar datos. No se inventaron credenciales ni una cuenta administradora.

El editor está implementado en **Administración → Configuración → Evangelio dominical** y estará disponible al completar la configuración Google/allowlist existente. Este bloqueo no afecta la lectura pública, el título correcto ni el cambio automático semanal. No se necesitaron migraciones ni modificaciones de datos de producción para activar la función pública.
