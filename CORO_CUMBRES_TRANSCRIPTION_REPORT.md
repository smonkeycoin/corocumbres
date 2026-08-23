# CORO CUMBRES Transcription Report

Fecha: 2026-08-22

## Auditoria inicial

El proyecto original no contenia aplicacion funcional, `package.json`, framework ni codigo fuente. La estructura inicial era:

- `.DS_Store`
- `LYRICS/` con 9 archivos JPG

No se modifico ni borro ningun asset original.

## Assets encontrados

| Archivo | Tipo | Contiene lyrics | Resultado |
| --- | --- | --- | --- |
| `LYRICS/6f4fc285-60e0-4f82-a639-4dba593ac4aa.JPG` | JPG | Si | Transcrito como "Desde ahora en adelante he comprendido" |
| `LYRICS/93699162-be4a-4cfd-8af5-6ac0ad35ee9b.JPG` | JPG manuscrito | Si | 4 cantos/fragmentos transcritos |
| `LYRICS/3899816e-4f3d-4b3d-8345-49b22ee850ed.JPG` | JPG captura | Si | Transcrito como "Dios no se cansa" |
| `LYRICS/a0fd7bbc-38a0-4857-8185-699154924f0a.JPG` | JPG captura | Si | Transcrito como "Dejame ayudarte" |
| `LYRICS/a0fd7bbc-38a0-4857-8185-699154924f0a 2.JPG` | JPG captura | Si | Duplicado visual del anterior |
| `LYRICS/02e18a61-c0f5-413f-898e-356dae54c461.JPG` | JPG | Si | Transcrito como "Hemos entregado" |
| `LYRICS/428f8d1b-c3f6-4c1a-bc0d-d1ddab913a0e.JPG` | JPG manuscrito | Si | Transcrito como "Piensa en la Virgen Maria" con revision pendiente |
| `LYRICS/2902c6a7-c5b7-41db-8827-a076d6169c2c.JPG` | JPG captura | Si | Transcrito como "Estoy aqui" |
| `LYRICS/3b5bdf8a-1f6e-4534-9370-6c0d7629dcc4.JPG` | JPG manuscrito | Si | Transcrito como "Los dones que presentamos" |

## Canciones identificadas y transcritas

- Desde ahora en adelante he comprendido
- Oh Senor vengo a ti
- Oh Senor te necesito
- Si abunda el mal
- Ensename a confiar
- Dios no se cansa
- Dejame ayudarte
- Hemos entregado
- Piensa en la Virgen Maria
- Estoy aqui
- Los dones que presentamos

## Dudas de transcripcion

- `Dejame ayudarte`: la captura termina con el coro cortado. Se dejo `[REVISAR: captura cortada despues de esta linea]`.
- `Piensa en la Virgen Maria`: manuscrito con varias palabras dudosas. Revisar antes de misa.
- `93699162...JPG`: pagina manuscrita con varios cantos y acordes; se omitieron acordes y se transcribio la letra legible.

## Duplicados posibles

- `a0fd7bbc-38a0-4857-8185-699154924f0a.JPG`
- `a0fd7bbc-38a0-4857-8185-699154924f0a 2.JPG`

Ambos parecen la misma captura.

## Datos runtime

La base inicial editable esta en `src/lib/seed-songs.ts`. Los assets originales siguen en `LYRICS/` y no son la base runtime.

## Tags liturgicos iniciales

No se asignaron momentos liturgicos por inferencia libre. Solo se agrego `offertory` a canciones cuya fuente/categoria identifica claramente Ofertorio:

- Hemos entregado
- Los dones que presentamos

## Acordes transcritos inicialmente

Se agregaron acordes estructurados cuando la fuente visual los mostraba claramente:

- Dios no se cansa: acordes desde `LYRICS/3899816e-4f3d-4b3d-8345-49b22ee850ed.JPG`.
- Hemos entregado: acordes desde `LYRICS/02e18a61-c0f5-413f-898e-356dae54c461.JPG`.

Algunos manuscritos contienen acordes adicionales, pero requieren una segunda revisión humana antes de cargarlos como definitivos.
