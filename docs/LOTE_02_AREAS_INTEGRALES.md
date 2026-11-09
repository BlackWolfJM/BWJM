# Lote 02 — Diez asistentes nuevos para áreas e integrales

## Implementación

BWJM incorpora ahora un selector **Áreas e integrales (10)** en el asistente de gráficas, con parámetros propios de cada método, esquema tipado `calculusviz`, evaluación matemática en el motor de @mathmd/math, renderizado SVG 2D y superficies Plotly para sólidos de revolución.

| # | Selector | Resultado visible | Cálculo / condición |
|---|---|---|---|
| 01 | Área entre curvas respecto a X | Sombreado con segmentos verticales | Cuadratura de `|f(x)-g(x)|` |
| 02 | Área entre curvas respecto a Y | Sombreado con segmentos horizontales | Cuadratura de `|f(y)-g(y)|` |
| 03 | Área entre curvas por tramos | Intersecciones y subregiones alternadas | Raíces por cambio de signo, Simpson por intervalo |
| 04 | Área paramétrica | Curva, región proyectada, advertencia | `∫ y(t) dx(t)` firmada |
| 05 | Área polar | Sectores y radios internos/externos | `½∫(r_ext²-r_int²)dθ` |
| 06 | Integral doble Tipo I / Tipo II | Región con cortes dy o dx | Integración numérica de `h(x,y)` |
| 07 | Cambio de orden | Ambas descripciones de región y resultados | El usuario introduce ambos órdenes; comparación numérica |
| 08 | Integral doble polar | Malla radial y región | Cuadratura `h(r cosθ,r sinθ)r` |
| 09 | Discos, arandelas y cascarones | Superficie 3D y volumen | Cuadratura de volúmenes y advertencias de solapamiento |
| 10 | Green y circulación | Contorno, orientación, región | Integral de línea frente a rotacional interior |

## Funcionamiento

Cada opción genera un bloque `calculusviz` declarativo, que permanece dentro del archivo `.bwjm`. El usuario puede editar las expresiones y los límites directamente, reabrir el archivo y exportar la gráfica 2D como SVG.

Archivo para pruebas manuales: [10-graficos-areas-integrales.bwjm](../examples/10-graficos-areas-integrales.bwjm).

## Límites científicos

- Son **aproximaciones numéricas**, no antiderivadas ni soluciones simbólicas certificadas.
- En área por tramos se buscan cruces por cambio de signo: las tangencias pueden escapar a la detección.
- El área paramétrica es **firmada**; no identifica automáticamente bucles o áreas geométricas.
- Las áreas polares presuponen radios no negativos, ordenados y una representación sin multiplicidad.
- Para el cambio de orden se introducen los límites de ambos órdenes **manualmente**: comparar valores no constituye prueba de igualdad de regiones.
- Los sólidos 3D se aproximan con mallas de superficie. Los cascarones cuyo intervalo atraviesa el eje vertical pueden solaparse; el motor marca el volumen como no determinado.
- Green necesita una curva cerrada simple y un campo continuamente diferenciable. Se comprueba el cierre y se detectan algunas autointersecciones, pero no se prueban automáticamente todas las hipótesis.
- La exactitud visual y las interacciones en navegador requieren pruebas manuales además del pipeline de CI.

## Verificación automática

- `packages/math/__tests__/calculusViz.test.ts`: 14 casos matemáticos incluyendo los diez modos y varios casos límite.
- `packages/parser/__tests__/parser.test.ts`: decodificación de diez modos y rechazo de configuraciones incompletas.
- `pnpm lint && pnpm typecheck && pnpm test && pnpm build` en GitHub Actions.

## Origen curricular

Las opciones corresponden a áreas y regiones de integración, ecuaciones paramétricas y polares, integrales dobles, cambios de orden, sólidos de revolución e integrales de línea / Green del contenido del curso de Cálculo Vectorial. La organización del asistente es una decisión de diseño de BWJM; no reproduce necesariamente el orden del sílabo.
