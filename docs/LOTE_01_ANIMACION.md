# Lote 01 de 10: motor de animación científica

**Rama:** `feat/scientific-tables-equations-3d-20261108` · **PR:** https://github.com/BlackWolfJM/BWJM/pull/1

Este lote incorpora diez capacidades de alcance definido para las escenas existentes. Las etiquetas de la hoja de ruta `SCI-001`–`SCI-010` se conservan y se distinguen los elementos parciales.

| Identificador | Entrega | Estado y alcance |
|---|---|---|
| SCI-001 | Reloj global | Integrado: sincroniza las variables declaradas en varios bloques `timeline` mediante progreso común. |
| SCI-002 | Reproducir y pausar | Integrado: un único ciclo `requestAnimationFrame`, con limpieza al detenerse y reproducción temporal reproducible. |
| SCI-003 | Velocidad configurable | Integrado: control de 0.1× a 8× sobre tiempo transcurrido real. |
| SCI-004 | Fotograma anterior y siguiente | Integrado: dos botones con desplazamiento normalizado de 1/120 del dominio y opción de reproducción inversa. |
| SCI-005 | Bucle delimitado | Integrado: marcar inicio y fin, repetir y escala temporal visible. |
| SCI-006 | Estela configurable | Integrado en `parametric2d`: `trailLength` en el archivo y control de longitud en la vista. |
| SCI-007 | Cámara de seguimiento | **Parcial:** ventana centrada en la partícula **solo en 2D**, sin suavizado ni cámara 3D. |
| SCI-008 | Registro de fotogramas | **Parcial:** exportación de 121 instantes y variables en JSON. No exporta imágenes ni GIF/video. |
| SCI-009 | Capas visibles/ocultas | **Parcial:** alternar estela, velocidad, aceleración, tangente y normal únicamente en `parametric2d`. |
| SCI-010 | Marcadores temporales | Integrado: `markers` dentro del bloque `timeline`, anotaciones añadidas en el editor y navegación al instante marcado. |

## Ejemplo de prueba

Abre [`examples/lote-01-animacion.bwjm`](../examples/lote-01-animacion.bwjm) en BWJM Studio.

## Verificación

- `apps/playground/__tests__/timelineEngine.test.ts` cubre avance temporal, dirección inversa, segmentación, sincronización, fotogramas reproducibles y almacenamiento de anotaciones.
- `packages/parser/__tests__/parser.test.ts` comprueba los nuevos parámetros y la validez de marcadores dentro del dominio.
- El pipeline ejecuta lint, typecheck, pruebas y build.
- No hay aún prueba visual automatizada para la cámara de seguimiento, las capas y el comportamiento del navegador.

## Pendiente dentro de estos identificadores

- SCI-007: interpolación/suavizado de cámara y soporte 3D.
- SCI-008: grabación gráfica real en SVG secuencial, GIF o video.
- SCI-009: capas agrupadas universales para escenas 2D y 3D.

Las otras 190 propuestas siguen en el catálogo; no se consideran implementadas por estar documentadas.
