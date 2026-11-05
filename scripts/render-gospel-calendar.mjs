import { readFile, writeFile } from 'node:fs/promises';
const rows = JSON.parse(await readFile(new URL('../src/data/evangelios-dominicales.json', import.meta.url), 'utf8'));
const preamble = `# Evangelios dominicales — CORO CUMBRES V2

Fuente de verdad: [JSON versionado](../src/data/evangelios-dominicales.json). Revisión documental: **5 de noviembre de 2026**. Cobertura del calendario romano con propio de México: todos los domingos civiles de 2026–2028. Los títulos son redacción pastoral editorial; no se reproduce el texto bíblico.

| Año civil | Domingos | Ciclos y años litúrgicos |
| --- | ---: | --- |
| 2026 | 52 | 47 A / 2026; 5 B / 2027 desde el 29 de noviembre |
| 2027 | 52 | 47 B / 2027; 5 C / 2028 desde el 28 de noviembre |
| 2028 | 53 | 48 C / 2028; 5 A / 2029 desde el 3 de diciembre |

## Fuentes y criterio de verificación

- USCCB: calendarios [2026](https://www.usccb.org/resources/2026cal.pdf), [2027](https://www.usccb.org/resources/2027cal.pdf) y [2028](https://www.usccb.org/resources/2028cal.pdf). Cada registro enlaza la página del PDF que verifica su referencia. Las particularidades estadounidenses no se trasladan automáticamente a México.
- Calendario mexicano de GCatholic: [2026](https://gcatholic.org/calendar/2026/MX-es.htm), [2027](https://gcatholic.org/calendar/2027/MX-es), [2028](https://gcatholic.org/calendar/2028/MX-es). Contraste de fechas, precedencias y celebraciones nacionales; las fuentes primarias prevalecen ante contradicciones.
- CEM, [normas complementarias, canon 1246, p. 17](https://cem.org.mx/wp-content/uploads/2022/04/Normas-CEM-a-luz-del-Nuevo-CDC-2.docx.pdf#page=17): Epifanía entre el 2 y el 8 de enero; Ascensión en VII Domingo de Pascua; Corpus Christi permanece en jueves.
- Arquidiócesis de México, [Desde la Fe: calendario 2026](https://desdelafe.mx/noticias/sabias-que/calendario-liturgico-2026-descargalo-gratis/). Corrobora el jueves de Corpus del 4 de junio.
- Domingos posteriores a Corpus en México: 7 junio 2026, X Ordinario, Mt 9, 9-13 ([FAMVIN](https://famvin.org/es/2026/06/07/evangelio-y-vida-para-el-7-de-junio-de-2026/)); 30 mayo 2027, IX Ordinario, Mc 2, 23–3, 6 ([CEE](https://www.conferenciaepiscopal.es/evangelio/domingo-ix-del-tiempo-ordinario-2/) y [Diócesis de Irapuato](https://diocesisdeirapuato.org/wp-content/uploads/2020/10/Ciclo-B.pdf)); 18 junio 2028, XI Ordinario, Lc 7, 36–8, 3 ([USCCB leccionario 93](https://bible.usccb.org/bible/readings/061216.cfm), la fecha 2016 verifica el mismo leccionario, no el calendario 2028).

Se elige la forma larga cuando existe forma breve. Ramos registra la Pasión en la misa, no el evangelio procesional. Pascua registra Jn 20, 1-9 de la misa del día; Pentecostés, Jn 20, 19-23 de la misa del día. No se sustituyen por vigilias. Cuaresma B/C conserva el ciclo correspondiente; los escrutinios pueden autorizar A. El calendario no pretende anticipar elecciones del celebrante, fiestas patronales, dedicaciones o dispensas diocesanas no documentadas.

### Excepciones y revisión futura

Todos los Santos sustituye al domingo ordinario el 1 noviembre 2026; Asunción, el 15 agosto 2027; Transfiguración, el 6 agosto 2028. San José 2028 se traslada al lunes por coincidir con Cuaresma. El 24 diciembre 2028 corresponde a IV Adviento durante la misa dominical; la celebración nocturna de Navidad es distinta.

**12 diciembre 2027:** se conserva III Adviento (Lc 3, 10-18), conforme al calendario mexicano consultado. La CEM recibió facultad para dispensar la precedencia en años de coincidencia; el [decreto publicado de 2021, pp. 33–34](https://cem.org.mx/wp-content/uploads/2023/12/CEM_X_2028-2021_Web.pdf#page=33) exige decreto para el año correspondiente y autoriza expresamente 2021. No se encontró decreto para 2027. Revisar una eventual disposición oficial de 2027 y actualizar fecha/celebración/referencia con su fuente si se autoriza Guadalupe. Esta es una revisión normativa excepcional, no una actualización semanal. Tampoco se presupone un traslado diocesano de Corpus en Cancún sin una fuente local.

## Regla de publicación y arquitectura

La zona obligatoria es **America/Cancun**, independientemente de la zona del dispositivo o del servidor. Se toma el siguiente domingo, incluido el día actual si es domingo. A las 00:00 del lunes cambia al domingo siguiente. No hay fórmula de 52 semanas ni cron.

La home usa SSR dinámico; serializa el día de Cancún y el título inicial, y la primera hidratación utiliza esos mismos valores. El cliente consulta el reloj IANA, programa el límite de medianoche, comprueba ajustes del reloj cada minuto y actualiza al volver a una pestaña suspendida. El JSON permite cambiar de domingo incluso sin red. Una fecha fuera de cobertura muestra «Nos preparamos para escuchar la Palabra.»; nunca reutiliza el evangelio de otro año.

La integración actual usa Supabase Auth/Google para administración y conserva Vercel Blob privado exclusivamente para los títulos editoriales existentes. Canciones y playlists se almacenan en Supabase; el calendario permanece independiente. El JSON es la fuente litúrgica inmutable. Las ediciones de título viven en objetos separados de Blob bajo \`coro-v2/gospel-titles/YYYY-MM-DD.json\`, sin tocar canciones, playlists ni el workspace existente. La API pública devuelve solo fecha y título. Una caída del almacenamiento editorial conserva el título del JSON y limita la espera pública a dos segundos.

El editor aparece en **Administración → Configuración**. Solo permite editar el título corto (1–100 caracteres), mediante sesión Supabase/Google verificada y membresía comprobada por is_admin en PostgreSQL. La API valida autorización, origen, JSON estricto y ETag; rechaza fecha inexistente, cambios de ciclo/referencia y escrituras obsoletas. La fecha selecciona el registro, no lo modifica. El identificador de usuario de auditoría permanece privado (los registros previos pueden conservar su correo histórico). Sin OAuth configurado, la administración continúa bloqueada como antes; la lectura pública y el cambio semanal funcionan igualmente.

## Mantenimiento y pruebas

Para incorporar otro año o una disposición oficial: verificar fuentes nacionales y leccionario, editar el JSON, ejecutar \`node scripts/render-gospel-calendar.mjs\`, \`npm test\`, \`npm run typecheck\`, \`npm run lint\` y \`npm run build\`. La verificación de navegador debe ejecutarse sobre la integración Supabase actual; los informes NextAuth anteriores son evidencia histórica y no sustituyen esa comprobación. El generador solo representa los datos verificados: no inventa asignaciones litúrgicas.

## Calendario completo
`;
let output = preamble;
for (const year of [2026, 2027, 2028]) {
  output += `\n### ${year}\n\n| Fecha | Año litúrgico / ciclo | Celebración | Evangelio | Título editorial | Verificación |\n| --- | --- | --- | --- | --- | --- |\n`;
  for (const row of rows.filter(r => r.sunday_date.startsWith(String(year)))) {
    output += `| ${row.sunday_date} | ${row.liturgical_year} / ${row.cycle} | ${row.celebration} | ${row.gospel_reference} | ${row.short_title} | [Fuente](${row.source_url})${(row.verification_urls || []).map((u,i) => ` · [Contraste ${i+1}](${u})`).join('')} |\n`;
  }
}
await writeFile(new URL('../docs/EVANGELIOS_DOMINICALES.md', import.meta.url), output);
console.log(`Documentados ${rows.length} domingos.`);
