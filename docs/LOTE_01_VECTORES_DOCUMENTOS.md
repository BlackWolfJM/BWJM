# Lote 01 — Laboratorio vectorial dentro de documentos `.bwjm`

**Especificaciones consultadas:** `Guia_Maestra_Calculo_Vectorial_Temas_y_Subtemas.md`,
`BWJM_Mapa_Maestro_1024_Funcionalidades_Calculo_Vectorial.md`,
`BWJM_Backlog_1024_Funcionalidades.json` y
`BWJM_Backlog_419_Subtemas.csv`. Los diez IDs son **01.01–01.10**.
La guía contiene 419 subtemas; el backlog agrupa 1024 *oportunidades*, no
1024 componentes independientes.

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
- No se modifica ni se recrea el menú único de personalización de las
  gráficas preexistentes; ese paso queda pendiente para las opciones
  específicas del laboratorio vectorial.

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
  desplegables junto a la gráfica, actualizado con el slider.
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
| 01.08 | Escalamiento | k·u y norma | Resultado sobre el vector | Slider k | Ejemplo | Unitarias | Implementada parcialmente |
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
Confirmar ejecución de `pnpm test`, `pnpm typecheck` y `pnpm build`
mediante CI antes de declarar funcionalidades «Implementada y verificada».
No se debe asumir que tener un test escrito implica que haya pasado.

## Trabajo pendiente del lote

1. Pruebas E2E del lector y apertura/exportación/reapertura de documentos.
2. Arrastre de vectores y puntos en 2D/3D con comprobación matemática.
3. Personalización opcional y adaptativa desde el menú único existente.
4. Actividades de clasificación con retroalimentación, editores y tablas.
5. Pasos simbólicos rigurosos y verificadores formales donde sean posibles.

Todos los módulos se incorporan al repositorio web original; no se fusiona
automáticamente la rama de trabajo a `main`.
