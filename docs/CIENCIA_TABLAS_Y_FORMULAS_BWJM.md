# BWJM — Tablas científicas y presentación matemática

Esta implementación incorpora un bloque de datos nativo dentro del documento y un exportador verificable.

## Uso

```datatable
id: experimento-oscilador
caption: Oscilación de un sensor
columns: [Tiempo, Posición, Velocidad]
units: [s, m, m/s]
precision: 4
rows:
  - [0, 1, 0]
  - [0.5, 0.87758, -0.47943]
  - [1, 0.54030, -0.84147]
```

Cada tabla permite exportación local a **CSV**, **TSV** y **JSON** o copiar el TSV.
CSV/TSV protegen celdas de texto que comienzan con prefijos de fórmulas de hoja de cálculo. No se requiere red para exportar.

Las cabeceras de gráficas 2D/3D presentan la expresión a través de un conversor a LaTeX + KaTeX cuando el visor tiene la biblioteca cargada. Plotly ya no imprime expresiones matemáticas como texto crudo en el título de la superficie.

### Límites actuales
- Las tablas son datos declarativos, no una hoja de cálculo con fórmulas evaluables.
- No se genera XLSX directamente: CSV/TSV son compatibles con Excel y otras herramientas.
- La exportación HTML del editor sigue siendo un snapshot, no un contenedor de Plotly autónomo.
- Las funciones de animación avanzada requieren validación visual adicional.
