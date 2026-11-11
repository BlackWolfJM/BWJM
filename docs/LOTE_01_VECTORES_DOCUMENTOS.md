# Lote 01 — Laboratorio vectorial dentro de documentos `.bwjm`

Este documento describe los modos de estudio vectorial disponibles en BWJM Studio y el ejemplo para probarlos.

## Auditoría previa

- `packages/ast` ya contenía `vector2d` y `vector3d`, pero sin reglas
  para operaciones/explicaciones de las primeras actividades.
- `packages/parser` validaba sus componentes y el motor `packages/core`
  calculaba sus extremos, pero faltaban construcciones educativas.
- `packages/renderer-svg` admitía una flecha 2D aislada;
  `packages/renderer-plotly` admitía `vectorarrow` pero no el nodo
  `vector3d` directamente.
- El lector de `apps/playground` no montaba una vista de los nodos
  `vector2d`/`vector3d`. No se trasladan las funciones a una calculadora
  diferente; se ha conectado el lector actual.
- Se reutiliza el menú único **Personalizar gráfica** para activar/desactivar
  el procedimiento de los estudios vectoriales. No se crea un segundo menú.

## Incremento implementado

Se amplían los bloques **existentes** `vector2d` y `vector3d` con
campos opcionales `mode`, `other`, `third`, `factor`,
`secondFactor` y `showSteps`. Los modos admitidos son:

`classify`, `coordinates`, `translate`, `components`,
`displacement`, `compare`, `sum`, `difference`, `scale`,
`properties` y `combination`.

- **Math:** motor numérico independiente `computeVectorStudy`,
  comprobación de entradas y casos de norma cero/colinealidad.
- **Parser + AST:** validación declarativa; factores pueden ser números o
  nombres de variables declaradas mediante `slider`.
- **Core:** extracción de dependencias de factores, invalidación de caché
  y recálculo reactivo del estudio tras modificar `slider`.
- **SVG:** flechas con cabeza-cola, paralelogramo, componentes y resultante
  en la **misma** escena 2D.
- **Plotly:** flechas y orientación 3D en la misma cámara rotatoria.
- **Lector:** panel de explicación, resultado, verificación y pasos
  desplegables junto a la gráfica, actualizado con el slider. El interruptor
  `showSteps` se guarda desde **Personalizar gráfica** en el código .bwjm.
- **Ejemplo:** `examples/lote-01-vectores-interactivos.bwjm`.
  Mantiene un caso tradicional sin `mode` como prueba de compatibilidad.

## Matriz de cobertura

| ID | Subtema | Motor matemático | Visualización | Interacción | Documentación .bwjm | Pruebas | Estado |
|---|---|---|---|---|---|---|---|
| 01.01 | Escalares/vectoriales | Distinción numérica y norma | Vector 2D | Editor | Ejemplo | Unitarias | Implementada parcialmente |
| 01.02 | Coordenadas | Cuadrante y signos del octante | Punto/vector 2D/3D | Cámara 3D | Ejemplo | Unitarias | Implementada parcialmente |
| 01.03 | Puntos/vectores | Invarianza por traslación | Flechas libre y ligada | Cámara 3D | Ejemplo | Unitarias | Implementada parcialmente |
| 01.04 | Componentes | Descomposición por ejes | Flechas 2D/3D | Cámara 3D | Ejemplo | Unitarias | Implementada parcialmente |
| 01.05 | Desplazamiento | B-A y distancia | Vectores A, B y desplazamiento | Editor | Ejemplo | Unitarias | Implementada parcialmente |
| 01.06 | Igualdad | Comparación de componentes | Superposición de dos flechas | Editor | Ejemplo | Unitarias | Implementada parcialmente |
| 01.07 | Suma/resta | Operación por componentes | Cabeza-cola y paralelogramo | Editor | Ejemplo | Unitarias | Implementada parcialmente |
| 01.08 | Escalamiento | k·u, norma y tratamiento del vector nulo | Resultado sobre el vector | Slider k y comparación de signo en el procedimiento existente | Ejemplo | Unitarias y lección completa | Incremento implementado |
| 01.09 | Propiedades | Identidades en datos numéricos | Flechas u, v, suma | Slider k | Ejemplo | Unitarias | Implementada parcialmente |
| 01.10 | Combinación/colinealidad | ku+mv y producto cruz/determinante | Flechas 2D/3D | Sliders k y m | Ejemplo | Unitarias | Implementada parcialmente |

**Restricciones expresas:** no hay arrastre directo de puntos ni editor independiente
de componentes; no existe clasificador arrastrable, comprobador simbólico general
ni animación cabeza-cola paso a paso. Los cálculos son **numéricos**, la
colinealidad utiliza tolerancia proporcional y las pruebas de propiedades con
valores concretos no equivalen a demostraciones. Los valores 3D no se proyectan
falsamente como si fueran 2D: usan Plotly.

## Verificación

Los archivos `packages/math/__tests__/vectorStudy.test.ts`,
`packages/parser/__tests__/vectorStudy.test.ts` y
`packages/core/__tests__/vectorStudy.test.ts` cubren invariantes básicos,
errores de esquema, entradas degeneradas, reactividad y compatibilidad.
GitHub Actions comprueba estas pruebas junto con el tipado y la compilación.

## Incremento de 01.08

El motor compara `k = -1`, `k = 0` y `k = 1` con el vector de la lección.
Cada paso muestra el producto, su norma y su efecto en el sentido. Un vector
nulo carece de dirección y sentido para cualquier factor. Se conservan
el slider de la lección y el interruptor **Ver procedimiento** del menú
existente. El cambio se concentra en el motor y la lección de ejemplo,
con pruebas para un vector 3D y para el caso nulo.

Para la ampliación de los subtemas avanzados, consulta
[la guía 41.08](GUIA_INTEGRACION_41_08.md).
