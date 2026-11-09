# BWJM — Catálogo de 200 funcionalidades gráficas, interactivas y animadas para Cálculo Vectorial

> **Tipo:** especificación funcional e ideas de implementación, no catálogo de funcionalidades ya terminadas.
> **Repositorio auditado:** [BlackWolfJM/BWJM](https://github.com/BlackWolfJM/BWJM); rama `main`; commit [`0180b960`](https://github.com/BlackWolfJM/BWJM/commit/0180b9600205f71df78cae6562d6c5c555967cb2), consultado el **8 de noviembre de 2026**.
> **Base curricular:** sílabo oficial «Cálculo Vectorial para Ingeniería, 2026–2» aportado al proyecto (Unidades 1–4; programación de actividades, semanas 1–17). Se aprovechan también las orientaciones de las auditorías anteriores y los ejemplos del repositorio.
> **Método:** lectura del árbol, archivos principales, pruebas y estado de CI. Las 200 entradas son **propuestas**; la inspección del código no equivale a haber ejecutado manualmente cada escena.

## Resumen ejecutivo

**Objetivo:** convertir BWJM en un documento científico donde toda gráfica sea un objeto vivo, con geometría, controles y matemáticas compartidas. El usuario introduce una curva, un campo o una región; el sistema construye la escena, calcula sus magnitudes y permite mover partículas, rectas, vectores, planos, áreas y volúmenes sin programar una animación distinta por ejercicio.

- **200 funcionalidades distintas**, distribuidas en **20 bloques de 10**. Prioridades: **120 P0 esenciales**, **62 P1 ampliación** y **18 P2 avanzadas**. P0 no significa que deban implementarse todas en un único sprint.
- **Cobertura curricular:** ecuaciones paramétricas, polares, cónicas, geometría vectorial, funciones de varias variables, cálculo vectorial diferencial, extremos y Lagrange, integrales múltiples y de línea, Green, superficies y Stokes; incluye extensiones visuales de divergencia, Maxwell y formas diferenciales.
- **Principio de integridad:** una imagen atractiva nunca sustituye el cálculo, y un resultado numérico aproximado nunca debe anunciarse como identidad exacta.

## I. Estado real del repositorio: qué construir sobre lo que ya existe

| Elemento actual observado | Evidencia | Implicación para las 200 funciones |
|---|---|---|
| Lenguaje y validación de bloques (`plot2d`, `curve3d`, `vectorfield2d`, `gradient`, `tangentplane`, etc.) | [`packages/ast/src/index.ts`](https://github.com/BlackWolfJM/BWJM/blob/0180b9600205f71df78cae6562d6c5c555967cb2/packages/ast/src/index.ts), [`packages/parser/src/index.ts`](https://github.com/BlackWolfJM/BWJM/blob/0180b9600205f71df78cae6562d6c5c555967cb2/packages/parser/src/index.ts) | Extender el esquema con objetos de movimiento y dominios, no generar vídeos hardcodeados. |
| Estado reactivo de sliders, cache por nodo y evaluación de algunos objetos | [`packages/core/src/index.ts`](https://github.com/BlackWolfJM/BWJM/blob/0180b9600205f71df78cae6562d6c5c555967cb2/packages/core/src/index.ts) | Reutilizarlo para reloj global, dependencias, velocidades y escena vinculada. |
| Evaluación `mathjs` y muestreo de funciones/superficies | [`packages/math/src/mathEngine.ts`](https://github.com/BlackWolfJM/BWJM/blob/0180b9600205f71df78cae6562d6c5c555967cb2/packages/math/src/mathEngine.ts) | Añadir derivadas, integración numérica controlada, análisis de dominio y CAS opcional. |
| Curvas 2D en SVG y campos/contornos parciales | [`packages/renderer-svg/src/svgRenderer.ts`](https://github.com/BlackWolfJM/BWJM/blob/0180b9600205f71df78cae6562d6c5c555967cb2/packages/renderer-svg/src/svgRenderer.ts) | Crear capas de partículas, flechas, rebanadas y superposición temporal sin duplicar el motor. |
| Superficie 3D con Plotly | [`packages/renderer-plotly/src/plotlyRenderer.ts`](https://github.com/BlackWolfJM/BWJM/blob/0180b9600205f71df78cae6562d6c5c555967cb2/packages/renderer-plotly/src/plotlyRenderer.ts) | Añadir trazas 3D dinámicas, cámaras coherentes y geometrías incrementales; Three.js es futuro. |
| Editor BWJM Studio y análisis de ejemplo | [`apps/playground/src/main.tsx`](https://github.com/BlackWolfJM/BWJM/blob/0180b9600205f71df78cae6562d6c5c555967cb2/apps/playground/src/main.tsx) | El panel científico de demostración utiliza `f=a*x`, `g=x^2` e intervalos fijos: reemplazarlo por bloques referenciados al documento activo. |
| Área, Riemann y sólidos de revolución | [`regionRiemann.ts`](https://github.com/BlackWolfJM/BWJM/blob/0180b9600205f71df78cae6562d6c5c555967cb2/packages/math/src/regionRiemann.ts), [`solidRevolution.ts`](https://github.com/BlackWolfJM/BWJM/blob/0180b9600205f71df78cae6562d6c5c555967cb2/packages/math/src/solidRevolution.ts) | Reusar cálculos generales y ampliar escenas, con pruebas de orientación, eje, singularidades y precisión. |
| Pipeline de calidad | [`ci.yml`](https://github.com/BlackWolfJM/BWJM/blob/0180b9600205f71df78cae6562d6c5c555967cb2/.github/workflows/ci.yml) y [última ejecución consultada](https://github.com/BlackWolfJM/BWJM/actions/runs/42522117118) | La ejecución del commit revisado resultó exitosa; no repetir la evaluación antigua que señalaba el CI como roto. |

**Diferencia clave:** que el AST *reconozca* `curve3d`, `gradient` o `vectorfield2d` no significa que BWJM Studio ya muestre todos esos objetos con animación. En el render principal del playground se instancian directamente `plot2d` y `surface3d`; las otras capacidades deben conectarse mediante un registro de renderizadores y de escenas.

**Nota de actualidad:** el commit auditado incluye cambios correctivos al CI y a volúmenes de revolución. No se trasladan como «errores actuales confirmados» los problemas ya tratados en las auditorías anteriores; las nuevas pruebas proponen proteger esas correcciones.

## II. Convenciones del catálogo

- **P0 / esencial:** indispensable para la experiencia de movimiento o para interpretar un tema frecuente del curso; escoger algunos para la primera versión.
- **P1 / siguiente ciclo:** amplía profundidad de aprendizaje y robustez una vez construido el motor común.
- **P2 / avanzado:** contenido sofisticado, mayor coste computacional o prioridad curricular menor.
- **Animación:** objeto geométrico que cambia con una variable legítima (`t`, `θ`, un parámetro, una partición) y no simple transición cosmética.
- **Verificación:** cálculo, propiedad o advertencia que debe mantenerse mientras el usuario manipula la escena.
- **Dimensión:** algunas escenas necesitan dos renderizadores coordinados: un objeto 3D más su gráfica 2D auxiliar.

### Índice temático y recuento

| Nº | Bloque | Correspondencia curricular | Espacio | Funciones |
|---:|---|---|---|---:|
| 01 | Motor temporal y lenguaje de animaciones | Transversal | 2D/3D | 10 |
| 02 | Funciones reales y transformaciones 2D | Apoyo a U1 | 2D | 10 |
| 03 | Cónicas y geometría analítica plana | U1 / semanas 1–2 | 2D | 10 |
| 04 | Vectores, rectas, planos y cuadráticas 3D | U1 / semanas 3–4 | 3D | 10 |
| 05 | Coordenadas polares, cilíndricas y esféricas | U1 / semanas 1–4 | 2D/3D | 10 |
| 06 | Movimiento de partículas sobre curvas 2D | U2 / semanas 5–6 | 2D | 10 |
| 07 | Movimiento vectorial y trayectorias 3D | U2 / semanas 5–6 | 3D | 10 |
| 08 | Curvatura, marcos móviles y geometría diferencial | U2 / semana 5 | 2D/3D | 10 |
| 09 | Funciones multivariables, dominio y curvas de nivel | U1 / semanas 6–7 | 2D/3D | 10 |
| 10 | Límites, continuidad y diferenciabilidad visual | U1 / semanas 6–7 | 2D/3D | 10 |
| 11 | Derivadas parciales, gradiente, cadena y Taylor | U1–U2 / semanas 6–8 | 2D/3D | 10 |
| 12 | Extremos, Hessiano, frontera y Lagrange | U2 / semana 8 | 2D/3D | 10 |
| 13 | Áreas, sumas de Riemann e integrales dobles | U3 / semanas 10–11 | 2D/3D | 10 |
| 14 | Cambio de orden, coordenadas polares y jacobianos | U3 / semanas 10–12 | 2D/3D | 10 |
| 15 | Integrales triples, sólidos y cuerpos de revolución | U3 / semanas 11–12 | 3D | 10 |
| 16 | Campos vectoriales y animaciones de flujo | U2–U3 / semanas 13–14 | 2D/3D | 10 |
| 17 | Integrales de línea, trabajo y campos conservativos | U3 / semana 13 | 2D/3D | 10 |
| 18 | Teorema de Green, circulación y flujo en el plano | U3–U4 / semana 15 | 2D | 10 |
| 19 | Superficies parametrizadas, área y flujo de superficie | U4 / semana 14 | 3D | 10 |
| 20 | Stokes, Gauss, Maxwell, formas diferenciales y herramientas de estudio | U4 / semanas 15–17 | 2D/3D | 10 |
| | **Total** | | | **200** |

## III. Las 200 funcionalidades, punto por punto

### 01. Motor temporal y lenguaje de animaciones — Transversal — 2D/3D

#### GFX-001 · Reloj científico global `P0`
- **Qué se ve / movimiento:** Línea de tiempo única que sincroniza partículas, curvas, campos, fórmulas y cámaras.
- **Qué manipula el estudiante:** Reproducir, pausar, avanzar cuadro, retroceder, acelerar, repetir y fijar t.
- **Cálculo y criterio de corrección:** El mismo instante debe gobernar todos los objetos dependientes; no crear cronómetros contradictorios.

#### GFX-002 · Partícula ligada a una trayectoria `P0`
- **Qué se ve / movimiento:** Punto luminoso que recorre la curva y deja visible su posición actual.
- **Qué manipula el estudiante:** Elegir r(t), intervalo, rapidez de reproducción, tamaño y color.
- **Cálculo y criterio de corrección:** Mostrar r(t), coordenadas y dominio válido en tiempo real.

#### GFX-003 · Rastro temporal graduable `P0`
- **Qué se ve / movimiento:** Estela coloreada según pasado reciente de la partícula.
- **Qué manipula el estudiante:** Ajustar duración de estela, persistencia y opacidad.
- **Cálculo y criterio de corrección:** Distinguir posición actual de los puntos visitados; no confundir rastro con curva completa.

#### GFX-004 · Línea o segmento móvil vinculado `P0`
- **Qué se ve / movimiento:** Segmento que cambia de posición y orientación sobre la curva, como tangente o radio.
- **Qué manipula el estudiante:** Elegir punto de anclaje y longitud visual del segmento.
- **Cálculo y criterio de corrección:** Conservar el vínculo geométrico durante toda la animación.

#### GFX-005 · Animación por parámetro y por arco `P0`
- **Qué se ve / movimiento:** Comparación entre avanzar con incrementos iguales de t o de distancia recorrida.
- **Qué manipula el estudiante:** Alternar tiempo uniforme y rapidez espacial uniforme.
- **Cálculo y criterio de corrección:** Explicar por qué curvas parametrizadas no se recorren necesariamente a rapidez constante.

#### GFX-006 · Fotogramas matemáticos reproducibles `P1`
- **Qué se ve / movimiento:** Guardado de instantes con cámara, parámetros, fórmulas y visibilidad de capas.
- **Qué manipula el estudiante:** Capturar estado y volver a él sin volver a configurar la escena.
- **Cálculo y criterio de corrección:** Reproducibilidad del mismo cálculo al abrir el documento.

#### GFX-007 · Eventos de animación vinculados `P1`
- **Qué se ve / movimiento:** Aparición o cambio de color cuando una partícula llega a una intersección, extremo o frontera.
- **Qué manipula el estudiante:** Definir evento, tolerancia, transición y acción.
- **Cálculo y criterio de corrección:** Marcar el tiempo exacto o numéricamente aproximado del evento.

#### GFX-008 · Sincronización entre vistas 2D y 3D `P0`
- **Qué se ve / movimiento:** Dos paneles muestran proyección 2D y curva 3D del mismo movimiento.
- **Qué manipula el estudiante:** Mover un solo deslizador y elegir las proyecciones.
- **Cálculo y criterio de corrección:** Las dos vistas deben representar el mismo punto físico y el mismo t.

#### GFX-009 · Comparador de dos movimientos `P1`
- **Qué se ve / movimiento:** Dos partículas compiten sobre una misma curva o siguen trayectorias distintas.
- **Qué manipula el estudiante:** Cambiar parametrización, tiempo inicial y ley t(s).
- **Cálculo y criterio de corrección:** Comparar posición, rapidez y tiempo de llegada sin alterar la geometría.

#### GFX-010 · Exportación de animación con metadatos `P2`
- **Qué se ve / movimiento:** Generar GIF, WebM o secuencia de imágenes a partir de una escena determinista.
- **Qué manipula el estudiante:** Elegir intervalo, FPS, resolución y fórmula visible.
- **Cálculo y criterio de corrección:** Adjuntar ecuaciones, parámetros y advertencia cuando el exportado sea solo visual.

### 02. Funciones reales y transformaciones 2D — Apoyo a U1 — 2D

#### GFX-011 · Construcción progresiva de la gráfica `P0`
- **Qué se ve / movimiento:** La curva y=f(x) se dibuja desde a hasta b mientras un punto avanza.
- **Qué manipula el estudiante:** Ajustar dominio, sentido y velocidad de trazado.
- **Cálculo y criterio de corrección:** Verificar discontinuidades y no conectar segmentos a través de asíntotas.

#### GFX-012 · Recta tangente deslizante `P0`
- **Qué se ve / movimiento:** Una tangente gira y se traslada siguiendo f(x).
- **Qué manipula el estudiante:** Arrastrar el punto x=a y activar el valor f'(a).
- **Cálculo y criterio de corrección:** Relacionar la pendiente visual con la derivada analítica o aproximada.

#### GFX-013 · Recta normal dinámica `P0`
- **Qué se ve / movimiento:** Normal perpendicular a la tangente que acompaña al punto.
- **Qué manipula el estudiante:** Alternar tangente, normal y ángulo.
- **Cálculo y criterio de corrección:** Comprobar ortogonalidad e informar cuando no exista tangente regular.

#### GFX-014 · Secantes que convergen `P0`
- **Qué se ve / movimiento:** Varias rectas secantes se aproximan a la tangente.
- **Qué manipula el estudiante:** Controlar h positivo/negativo y mostrar cociente incremental.
- **Cálculo y criterio de corrección:** Visualizar el límite de las pendientes y la diferencia entre derivabilidad lateral y bilateral.

#### GFX-015 · Desplazamiento vertical horizontal `P1`
- **Qué se ve / movimiento:** La curva original y su copia se animan con f(x-h)+k.
- **Qué manipula el estudiante:** Sliders h y k, superposición y tabla de puntos.
- **Cálculo y criterio de corrección:** Mostrar transformación de coordenadas sin recomputar incorrectamente el dominio.

#### GFX-016 · Escalamiento y reflexión `P1`
- **Qué se ve / movimiento:** Curva se estira, comprime o refleja mediante a f(bx).
- **Qué manipula el estudiante:** Sliders a,b y espejo respecto a ejes.
- **Cálculo y criterio de corrección:** Distinguir efecto horizontal 1/|b| del vertical |a|.

#### GFX-017 · Familias de funciones `P1`
- **Qué se ve / movimiento:** Haz de curvas f(x,a) coloreadas por parámetro.
- **Qué manipula el estudiante:** Barrer a y congelar curvas históricas.
- **Cálculo y criterio de corrección:** Comparar variación del parámetro y movimiento de raíces o extremos.

#### GFX-018 · Asíntotas y agujeros animados `P0`
- **Qué se ve / movimiento:** Rectas punteadas, círculos abiertos y tramos excluidos con zoom automático.
- **Qué manipula el estudiante:** Activar detección de dominio y acercarse a la singularidad.
- **Cálculo y criterio de corrección:** No representar un salto o una asíntota como una intersección real.

#### GFX-019 · Intersecciones móviles de dos funciones `P1`
- **Qué se ve / movimiento:** Puntos de corte se desplazan al variar un parámetro de f o g.
- **Qué manipula el estudiante:** Arrastrar curvas y animar coeficientes.
- **Cálculo y criterio de corrección:** Recalcular raíces, tolerancia y multiplicidad; señalar tangencias.

#### GFX-020 · Barrido de nivel horizontal `P1`
- **Qué se ve / movimiento:** Recta y=c atraviesa una función y señala sus preimágenes.
- **Qué manipula el estudiante:** Ajustar c o animar el barrido.
- **Cálculo y criterio de corrección:** Observar cuántas soluciones de f(x)=c existen en cada instante.

### 03. Cónicas y geometría analítica plana — U1 / semanas 1–2 — 2D

#### GFX-021 · Elipse desde focos y cuerda `P0`
- **Qué se ve / movimiento:** Punto recorre la elipse con segmentos dinámicos a ambos focos.
- **Qué manipula el estudiante:** Mover focos o suma de distancias.
- **Cálculo y criterio de corrección:** Verificar PF1+PF2=2a y actualizar ejes.

#### GFX-022 · Parábola foco-directriz `P0`
- **Qué se ve / movimiento:** Punto móvil con dos distancias iguales resaltadas.
- **Qué manipula el estudiante:** Mover foco, directriz y vértice.
- **Cálculo y criterio de corrección:** Probar distancia al foco igual a distancia a la directriz.

#### GFX-023 · Hipérbola de diferencia constante `P0`
- **Qué se ve / movimiento:** Rama recorrida con segmentos a focos.
- **Qué manipula el estudiante:** Variar a, b y excentricidad.
- **Cálculo y criterio de corrección:** Mantener |PF1-PF2|=2a y enseñar asíntotas.

#### GFX-024 · Cónica por excentricidad polar `P0`
- **Qué se ve / movimiento:** Curva evoluciona al variar e desde circunferencia hacia parábola e hipérbola.
- **Qué manipula el estudiante:** Sliders de e, parámetro focal y ángulo.
- **Cálculo y criterio de corrección:** Identificar cuándo cambia el tipo de cónica y su dominio polar.

#### GFX-025 · Cónicas rotadas `P1`
- **Qué se ve / movimiento:** Rotación de ejes sobre ecuación general Ax²+Bxy+Cy²+...=0.
- **Qué manipula el estudiante:** Girar ángulo y mostrar matriz de rotación.
- **Cálculo y criterio de corrección:** Explicar eliminación del término xy bajo condiciones pertinentes.

#### GFX-026 · Tangente y normal en cónica `P1`
- **Qué se ve / movimiento:** Punto viaja por una cónica y aparecen tangente, normal y radio focal.
- **Qué manipula el estudiante:** Mover parámetro, alternar formas explícita e implícita.
- **Cálculo y criterio de corrección:** Comparar derivada implícita con vector gradiente cuando esté definido.

#### GFX-027 · Directrices y latus rectum `P2`
- **Qué se ve / movimiento:** Directrices y lados rectos emergen sobre la cónica correspondiente.
- **Qué manipula el estudiante:** Mostrar/ocultar elementos y modificar excentricidad.
- **Cálculo y criterio de corrección:** Validar distancias y longitud del lado recto en cada caso.

#### GFX-028 · Cónica degenerada `P2`
- **Qué se ve / movimiento:** Animación de una cónica que cambia hasta una pareja de rectas o un punto.
- **Qué manipula el estudiante:** Variar coeficientes de la cuadrática.
- **Cálculo y criterio de corrección:** Distinguir degeneración real de error de discretización.

#### GFX-029 · Parametrización racional de circunferencia `P2`
- **Qué se ve / movimiento:** Punto viaja en círculo con t=tan(θ/2) y punto de exclusión.
- **Qué manipula el estudiante:** Alternar parámetro racional y angular.
- **Cálculo y criterio de corrección:** Mostrar por qué una parametrización puede omitir un punto.

#### GFX-030 · Intersección cónica-recta `P1`
- **Qué se ve / movimiento:** Recta móvil corta, toca o deja de cortar una cónica.
- **Qué manipula el estudiante:** Desplazar recta y mostrar discriminante.
- **Cálculo y criterio de corrección:** Conectar 0, 1 o 2 cortes con el signo del discriminante.

### 04. Vectores, rectas, planos y cuadráticas 3D — U1 / semanas 3–4 — 3D

#### GFX-031 · Vector libre y vector posición `P0`
- **Qué se ve / movimiento:** Flecha que se traslada sin cambiar sus componentes junto a otra anclada al origen.
- **Qué manipula el estudiante:** Arrastrar punto de origen y extremo.
- **Cálculo y criterio de corrección:** Distinguir posición de vector geométrico libre.

#### GFX-032 · Suma de vectores punta-cola `P0`
- **Qué se ve / movimiento:** Animación de dos flechas y su resultante.
- **Qué manipula el estudiante:** Cambiar componentes y orden de suma.
- **Cálculo y criterio de corrección:** Exhibir regla del paralelogramo y conmutatividad.

#### GFX-033 · Producto escalar y proyección `P0`
- **Qué se ve / movimiento:** Proyección de una flecha sobre otra se alarga o invierte al girar el ángulo.
- **Qué manipula el estudiante:** Rotar vectores y activar componente paralela.
- **Cálculo y criterio de corrección:** Mostrar u·v y cosθ, incluida la situación ortogonal.

#### GFX-034 · Producto vectorial orientado `P0`
- **Qué se ve / movimiento:** Flecha perpendicular surge con regla de la mano derecha.
- **Qué manipula el estudiante:** Rotar u,v y mostrar área del paralelogramo.
- **Cálculo y criterio de corrección:** Verificar magnitud |u×v| e inversión de signo al intercambiar.

#### GFX-035 · Recta espacial vectorial `P0`
- **Qué se ve / movimiento:** Partícula recorre P+t v y deja traza sobre la recta.
- **Qué manipula el estudiante:** Modificar P, v y t; ver forma simétrica y paramétrica.
- **Cálculo y criterio de corrección:** Detectar dirección cero y las componentes nulas de la forma simétrica.

#### GFX-036 · Plano por punto y normal `P0`
- **Qué se ve / movimiento:** Plano translúcido rota con su vector normal visible.
- **Qué manipula el estudiante:** Arrastrar punto, vector normal y opacidad.
- **Cálculo y criterio de corrección:** Comprobar n·(X-P)=0 para puntos pertenecientes.

#### GFX-037 · Plano por tres puntos `P0`
- **Qué se ve / movimiento:** Tres puntos definen un triángulo que se extiende hasta un plano.
- **Qué manipula el estudiante:** Arrastrar A,B,C.
- **Cálculo y criterio de corrección:** Detectar colinealidad y explicar por qué no define plano único.

#### GFX-038 · Intersección recta-plano `P1`
- **Qué se ve / movimiento:** Partícula avanza hasta el cruce, que se ilumina.
- **Qué manipula el estudiante:** Cambiar recta y plano; mostrar t del cruce.
- **Cálculo y criterio de corrección:** Separar los casos corte único, paralelismo y recta contenida.

#### GFX-039 · Ángulos y distancias espaciales `P1`
- **Qué se ve / movimiento:** Conos y arcos muestran ángulos recta-recta, plano-plano, recta-plano y distancia punto-plano.
- **Qué manipula el estudiante:** Seleccionar entidades y activar proyecciones.
- **Cálculo y criterio de corrección:** Emplear normales o directores adecuados sin confundir ángulos suplementarios.

#### GFX-040 · Galería de cuádricas `P0`
- **Qué se ve / movimiento:** Elipsoide, hiperboloide, paraboloide y cono se transforman al variar coeficientes.
- **Qué manipula el estudiante:** Animar cortes z=c y opacidad.
- **Cálculo y criterio de corrección:** Identificar tipo de superficie y trazas cartesianas.

### 05. Coordenadas polares, cilíndricas y esféricas — U1 / semanas 1–4 — 2D/3D

#### GFX-041 · Punto polar móvil con radio vector `P0`
- **Qué se ve / movimiento:** Punto recorre r(θ) mientras un radio gira desde el eje polar.
- **Qué manipula el estudiante:** Arrastrar θ, r, sentido de giro y vuelta.
- **Cálculo y criterio de corrección:** Mostrar coordenadas cartesianas y equivalencias polares.

#### GFX-042 · Área sectorial por barrido `P0`
- **Qué se ve / movimiento:** Región polar r(θ) se colorea progresivamente como abanico.
- **Qué manipula el estudiante:** Ajustar θ inicial/final y velocidad.
- **Cálculo y criterio de corrección:** Conectar área A=1/2∫r²dθ con sectores infinitesimales.

#### GFX-043 · Longitud de arco polar `P1`
- **Qué se ve / movimiento:** Un marcador de longitud avanza sobre la curva y despliega un pequeño segmento ds.
- **Qué manipula el estudiante:** Variar límite final y malla de partición.
- **Cálculo y criterio de corrección:** Mostrar ds=√(r²+(dr/dθ)²)dθ.

#### GFX-044 · Tangente cartesiana y base polar `P0`
- **Qué se ve / movimiento:** Flechas e_r y e_θ giran con la partícula y reconstruyen r'(θ).
- **Qué manipula el estudiante:** Controlar θ y derivada dr/dθ.
- **Cálculo y criterio de corrección:** Verificar ortogonalidad de base y fórmula de la velocidad polar.

#### GFX-045 · Espirales y rosas polares `P1`
- **Qué se ve / movimiento:** Trazado animado con color por vuelta y por radio.
- **Qué manipula el estudiante:** Elegir r=aθ, r=a cos(kθ) u otras familias.
- **Cálculo y criterio de corrección:** Explicar signos de r y repetición de pétalos.

#### GFX-046 · Malla cartesiana hacia polar `P1`
- **Qué se ve / movimiento:** Cuadrícula se deforma en radios y arcos.
- **Qué manipula el estudiante:** Deslizador de interpolación geométrica.
- **Cálculo y criterio de corrección:** Mostrar por qué dA=r dr dθ aparece con el jacobiano.

#### GFX-047 · Punto cilíndrico y proyecciones `P0`
- **Qué se ve / movimiento:** P(x,y,z) se construye desde (r,θ,z) con proyecciones en el plano.
- **Qué manipula el estudiante:** Animar r,θ,z y cambiar vista.
- **Cálculo y criterio de corrección:** Comprobar x=r cosθ, y=r sinθ.

#### GFX-048 · Punto esférico con ángulos `P0`
- **Qué se ve / movimiento:** Arcos indican ángulo polar y azimut al mover punto en una esfera.
- **Qué manipula el estudiante:** Variar ρ,θ,φ y elegir convención.
- **Cálculo y criterio de corrección:** Declarar la convención y verificar fórmulas antes de calcular.

#### GFX-049 · Malla esférica deformable `P1`
- **Qué se ve / movimiento:** Retícula de meridianos y paralelos se expande o contrae.
- **Qué manipula el estudiante:** Cambiar ρ y límites de ángulos.
- **Cálculo y criterio de corrección:** Mostrar elemento dV=ρ² sinφ dρ dφ dθ según convención.

#### GFX-050 · Conversión reversible de regiones `P1`
- **Qué se ve / movimiento:** Un mismo sólido aparece simultáneamente en cartesianas, cilíndricas y esféricas.
- **Qué manipula el estudiante:** Editar dominio en una vista y resaltarlo en las demás.
- **Cálculo y criterio de corrección:** Validar inversas, restricciones angulares y puntos singulares.

### 06. Movimiento de partículas sobre curvas 2D — U2 / semanas 5–6 — 2D

#### GFX-051 · Partícula en r(t)=<x(t),y(t)> `P0`
- **Qué se ve / movimiento:** Punto se mueve y muestra coordenadas y vector posición.
- **Qué manipula el estudiante:** Play/Pause, t, estela y orientación de recorrido.
- **Cálculo y criterio de corrección:** Mostrar movimiento sin exigir que la curva sea función y=f(x).

#### GFX-052 · Flecha velocidad viajera `P0`
- **Qué se ve / movimiento:** Vector v(t)=r'(t) acompaña a la partícula como flecha tangente.
- **Qué manipula el estudiante:** Escalar solo longitud visual y alternar valor físico.
- **Cálculo y criterio de corrección:** Relacionar dirección, rapidez y derivada.

#### GFX-053 · Flecha aceleración viajera `P0`
- **Qué se ve / movimiento:** Vector a(t)=r''(t) acompaña al objeto en un segundo color.
- **Qué manipula el estudiante:** Mostrar v, a o ambas y fijar t.
- **Cálculo y criterio de corrección:** Distinguir cambio de dirección y cambio de rapidez.

#### GFX-054 · Velocidad tangencial frente a normal `P0`
- **Qué se ve / movimiento:** Descomposición a=a_T T+a_N N aparece junto a la partícula.
- **Qué manipula el estudiante:** Activar componentes y curvatura.
- **Cálculo y criterio de corrección:** Verificar a_T=d|v|/dt y a_N=κ|v|² cuando corresponda.

#### GFX-055 · Parametrización equivalente comparada `P0`
- **Qué se ve / movimiento:** Dos puntos recorren la misma circunferencia con diferentes leyes temporales.
- **Qué manipula el estudiante:** Definir t(s) y sincronizar por reloj.
- **Cálculo y criterio de corrección:** Comparar geometría idéntica con velocidades distintas.

#### GFX-056 · Ángulo de tangente dinámica `P1`
- **Qué se ve / movimiento:** Un transportador gira mostrando ángulo de v(t) con eje x.
- **Qué manipula el estudiante:** Control de instante y cuadrante.
- **Cálculo y criterio de corrección:** Usar atan2 para evitar ambigüedades.

#### GFX-057 · Aceleración centrípeta visible `P1`
- **Qué se ve / movimiento:** Partícula orbita y aceleración apunta al centro en el caso circular uniforme.
- **Qué manipula el estudiante:** Variar radio y velocidad angular.
- **Cálculo y criterio de corrección:** Verificar |a|=v²/R sin extrapolarlo a cualquier movimiento.

#### GFX-058 · Puntos de detención y cúspides `P1`
- **Qué se ve / movimiento:** La partícula se detiene o la curva marca donde r'(t)=0.
- **Qué manipula el estudiante:** Congelar la animación y examinar límites laterales.
- **Cálculo y criterio de corrección:** Distinguir punto estacionario de cúspide geométrica.

#### GFX-059 · Colisiones de trayectorias planas `P1`
- **Qué se ve / movimiento:** Dos partículas recorren curvas y se resalta coincidencia espacial y temporal.
- **Qué manipula el estudiante:** Variar desfase y velocidad.
- **Cálculo y criterio de corrección:** No confundir cruce geométrico con choque en el mismo instante.

#### GFX-060 · Distancia recorrida acumulada `P0`
- **Qué se ve / movimiento:** Contador integra |r'(t)| desde t0 hasta el instante actual.
- **Qué manipula el estudiante:** Barrer t y comparar contra desplazamiento |r(t)-r(t0)|.
- **Cálculo y criterio de corrección:** Enseñar por qué longitud recorrida es mayor o igual que desplazamiento.

### 07. Movimiento vectorial y trayectorias 3D — U2 / semanas 5–6 — 3D

#### GFX-061 · Partícula en hélice espacial `P0`
- **Qué se ve / movimiento:** Esfera recorre r(t)=<cos t,sin t,t/3> y deja tubo-estela.
- **Qué manipula el estudiante:** Reproducir, girar cámara y controlar t de 0 a 6π.
- **Cálculo y criterio de corrección:** Vincular posición, altura y periodo con la parametrización.

#### GFX-062 · Vector posición 3D elástico `P0`
- **Qué se ve / movimiento:** Flecha desde el origen sigue la partícula y cambia de longitud.
- **Qué manipula el estudiante:** Ocultar/mostrar proyecciones y ejes.
- **Cálculo y criterio de corrección:** Identificar r(t) como vector desde el origen.

#### GFX-063 · Velocidad 3D transportada `P0`
- **Qué se ve / movimiento:** Flecha tangente acompaña el movimiento espacial.
- **Qué manipula el estudiante:** Escala visual independiente del valor físico.
- **Cálculo y criterio de corrección:** Relacionar dirección instantánea con r'(t).

#### GFX-064 · Aceleración 3D transportada `P0`
- **Qué se ve / movimiento:** Flecha de aceleración se mueve junto al móvil espacial.
- **Qué manipula el estudiante:** Comparar r'', rapidez y sentido de curvatura.
- **Cálculo y criterio de corrección:** Mostrar aceleración incluso cuando no es paralela a velocidad.

#### GFX-065 · Proyecciones XY XZ YZ sincronizadas `P0`
- **Qué se ve / movimiento:** Tres trazas planas acompañan al recorrido espacial.
- **Qué manipula el estudiante:** Activar paneles con puntero temporal compartido.
- **Cálculo y criterio de corrección:** Enseñar cómo una curva tridimensional se descompone en vistas 2D.

#### GFX-066 · Ascenso y descenso en una curva `P1`
- **Qué se ve / movimiento:** Un plano z=c corta la trayectoria y marca eventos de altura.
- **Qué manipula el estudiante:** Variar c y mostrar dz/dt.
- **Cálculo y criterio de corrección:** Determinar cuándo la partícula sube, baja o queda horizontal.

#### GFX-067 · Sombra móvil de trayectoria `P1`
- **Qué se ve / movimiento:** Proyección vertical de la partícula sobre el plano xy avanza simultáneamente.
- **Qué manipula el estudiante:** Ajustar orientación de luz y transparencia.
- **Cálculo y criterio de corrección:** Distinguir curva real de su proyección.

#### GFX-068 · Cámara que sigue la partícula `P1`
- **Qué se ve / movimiento:** Cámara se posiciona detrás o frente al móvil con vista del entorno.
- **Qué manipula el estudiante:** Elegir vista fija, órbita o seguimiento.
- **Cálculo y criterio de corrección:** Evitar que la cámara modifique valores matemáticos o introduzca deformaciones engañosas.

#### GFX-069 · Comparación de velocidad angular y axial `P1`
- **Qué se ve / movimiento:** Hélices con mismo radio pero diferente ascenso por vuelta se superponen.
- **Qué manipula el estudiante:** Sliders de paso y frecuencia angular.
- **Cálculo y criterio de corrección:** Observar longitud por vuelta, rapidez y pendiente espacial.

#### GFX-070 · Curvas 3D con autointersecciones `P2`
- **Qué se ve / movimiento:** Dos instantes distintos se iluminan en el mismo punto espacial.
- **Qué manipula el estudiante:** Seleccionar pares de tiempos y repetir.
- **Cálculo y criterio de corrección:** Distinguir autointersección de periodicidad con coincidencia temporal.

### 08. Curvatura, marcos móviles y geometría diferencial — U2 / semana 5 — 2D/3D

#### GFX-071 · Tangente unitaria T(t) móvil `P0`
- **Qué se ve / movimiento:** Flecha normalizada viaja con la partícula sin cambiar de norma.
- **Qué manipula el estudiante:** Alternar r', T y magnitud de v.
- **Cálculo y criterio de corrección:** Comprobar |T|=1 en puntos regulares.

#### GFX-072 · Normal principal N(t) móvil `P0`
- **Qué se ve / movimiento:** Flecha normal apunta hacia el cambio de la tangente.
- **Qué manipula el estudiante:** Mostrar N y distinguir normal plana girada arbitrariamente.
- **Cálculo y criterio de corrección:** Calcular N=T'/|T'| cuando T'≠0.

#### GFX-073 · Binormal B(t) móvil `P0`
- **Qué se ve / movimiento:** Vector perpendicular a T y N forma un triedro tridimensional.
- **Qué manipula el estudiante:** Cambiar t y visualizar regla de orientación.
- **Cálculo y criterio de corrección:** Verificar B=T×N y signos de orientación.

#### GFX-074 · Marco de Frenet transportado `P0`
- **Qué se ve / movimiento:** Las tres flechas T,N,B viajan y rotan como un sistema local.
- **Qué manipula el estudiante:** Seleccionar qué flechas y planos mostrar.
- **Cálculo y criterio de corrección:** Conectar el cambio local del marco con curvatura y torsión.

#### GFX-075 · Círculo osculador viajero `P0`
- **Qué se ve / movimiento:** Círculo tangente aparece en plano osculador junto al punto.
- **Qué manipula el estudiante:** Animar t y resaltar centro y radio ρ=1/κ.
- **Cálculo y criterio de corrección:** Explicar aproximación local cuando κ>0.

#### GFX-076 · Radio y centro de curvatura `P1`
- **Qué se ve / movimiento:** Segmento hacia centro osculador cambia de longitud.
- **Qué manipula el estudiante:** Arrastrar t y superponer curvatura κ(t).
- **Cálculo y criterio de corrección:** Verificar posición r+N/κ donde esté definida.

#### GFX-077 · Gráfico κ(t) sincronizado `P0`
- **Qué se ve / movimiento:** Segunda gráfica muestra curvatura y un cursor sigue el tiempo.
- **Qué manipula el estudiante:** Elegir curva, resaltar máximos y ceros de κ.
- **Cálculo y criterio de corrección:** Interpretar tramos más curvos sin confundirlo con rapidez.

#### GFX-078 · Plano osculador móvil `P1`
- **Qué se ve / movimiento:** Plano translúcido generado por T y N gira con curva espacial.
- **Qué manipula el estudiante:** Congelar t y mostrar normal B.
- **Cálculo y criterio de corrección:** Distinguirlo de plano tangente a una superficie.

#### GFX-079 · Plano normal y rectificante `P2`
- **Qué se ve / movimiento:** Dos planos locales se alternan junto con el osculador.
- **Qué manipula el estudiante:** Cambiar plano en el triedro T,N,B.
- **Cálculo y criterio de corrección:** Identificar generadores y ecuaciones mediante un punto y una normal.

#### GFX-080 · Torsión de hélice y curva plana `P1`
- **Qué se ve / movimiento:** Medidor de τ(t) colorea torsión y torsión nula en casos planos regulares.
- **Qué manipula el estudiante:** Alternar hélice, circunferencia y otras curvas.
- **Cálculo y criterio de corrección:** Asociar torsión con salida del plano y advertir degeneraciones del marco.

### 09. Funciones multivariables, dominio y curvas de nivel — U1 / semanas 6–7 — 2D/3D

#### GFX-081 · Superficie z=f(x,y) con puntero `P0`
- **Qué se ve / movimiento:** Punto se arrastra sobre el dominio y un punto correspondiente se mueve en 3D.
- **Qué manipula el estudiante:** Controles x,y, cámara y altura.
- **Cálculo y criterio de corrección:** Enlazar f(x,y), gráfica y coordenadas.

#### GFX-082 · Dominio real sombreado `P0`
- **Qué se ve / movimiento:** Zonas donde la función está definida aparecen como máscara 2D.
- **Qué manipula el estudiante:** Elegir expresiones con raíces, logaritmos y denominadores.
- **Cálculo y criterio de corrección:** Señalar fronteras incluidas/excluidas y no graficar valores complejos como reales.

#### GFX-083 · Curvas de nivel animadas `P0`
- **Qué se ve / movimiento:** Plano horizontal z=c barre superficie y proyecta intersección al plano xy.
- **Qué manipula el estudiante:** Deslizar c y alternar secciones.
- **Cálculo y criterio de corrección:** Mostrar correspondencia f(x,y)=c.

#### GFX-084 · Mapa de calor vinculado `P1`
- **Qué se ve / movimiento:** Colores en el plano muestran valores de f y siguen el puntero 3D.
- **Qué manipula el estudiante:** Cambiar paleta, escala y rango.
- **Cálculo y criterio de corrección:** No ocultar discontinuidades ni saturar extremos.

#### GFX-085 · Trazas verticales x=a `P0`
- **Qué se ve / movimiento:** Plano vertical corta la superficie y genera curva 2D separada.
- **Qué manipula el estudiante:** Mover a y comparar secciones.
- **Cálculo y criterio de corrección:** Interpretar f(a,y) como función de una variable.

#### GFX-086 · Trazas verticales y=b `P0`
- **Qué se ve / movimiento:** Plano y=b corta la superficie y muestra f(x,b).
- **Qué manipula el estudiante:** Mover b y sincronizar con dominio.
- **Cálculo y criterio de corrección:** Preparar el concepto de derivadas parciales.

#### GFX-087 · Comparador de superficies `P1`
- **Qué se ve / movimiento:** Dos superficies comparten cámara y coordenadas para observar diferencia.
- **Qué manipula el estudiante:** Variar parámetros y transparencia.
- **Cálculo y criterio de corrección:** Verificar z=f y z=g y reconocer región entre superficies.

#### GFX-088 · Superficie implícita F(x,y,z)=0 `P2`
- **Qué se ve / movimiento:** Isosuperficie se extrae de un campo escalar 3D.
- **Qué manipula el estudiante:** Seleccionar nivel y resolución.
- **Cálculo y criterio de corrección:** Distinguir soluciones implícitas y regiones mal condicionadas.

#### GFX-089 · Curvas de contorno críticas `P1`
- **Qué se ve / movimiento:** Curvas de nivel cercanas a extremos y sillas se densifican visualmente.
- **Qué manipula el estudiante:** Cambiar c y punto.
- **Cálculo y criterio de corrección:** Relacionar topología de contornos con cambios críticos.

#### GFX-090 · Intersección de dos superficies `P2`
- **Qué se ve / movimiento:** Curva espacial común resalta sobre superficies semitransparentes.
- **Qué manipula el estudiante:** Mover parámetros de ambas superficies.
- **Cálculo y criterio de corrección:** Verificar residuales de F=0 y G=0 en la curva.

### 10. Límites, continuidad y diferenciabilidad visual — U1 / semanas 6–7 — 2D/3D

#### GFX-091 · Caminos hacia un punto `P0`
- **Qué se ve / movimiento:** Varias partículas se acercan a (a,b) por trayectorias distintas sobre la superficie.
- **Qué manipula el estudiante:** Elegir rectas, parábolas y curvas personalizadas.
- **Cálculo y criterio de corrección:** Mostrar valores f(x(t),y(t)) y detectar límites diferentes.

#### GFX-092 · Abanico de aproximaciones radiales `P1`
- **Qué se ve / movimiento:** Flechas convergen desde múltiples ángulos alrededor de un punto.
- **Qué manipula el estudiante:** Barrer ángulo y radio decreciente.
- **Cálculo y criterio de corrección:** Diferenciar evidencia numérica de demostración del límite multivariable.

#### GFX-093 · Límite por dos caminos `P0`
- **Qué se ve / movimiento:** Pantalla divide rutas y grafica f a lo largo de cada una.
- **Qué manipula el estudiante:** Editar dos parametrizaciones.
- **Cálculo y criterio de corrección:** Producir contraejemplo cuando los límites difieran.

#### GFX-094 · Punto ausente frente al límite `P0`
- **Qué se ve / movimiento:** Círculo vacío y valor asignado se muestran en alturas distintas.
- **Qué manipula el estudiante:** Cambiar f(a,b) sin alterar vecinos.
- **Cálculo y criterio de corrección:** Distinguir límite, valor de función y continuidad.

#### GFX-095 · Corte de singularidad removible `P1`
- **Qué se ve / movimiento:** Un agujero en superficie se rellena al asignar valor apropiado.
- **Qué manipula el estudiante:** Ajustar valor y comprobar continuidad.
- **Cálculo y criterio de corrección:** Visualizar prolongación continua si el límite existe.

#### GFX-096 · Oscilación cerca del origen `P1`
- **Qué se ve / movimiento:** Densidad de ondulaciones aumenta o se atenúa al acercarse.
- **Qué manipula el estudiante:** Slider de zoom y trayectorias.
- **Cálculo y criterio de corrección:** Mostrar casos donde el límite falla por oscilación.

#### GFX-097 · Mapa ε-δ interactivo `P2`
- **Qué se ve / movimiento:** Bola δ en dominio y banda ε en alturas se dibujan juntos.
- **Qué manipula el estudiante:** Elegir ε y buscar δ.
- **Cálculo y criterio de corrección:** Permitir explorar la definición, no afirmar prueba universal desde muestreo finito.

#### GFX-098 · Continuidad de función vectorial `P1`
- **Qué se ve / movimiento:** Varias componentes se muestran frente a una trayectoria vectorial.
- **Qué manipula el estudiante:** Aproximarse a t0 desde izquierda y derecha.
- **Cálculo y criterio de corrección:** Relacionar continuidad componente a componente.

#### GFX-099 · Superficie con salto `P1`
- **Qué se ve / movimiento:** Dos hojas separadas resaltan el salto sobre una frontera.
- **Qué manipula el estudiante:** Mover punto perpendicular a la discontinuidad.
- **Cálculo y criterio de corrección:** Comparar límites laterales en direcciones opuestas.

#### GFX-100 · Diferenciabilidad geométrica `P0`
- **Qué se ve / movimiento:** Plano lineal local se superpone a la superficie y se observa el error.
- **Qué manipula el estudiante:** Reducir radio de vecindad.
- **Cálculo y criterio de corrección:** Comparar error con distancia al punto, evitando confundir parciales existentes con diferenciabilidad.

### 11. Derivadas parciales, gradiente, cadena y Taylor — U1–U2 / semanas 6–8 — 2D/3D

#### GFX-101 · Pendiente parcial en x `P0`
- **Qué se ve / movimiento:** Recta tangente a la sección y=b gira al mover (a,b).
- **Qué manipula el estudiante:** Deslizar a,b y mostrar fx(a,b).
- **Cálculo y criterio de corrección:** Diferenciar derivada parcial de pendiente a lo largo de camino arbitrario.

#### GFX-102 · Pendiente parcial en y `P0`
- **Qué se ve / movimiento:** Recta tangente a la sección x=a acompaña punto sobre superficie.
- **Qué manipula el estudiante:** Variar a,b y mostrar fy(a,b).
- **Cálculo y criterio de corrección:** Relacionar planos de corte y derivación parcial.

#### GFX-103 · Gradiente móvil sobre contornos `P0`
- **Qué se ve / movimiento:** Flecha ∇f se traslada sobre mapa de niveles y apunta al crecimiento máximo.
- **Qué manipula el estudiante:** Arrastrar punto y alternar curvas de nivel.
- **Cálculo y criterio de corrección:** Comprobar perpendicularidad a curvas de nivel regulares.

#### GFX-104 · Derivada direccional con dirección giratoria `P0`
- **Qué se ve / movimiento:** Flecha unitaria gira mientras el valor direccional cambia en un medidor.
- **Qué manipula el estudiante:** Ajustar ángulo, dirección y punto base.
- **Cálculo y criterio de corrección:** Comparar D_u f=∇f·u solo donde aplica diferenciabilidad.

#### GFX-105 · Máximo crecimiento y descenso `P0`
- **Qué se ve / movimiento:** Un cono de direcciones resalta la flecha de máximo aumento y su opuesta.
- **Qué manipula el estudiante:** Animar ángulo y medir coseno con gradiente.
- **Cálculo y criterio de corrección:** Mostrar tasas extremas ±|∇f| para vectores unitarios.

#### GFX-106 · Plano tangente e incremento real `P0`
- **Qué se ve / movimiento:** Plano tangente y superficie se separan al alejarse del punto.
- **Qué manipula el estudiante:** Controlar Δx y Δy.
- **Cálculo y criterio de corrección:** Mostrar L(x,y), f(x,y) y error de aproximación lineal.

#### GFX-107 · Regla de cadena por grafo dinámico `P1`
- **Qué se ve / movimiento:** Árbol visual conecta u→(x,y)→z y anima dependencias.
- **Qué manipula el estudiante:** Variar funciones x(u), y(u) y t.
- **Cálculo y criterio de corrección:** Desglosar dz/du=fx dx/du+fy dy/du en rutas causales.

#### GFX-108 · Regla de cadena de varias capas `P1`
- **Qué se ve / movimiento:** Red más extensa conecta z(x,y), x(u,v), y(u,v) y u(t),v(t).
- **Qué manipula el estudiante:** Ocultar/mostrar caminos y derivadas parciales.
- **Cálculo y criterio de corrección:** Multiplicar jacobianos respetando dimensiones y orden.

#### GFX-109 · Superficie de Taylor orden 2 `P1`
- **Qué se ve / movimiento:** Aproximación cuadrática aparece como parche junto al plano de Taylor orden 1.
- **Qué manipula el estudiante:** Alterar radio y seleccionar orden.
- **Cálculo y criterio de corrección:** Comparar error y términos del Hessiano; declarar punto y condiciones.

#### GFX-110 · Derivación implícita sobre nivel `P1`
- **Qué se ve / movimiento:** Curva F(x,y)=0 muestra tangente móvil derivada de gradiente.
- **Qué manipula el estudiante:** Mover punto por nivel y alternar dx/dy,dy/dx.
- **Cálculo y criterio de corrección:** Usar F_x,F_y y señalar dónde el teorema implícito no aplica.

### 12. Extremos, Hessiano, frontera y Lagrange — U2 / semana 8 — 2D/3D

#### GFX-111 · Detección de máximos mínimos y sillas `P0`
- **Qué se ve / movimiento:** Puntos críticos aparecen sobre la superficie con colores distintos.
- **Qué manipula el estudiante:** Variar parámetros de f y desplegar Hessiano.
- **Cálculo y criterio de corrección:** Clasificar solo cuando el criterio es concluyente y manejar casos degenerados.

#### GFX-112 · Curvas de nivel alrededor de extremos `P0`
- **Qué se ve / movimiento:** Contornos cerrados crecen o decrecen alrededor del crítico.
- **Qué manipula el estudiante:** Ajustar nivel c y comparar máximo, mínimo y silla.
- **Cálculo y criterio de corrección:** Reconocer patrón geométrico de extremos locales.

#### GFX-113 · Hessiano como deformación local `P1`
- **Qué se ve / movimiento:** Parche parabólico cambia al modificar autovalores del Hessiano.
- **Qué manipula el estudiante:** Sliders de curvaturas principales y rotación.
- **Cálculo y criterio de corrección:** Verificar definido positivo, negativo o indefinido.

#### GFX-114 · Región compacta con frontera `P0`
- **Qué se ve / movimiento:** Superficie colorea máximos/mínimos interiores y sobre borde.
- **Qué manipula el estudiante:** Arrastrar contorno de dominio.
- **Cálculo y criterio de corrección:** Recordar candidatos interiores, aristas, vértices y puntos no diferenciables.

#### GFX-115 · Lagrange geométrico 2D `P0`
- **Qué se ve / movimiento:** Curva de restricción g(x,y)=c toca una curva de nivel de f.
- **Qué manipula el estudiante:** Mover c y parámetros de f.
- **Cálculo y criterio de corrección:** Mostrar ∇f=λ∇g donde se cumplen condiciones de regularidad.

#### GFX-116 · Lagrange en superficie 3D `P0`
- **Qué se ve / movimiento:** Intersección entre restricción y superficie objetivo marca candidatos.
- **Qué manipula el estudiante:** Variar λ, nivel de f y cámara.
- **Cálculo y criterio de corrección:** Comparar candidatos y reconocer máximos/mínimos restringidos.

#### GFX-117 · Dos restricciones simultáneas `P2`
- **Qué se ve / movimiento:** Punto que satisface g=c y h=d se ilumina sobre una superficie.
- **Qué manipula el estudiante:** Modificar restricciones y activar normales.
- **Cálculo y criterio de corrección:** Visualizar ∇f=λ∇g+μ∇h bajo independencia adecuada.

#### GFX-118 · Trayectoria de ascenso de gradiente `P1`
- **Qué se ve / movimiento:** Partícula sigue gradiente sobre el dominio y sube en superficie.
- **Qué manipula el estudiante:** Variar paso y condición inicial.
- **Cálculo y criterio de corrección:** Señalar límites numéricos, puntos estacionarios y dependencia del paso.

#### GFX-119 · Descenso de gradiente vs Newton `P2`
- **Qué se ve / movimiento:** Dos partículas optimizan f con distintas reglas iterativas.
- **Qué manipula el estudiante:** Elegir algoritmo, paso, condición inicial.
- **Cálculo y criterio de corrección:** Comparar convergencia sin garantizar mínimo global.

#### GFX-120 · Diagrama de puntos críticos al variar parámetro `P2`
- **Qué se ve / movimiento:** Rama de extremos aparece, desaparece o cambia de tipo.
- **Qué manipula el estudiante:** Barrer parámetro a y registrar bifurcaciones.
- **Cálculo y criterio de corrección:** Verificar ecuaciones de estacionariedad y clasificación.

### 13. Áreas, sumas de Riemann e integrales dobles — U3 / semanas 10–11 — 2D/3D

#### GFX-121 · Área entre curvas con relleno vivo `P0`
- **Qué se ve / movimiento:** Región entre f(x) y g(x) se sombrea de modo dinámico.
- **Qué manipula el estudiante:** Arrastrar funciones, límites y color de cada banda.
- **Cálculo y criterio de corrección:** Recalcular intersecciones y separar subintervalos cuando cambie función superior.

#### GFX-122 · Rectángulos de Riemann movibles `P0`
- **Qué se ve / movimiento:** Rectángulos nacen y se ajustan a la curva conforme crece n.
- **Qué manipula el estudiante:** Cambiar n y extremo izquierdo, derecho o medio.
- **Cálculo y criterio de corrección:** Mostrar suma aproximada y referencia analítica o numérica bien etiquetada.

#### GFX-123 · Error de Riemann animado `P0`
- **Qué se ve / movimiento:** Gráfica auxiliar muestra error frente a n y colorea excesos/defectos.
- **Qué manipula el estudiante:** Animar n y alternar métodos de partición.
- **Cálculo y criterio de corrección:** Distinguir convergencia de exactitud en n finito.

#### GFX-124 · Barras de integrales dobles sobre región `P0`
- **Qué se ve / movimiento:** Columnas verticales de altura f(x,y) cubren dominio R.
- **Qué manipula el estudiante:** Ajustar densidad de malla y opacidad.
- **Cálculo y criterio de corrección:** Visualizar integral como volumen firmado si f toma valores negativos.

#### GFX-125 · Suma doble por mosaicos `P0`
- **Qué se ve / movimiento:** Rectángulos ΔxΔy llenan R y sostienen columnas.
- **Qué manipula el estudiante:** Elegir m,n, muestras y reproducir refinamiento.
- **Cálculo y criterio de corrección:** Comparar suma de Riemann doble con valor de referencia.

#### GFX-126 · Región tipo I con límites móviles `P0`
- **Qué se ve / movimiento:** Rebanadas verticales atraviesan R entre g1(x) y g2(x).
- **Qué manipula el estudiante:** Deslizar x y mostrar extremos en y.
- **Cálculo y criterio de corrección:** Construir ∫_a^b∫_{g1(x)}^{g2(x)}f dy dx.

#### GFX-127 · Región tipo II con límites móviles `P0`
- **Qué se ve / movimiento:** Rebanadas horizontales recorren R entre h1(y) y h2(y).
- **Qué manipula el estudiante:** Deslizar y y mostrar extremos en x.
- **Cálculo y criterio de corrección:** Construir integral con orden dx dy.

#### GFX-128 · Animación de integración iterada `P1`
- **Qué se ve / movimiento:** Primero se integran tiras y luego se acumula el resultado externo.
- **Qué manipula el estudiante:** Reproducir proceso interior/exterior en dos ritmos.
- **Cálculo y criterio de corrección:** Relacionar integral iterada con suma de volúmenes o masa.

#### GFX-129 · Área firmada y áreas reales `P1`
- **Qué se ve / movimiento:** Bandas bajo/cima del plano z=0 cambian de color.
- **Qué manipula el estudiante:** Alternar integral con signo y ∫|f|.
- **Cálculo y criterio de corrección:** Evitar confundir volumen firmado con volumen geométrico.

#### GFX-130 · Densidad variable y centro de masa `P1`
- **Qué se ve / movimiento:** Lámina coloreada por ρ(x,y) muestra centroide que se mueve.
- **Qué manipula el estudiante:** Cambiar densidad y forma de R.
- **Cálculo y criterio de corrección:** Calcular masa y momentos con límites de integración.

### 14. Cambio de orden, coordenadas polares y jacobianos — U3 / semanas 10–12 — 2D/3D

#### GFX-131 · Cambio de orden paso a paso `P0`
- **Qué se ve / movimiento:** Una región muestra tiras verticales que giran a horizontales.
- **Qué manipula el estudiante:** Botón cambiar dxdy↔dydx y mover la rebanada.
- **Cálculo y criterio de corrección:** Reconstruir límites correctos y partir dominio si es necesario.

#### GFX-132 · Región en forma de L o dividida `P0`
- **Qué se ve / movimiento:** Dos colores muestran por qué hay que sumar integrales.
- **Qué manipula el estudiante:** Alterar fronteras y elegir dirección de barrido.
- **Cálculo y criterio de corrección:** No inventar un único intervalo interior cuando la región no es simple.

#### GFX-133 · Rebanadas en región circular `P1`
- **Qué se ve / movimiento:** Secciones verticales y horizontales comparan raíces de circunferencia.
- **Qué manipula el estudiante:** Mover x,y y visualizar ±√(R²−x²).
- **Cálculo y criterio de corrección:** Comprobar cotas y simetría.

#### GFX-134 · Sector polar con anillos `P0`
- **Qué se ve / movimiento:** Se colorean pequeños sectores de radio r y grosor dr.
- **Qué manipula el estudiante:** Variar r y θ, refinar partición.
- **Cálculo y criterio de corrección:** Derivar área elemental r dr dθ geométricamente.

#### GFX-135 · Deformación de cuadrícula con jacobiano `P0`
- **Qué se ve / movimiento:** Celda cuadrada en (u,v) se convierte en paralelogramo local en (x,y).
- **Qué manipula el estudiante:** Mover celda y parámetros de transformación.
- **Cálculo y criterio de corrección:** Comparar áreas mediante |det J|.

#### GFX-136 · Orientación del jacobiano `P1`
- **Qué se ve / movimiento:** Flecha de orientación invierte sentido cuando det J cambia de signo.
- **Qué manipula el estudiante:** Manipular transformación afín o polar.
- **Cálculo y criterio de corrección:** Separar orientación del factor positivo de área |det J|.

#### GFX-137 · Transformaciones no inyectivas `P1`
- **Qué se ve / movimiento:** Dos sectores del dominio pueden mapearse sobre la misma región final.
- **Qué manipula el estudiante:** Cambiar rango angular y observar solapamiento.
- **Cálculo y criterio de corrección:** Advertir necesidad de inyectividad o contar multiplicidades.

#### GFX-138 · Mapa de límites transformados `P1`
- **Qué se ve / movimiento:** Fronteras originales se trazan simultáneamente en espacios xy y uv.
- **Qué manipula el estudiante:** Arrastrar curvas de borde.
- **Cálculo y criterio de corrección:** Mostrar desigualdades equivalentes y jacobiano.

#### GFX-139 · Concentración por cambio de variable `P2`
- **Qué se ve / movimiento:** Densidad escalar cambia bajo deformación de área con mapa de color.
- **Qué manipula el estudiante:** Variar factor de escala y observar masa total.
- **Cálculo y criterio de corrección:** Verificar conservación de integral con jacobiano correcto.

#### GFX-140 · Cambio de orden de región triangular `P0`
- **Qué se ve / movimiento:** Un triángulo muestra animación de dos integraciones equivalentes.
- **Qué manipula el estudiante:** Elegir vértices y orden.
- **Cálculo y criterio de corrección:** Resolver límites de ambos órdenes y señalar orientación de desigualdades.

### 15. Integrales triples, sólidos y cuerpos de revolución — U3 / semanas 11–12 — 3D

#### GFX-141 · Región de integración tridimensional translúcida `P0`
- **Qué se ve / movimiento:** Sólido E aparece entre superficies con bordes resaltados.
- **Qué manipula el estudiante:** Girar cámara y cambiar opacidad por capa.
- **Cálculo y criterio de corrección:** Identificar dominio correcto para ∭_E f dV.

#### GFX-142 · Rebanado por planos sucesivos `P0`
- **Qué se ve / movimiento:** Planos x=c, y=c o z=c cortan el cuerpo con secciones coloreadas.
- **Qué manipula el estudiante:** Mover posición y dirección del corte.
- **Cálculo y criterio de corrección:** Relacionar sección con límites internos de integral triple.

#### GFX-143 · Cubitos de suma triple `P1`
- **Qué se ve / movimiento:** Voxeles se multiplican al aumentar divisiones nx,ny,nz.
- **Qué manipula el estudiante:** Animar refinamiento y seleccionar muestra.
- **Cálculo y criterio de corrección:** Mostrar ΔV y suma aproximante de f(x,y,z).

#### GFX-144 · Conversión cilindro-cartesiana `P0`
- **Qué se ve / movimiento:** Un cilindro colorea radial y angularmente su volumen mientras se deforma la malla.
- **Qué manipula el estudiante:** Variar r,θ,z y los límites.
- **Cálculo y criterio de corrección:** Enseñar dV=r dr dθ dz con orientación.

#### GFX-145 · Conversión esfera-cartesiana `P0`
- **Qué se ve / movimiento:** Una esfera se llena por capas radiales y gajos angulares.
- **Qué manipula el estudiante:** Variar ρ,φ,θ y girar cámara.
- **Cálculo y criterio de corrección:** Enseñar jacobiano ρ²sinφ y límites convencionales.

#### GFX-146 · Sólido de revolución con barrido 0→3π `P0`
- **Qué se ve / movimiento:** Región 2D gira alrededor de eje y deja un volumen 3D acumulado.
- **Qué manipula el estudiante:** Deslizar ángulo, pausar en π,2π,3π y elegir eje.
- **Cálculo y criterio de corrección:** Mostrar saturación de la unión después de una vuelta cuando la geometría lo justifique.

#### GFX-147 · Discos y arandelas móviles `P0`
- **Qué se ve / movimiento:** Plano perpendicular al eje muestra radios interior/exterior y sección real.
- **Qué manipula el estudiante:** Mover x o y y cambiar eje.
- **Cálculo y criterio de corrección:** Verificar A=π(R²−r²), incluido caso que cruza el eje.

#### GFX-148 · Cascarones cilíndricos transparentes `P0`
- **Qué se ve / movimiento:** Cascarón móvil se extrae y gira alrededor del eje.
- **Qué manipula el estudiante:** Arrastrar radio y espesor.
- **Cálculo y criterio de corrección:** Verificar elemento 2π·radio·altura·espesor y condiciones geométricas.

#### GFX-149 · Volúmenes con huecos y agujeros `P1`
- **Qué se ve / movimiento:** Cuerpo hueco revela interior al activar corte o vista explotada.
- **Qué manipula el estudiante:** Cambiar función interior, exterior y transparencia.
- **Cálculo y criterio de corrección:** Distinguir volumen anular de sólido macizo.

#### GFX-150 · Centro de masa e inercia 3D `P2`
- **Qué se ve / movimiento:** Marcador de centro de masa y ejes de inercia aparecen en cuerpo de densidad variable.
- **Qué manipula el estudiante:** Variar ρ(x,y,z) y geometría.
- **Cálculo y criterio de corrección:** Calcular masa, momentos e integrales triples con unidades.

### 16. Campos vectoriales y animaciones de flujo — U2–U3 / semanas 13–14 — 2D/3D

#### GFX-151 · Campo de flechas 2D animado `P0`
- **Qué se ve / movimiento:** Flechas F(x,y) cambian de orientación, magnitud y color.
- **Qué manipula el estudiante:** Slider de parámetros y densidad.
- **Cálculo y criterio de corrección:** Mostrar F en punto elegido y distinguir tamaño visual normalizado de magnitud real.

#### GFX-152 · Campo de flechas 3D `P0`
- **Qué se ve / movimiento:** Flechas orientadas flotan en una caja espacial.
- **Qué manipula el estudiante:** Variar densidad, volumen de inspección y plano de corte.
- **Cálculo y criterio de corrección:** Mostrar F(x,y,z) sin saturación visual.

#### GFX-153 · Partícula arrastrada por un campo `P0`
- **Qué se ve / movimiento:** Una partícula sigue dr/dt=F(r) y deja traza.
- **Qué manipula el estudiante:** Elegir semilla, dt, método numérico y duración.
- **Cálculo y criterio de corrección:** Diferenciar línea integral del campo y curva parametrizada arbitraria.

#### GFX-154 · Líneas de corriente de múltiples semillas `P0`
- **Qué se ve / movimiento:** Filamentos nacen de varias semillas y recorren el campo.
- **Qué manipula el estudiante:** Añadir/mover semillas y ajustar integración.
- **Cálculo y criterio de corrección:** Verificar campo tangente a cada trayectoria regular.

#### GFX-155 · Campo radial fuente y sumidero `P0`
- **Qué se ve / movimiento:** Flechas surgen o convergen a origen con partículas visibles.
- **Qué manipula el estudiante:** Cambiar intensidad, signo y distancia.
- **Cálculo y criterio de corrección:** Relacionar orientación del campo con fuente/sumidero y singularidades.

#### GFX-156 · Campo rotacional en remolino `P0`
- **Qué se ve / movimiento:** Partículas describen órbitas y se colorean por velocidad tangencial.
- **Qué manipula el estudiante:** Cambiar intensidad y radio.
- **Cálculo y criterio de corrección:** Visualizar giro local sin igualarlo automáticamente al rotacional en todo punto.

#### GFX-157 · Divergencia con pequeña caja `P0`
- **Qué se ve / movimiento:** Cubito se expande o comprime según flujo neto cercano.
- **Qué manipula el estudiante:** Desplazar caja y ajustar tamaño.
- **Cálculo y criterio de corrección:** Relacionar divergencia y flujo saliente por unidad de volumen.

#### GFX-158 · Rotacional con ruedita local `P0`
- **Qué se ve / movimiento:** Aspa flotante gira según componente del rotacional alrededor del eje.
- **Qué manipula el estudiante:** Cambiar posición y dirección del eje.
- **Cálculo y criterio de corrección:** Asociar rotación local con curl y convenciones de signo.

#### GFX-159 · Plano de corte de campo 3D `P1`
- **Qué se ve / movimiento:** Rebanada 2D muestra vectores proyectados de un campo 3D.
- **Qué manipula el estudiante:** Desplazar plano y alternar componentes normales/tangenciales.
- **Cálculo y criterio de corrección:** Comparar campo completo con proyecciones.

#### GFX-160 · Mapa de rapidez y trayectorias `P1`
- **Qué se ve / movimiento:** Color indica |F| y partículas avanzan según flujo de referencia.
- **Qué manipula el estudiante:** Ajustar escala de color y cantidad de semillas.
- **Cálculo y criterio de corrección:** Distinguir magnitud del campo de colores meramente decorativos.

### 17. Integrales de línea, trabajo y campos conservativos — U3 / semana 13 — 2D/3D

#### GFX-161 · Trayectoria orientada con partícula `P0`
- **Qué se ve / movimiento:** Curva C muestra flechas pequeñas de orientación mientras móvil la recorre.
- **Qué manipula el estudiante:** Invertir sentido y cambiar parametrización.
- **Cálculo y criterio de corrección:** Mostrar que orientación afecta ∫F·dr pero no ∫f ds.

#### GFX-162 · Campo aplicado al móvil `P0`
- **Qué se ve / movimiento:** Flecha F(r(t)) acompaña partícula y otra muestra r'(t).
- **Qué manipula el estudiante:** Mostrar ángulo y producto escalar instantáneo.
- **Cálculo y criterio de corrección:** Calcular integrando F(r(t))·r'(t).

#### GFX-163 · Trabajo acumulado en color `P0`
- **Qué se ve / movimiento:** La curva cambia de color según trabajo positivo o negativo acumulado.
- **Qué manipula el estudiante:** Pausar y leer W(t)=∫F·dr hasta t.
- **Cálculo y criterio de corrección:** Relacionar energía/trabajo con orientación e integrando con signo.

#### GFX-164 · Integral escalar de longitud `P0`
- **Qué se ve / movimiento:** Pequeños segmentos ds avanzan y acumulan densidad escalar f(r(t)).
- **Qué manipula el estudiante:** Elegir f y curva con slider de t.
- **Cálculo y criterio de corrección:** Construir ∫C f ds con factor |r'|.

#### GFX-165 · Integral vectorial por segmentos `P1`
- **Qué se ve / movimiento:** Secciones cortas muestran contribuciones F·Δr como barras firmadas.
- **Qué manipula el estudiante:** Aumentar número de segmentos.
- **Cálculo y criterio de corrección:** Comparar suma discreta con integral de línea convergente.

#### GFX-166 · Inversión de orientación interactiva `P0`
- **Qué se ve / movimiento:** Un botón hace regresar la partícula sobre la misma curva.
- **Qué manipula el estudiante:** Elegir orientación y conservar campo.
- **Cálculo y criterio de corrección:** Verificar signo opuesto del trabajo y misma integral escalar cuando corresponda.

#### GFX-167 · Campo conservativo con potencial `P0`
- **Qué se ve / movimiento:** Curvas equipotenciales y flecha ∇φ se superponen a trayectoria.
- **Qué manipula el estudiante:** Cambiar extremos manteniendo φ y elegir caminos.
- **Cálculo y criterio de corrección:** Comprobar trabajo igual a φ(B)−φ(A) bajo hipótesis adecuadas.

#### GFX-168 · Dos caminos entre los mismos puntos `P0`
- **Qué se ve / movimiento:** Dos partículas siguen rutas distintas de A a B.
- **Qué manipula el estudiante:** Diseñar caminos y comparar trabajo.
- **Cálculo y criterio de corrección:** Mostrar independencia de trayectoria en dominio apropiado, no solo curl cero local.

#### GFX-169 · Recorrido cerrado y circulación `P0`
- **Qué se ve / movimiento:** Una partícula da una vuelta sobre curva cerrada; medidor acumula ∮F·dr.
- **Qué manipula el estudiante:** Modificar orientación y campo.
- **Cálculo y criterio de corrección:** Diferenciar circulación nula por conservatividad de caso no conservativo.

#### GFX-170 · Obstáculos y dominio perforado `P1`
- **Qué se ve / movimiento:** Curvas rodean un agujero con campo definido fuera del origen.
- **Qué manipula el estudiante:** Mover lazo para rodear o no el agujero.
- **Cálculo y criterio de corrección:** Mostrar por qué curl=0 fuera de singularidad no basta para potencial global.

### 18. Teorema de Green, circulación y flujo en el plano — U3–U4 / semana 15 — 2D

#### GFX-171 · Borde orientado y región rellena `P0`
- **Qué se ve / movimiento:** Contorno recorre positivamente región plana con flechas de borde.
- **Qué manipula el estudiante:** Invertir recorrido, modificar región y ver sentido antihorario.
- **Cálculo y criterio de corrección:** Definir orientación positiva antes de comparar integrales.

#### GFX-172 · Partícula que recorre ∂D `P0`
- **Qué se ve / movimiento:** Móvil marca cada tramo de un contorno poligonal o curvo.
- **Qué manipula el estudiante:** Elegir punto inicial y animar lados.
- **Cálculo y criterio de corrección:** Evitar saltos entre aristas y respetar orientación global.

#### GFX-173 · Circulación frente a rotacional `P0`
- **Qué se ve / movimiento:** Flechas tangentes del campo en borde y mapa de curl dentro.
- **Qué manipula el estudiante:** Alternar vista de borde y área.
- **Cálculo y criterio de corrección:** Comparar ∮(P dx+Q dy) con ∬(Q_x−P_y)dA bajo hipótesis.

#### GFX-174 · Green por subdivisión de celdas `P0`
- **Qué se ve / movimiento:** La región se cuadricula y las circulaciones internas se cancelan visualmente.
- **Qué manipula el estudiante:** Refinar rejilla y mostrar aristas compartidas.
- **Cálculo y criterio de corrección:** Motivar cancelación de fronteras internas.

#### GFX-175 · Green: forma de flujo `P0`
- **Qué se ve / movimiento:** Normales exteriores al contorno se dibujan y campo las cruza.
- **Qué manipula el estudiante:** Cambiar sentido y activar componente normal.
- **Cálculo y criterio de corrección:** Comparar flujo exterior con ∬div F dA en 2D.

#### GFX-176 · Anillo con orientación de dos bordes `P0`
- **Qué se ve / movimiento:** Región anular tiene borde exterior CCW e interior CW.
- **Qué manipula el estudiante:** Variar radios, ocultar/mostrar borde interior.
- **Cálculo y criterio de corrección:** Verificar orientación correcta y condiciones de Green en región perforada.

#### GFX-177 · Partición de región no convexa `P1`
- **Qué se ve / movimiento:** Área se divide en subregiones para aplicar Green por partes.
- **Qué manipula el estudiante:** Arrastrar líneas de división.
- **Cálculo y criterio de corrección:** Mostrar cancelación de bordes internos y continuidad del contorno.

#### GFX-178 · Campo con singularidad interna `P0`
- **Qué se ve / movimiento:** Se resalta un punto excluido y se advierte si se atraviesa.
- **Qué manipula el estudiante:** Mover singularidad o contorno.
- **Cálculo y criterio de corrección:** No aplicar Green directamente cuando el campo no está definido en la región.

#### GFX-179 · Comparador de ambas integrales `P0`
- **Qué se ve / movimiento:** Dos contadores numéricos actualizan valor de borde y valor de área.
- **Qué manipula el estudiante:** Variar campo, región y orientación.
- **Cálculo y criterio de corrección:** Mostrar diferencia numérica con precisión declarada, sin llamar prueba al muestreo.

#### GFX-180 · Circulación y vorticidad local `P1`
- **Qué se ve / movimiento:** Rueditas interiores giran mientras partícula recorre borde.
- **Qué manipula el estudiante:** Seleccionar celdas y ver curl.
- **Cálculo y criterio de corrección:** Relacionar suma de rotaciones locales con circulación total.

### 19. Superficies parametrizadas, área y flujo de superficie — U4 / semana 14 — 3D

#### GFX-181 · Superficie r(u,v) desplegable `P0`
- **Qué se ve / movimiento:** Retícula paramétrica construye superficie desde pares (u,v).
- **Qué manipula el estudiante:** Mover u,v y cambiar dominios.
- **Cálculo y criterio de corrección:** Mostrar r_u, r_v y puntos correspondientes.

#### GFX-182 · Vectores tangentes r_u y r_v `P0`
- **Qué se ve / movimiento:** Flechas móviles generan plano tangente en punto de superficie.
- **Qué manipula el estudiante:** Arrastrar punto en espacio de parámetros.
- **Cálculo y criterio de corrección:** Distinguir tangentes de un marco ortonormal.

#### GFX-183 · Normal por producto cruz `P0`
- **Qué se ve / movimiento:** Flecha r_u×r_v cambia orientación y longitud.
- **Qué manipula el estudiante:** Invertir orden de parámetros.
- **Cálculo y criterio de corrección:** Mostrar efecto del signo sobre orientación y magnitud |r_u×r_v|.

#### GFX-184 · Paralelogramo diferencial dS `P0`
- **Qué se ve / movimiento:** Pequeña celda uv se transforma en parche sobre superficie.
- **Qué manipula el estudiante:** Reducir Δu y Δv.
- **Cálculo y criterio de corrección:** Visualizar dS=|r_u×r_v|du dv.

#### GFX-185 · Orientación de superficie y lado activo `P0`
- **Qué se ve / movimiento:** Normales de superficie se invierten con un botón.
- **Qué manipula el estudiante:** Elegir orientación saliente/entrante.
- **Cálculo y criterio de corrección:** Mostrar cambio de signo de flujo sin alterar área.

#### GFX-186 · Flujo de campo a través de parche `P0`
- **Qué se ve / movimiento:** Flechas F atraviesan superficie y se descomponen normal/tangencial.
- **Qué manipula el estudiante:** Cambiar campo y punto de muestra.
- **Cálculo y criterio de corrección:** Mostrar F·(r_u×r_v) y aportes positivos/negativos.

#### GFX-187 · Mosaico de flujo superficial `P0`
- **Qué se ve / movimiento:** Parches colorean signo y magnitud de flujo local y se acumulan.
- **Qué manipula el estudiante:** Refinar resolución y barrer parámetros.
- **Cálculo y criterio de corrección:** Aproximar ∬S F·n dS con estimación de calidad.

#### GFX-188 · Área de superficie por teselación `P1`
- **Qué se ve / movimiento:** Triángulos sobre la malla se hacen menores.
- **Qué manipula el estudiante:** Ajustar densidad y comparar refinamientos.
- **Cálculo y criterio de corrección:** Aproximar ∬|r_u×r_v|du dv con consistencia.

#### GFX-189 · Cambio de parametrización de superficie `P1`
- **Qué se ve / movimiento:** Misma superficie se dibuja con dos mallas uv diferentes.
- **Qué manipula el estudiante:** Alternar parametrizaciones y orientación.
- **Cálculo y criterio de corrección:** Verificar invariancia de área y efecto de orientación en flujo.

#### GFX-190 · Superficies con borde visible `P0`
- **Qué se ve / movimiento:** Curva frontera se ilumina sobre parche orientado con normal.
- **Qué manipula el estudiante:** Variar dominio paramétrico.
- **Cálculo y criterio de corrección:** Derivar geometría de ∂S y preparar Stokes.

### 20. Stokes, Gauss, Maxwell, formas diferenciales y herramientas de estudio — U4 / semanas 15–17 — 2D/3D

#### GFX-191 · Stokes: borde y rotacional superficial `P0`
- **Qué se ve / movimiento:** Curva ∂S con orientación y mapa de curl·n sobre superficie.
- **Qué manipula el estudiante:** Modificar superficie y campo sin mover el borde cuando sea posible.
- **Cálculo y criterio de corrección:** Comparar ∮∂S F·dr con ∬S(curl F)·n dS.

#### GFX-192 · Regla de la mano derecha 3D `P0`
- **Qué se ve / movimiento:** Mano/esquema orientador relaciona normal con sentido de la frontera.
- **Qué manipula el estudiante:** Invertir normal y observar orientación del borde.
- **Cálculo y criterio de corrección:** Mostrar coherencia de signos en Stokes.

#### GFX-193 · Stokes con dos superficies mismo borde `P1`
- **Qué se ve / movimiento:** Dos superficies transparentes comparten contorno y comparan flujo del rotacional.
- **Qué manipula el estudiante:** Alternar disco, casquete u otra superficie válida.
- **Cálculo y criterio de corrección:** Comprobar igualdad bajo hipótesis y orientación compatibles.

#### GFX-194 · Teorema de divergencia sobre volumen `P0`
- **Qué se ve / movimiento:** Flechas atraviesan una superficie cerrada y colorean flujo saliente.
- **Qué manipula el estudiante:** Variar cuerpo y campo.
- **Cálculo y criterio de corrección:** Comparar ∯∂E F·n dS con ∭E div F dV.

#### GFX-195 · Flujo en caras de caja `P0`
- **Qué se ve / movimiento:** Cada cara muestra aporte de flujo y una barra de suma.
- **Qué manipula el estudiante:** Cambiar tamaño, posición y campo.
- **Cálculo y criterio de corrección:** Demostrar cancelación local en discretización de un volumen.

#### GFX-196 · Fuentes y sumideros tridimensionales `P1`
- **Qué se ve / movimiento:** Partículas salen o entran de volumen con color según div F.
- **Qué manipula el estudiante:** Mover la caja de inspección.
- **Cálculo y criterio de corrección:** Interpretar signo de divergencia y relacionarlo con flujo neto.

#### GFX-197 · Campo electromagnético animado `P2`
- **Qué se ve / movimiento:** Flechas E y B oscilan en una visualización didáctica de onda electromagnética.
- **Qué manipula el estudiante:** Cambiar fase, dirección y amplitud.
- **Cálculo y criterio de corrección:** Indicar qué ecuaciones de Maxwell simplificadas satisface el ejemplo; no simular física arbitraria.

#### GFX-198 · Circulación y flujo en Maxwell `P2`
- **Qué se ve / movimiento:** Un lazo y una superficie evidencian términos de circulación y flujo cambiantes.
- **Qué manipula el estudiante:** Animar campo y tiempo.
- **Cálculo y criterio de corrección:** Conectar fórmulas integrales sin confundir los teoremas con una prueba experimental.

#### GFX-199 · Formas diferenciales 1 y 2 como geometría `P2`
- **Qué se ve / movimiento:** Pequeñas bandas orientadas y plaquetas representan 1-formas y 2-formas.
- **Qué manipula el estudiante:** Arrastrar al punto y cambiar base local.
- **Cálculo y criterio de corrección:** Visualizar evaluación de forma sobre vectores y cambio de orientación.

#### GFX-200 · Stokes generalizado por dimensión `P2`
- **Qué se ve / movimiento:** Diagramas enlazados de intervalo, disco, superficie y volumen muestran ∫∂Mω=∫M dω.
- **Qué manipula el estudiante:** Cambiar k y ver el par frontera-interior correspondiente.
- **Cálculo y criterio de corrección:** Relacionar teorema fundamental del cálculo, Green, Stokes y Gauss con hipótesis.

## IV. Arquitectura para que los 200 casos no sean 200 implementaciones independientes

### IV.1. Un solo modelo de escena declarativa

El núcleo debe exponer entidades con identidad estable (`id`), tipo, dominio y dependencias. Un cambio de `t`, cámara o parámetro modifica solamente los nodos afectados:

```text
Documento BWJM
  ├─ AST + esquemas + referencias de objeto
  ├─ Estado del documento (a, b, t, θ, controles, cámara)
  ├─ Grafo de dependencias semántico (AST de expresiones, no solo regex)
  ├─ Motor matemático (dominios, derivadas, integrales, geometría, errores)
  ├─ Sistema de tiempo/animación (eventos, replay, snapshots)
  └─ SceneGraph
      ├─ Geometría: curve, particle, vector, plane, surface, region, mesh
      ├─ Objetos 2D: SVG/Canvas/WebGL según complejidad
      ├─ Objetos 3D: Plotly inicial / Three.js cuando esté implementado
      ├─ Leyendas, métricas, fórmulas y herramientas de selección
      └─ Exportación reproducible de escena y estado
```

### IV.2. Componentes reutilizables mínimos

1. **`TimelineController`:** tiempo único, `play`, `pause`, `seek`, velocidad, dirección, bucle y captura de estado.
2. **`CurveSampler`:** dominio, muestreo adaptativo, segmentos válidos y discontinuidades; separa parámetro geométrico de reloj.
3. **`ParticleOnPath`:** punto animado, posición, estela, eventos y velocidad a lo largo de `r(t)`.
4. **`MovingVector`:** flecha unida a un punto que representa velocidad, aceleración, gradiente o normal, con escala visual separada.
5. **`MovingLineOrPlane`:** tangentes, normales, secantes y planos osculadores que actualizan dirección y posición.
6. **`Region2D`:** fronteras múltiples, intersecciones y rebanadas; no asume que siempre existe una sola función superior.
7. **`Solid3D`:** malla con corte, orientación y transparencia; soporta geometrias con huecos, ejes desplazados y otros casos.
8. **`VectorFieldScene`:** evalúa el campo en una rejilla y genera trayectorias por integración ODE controlada.
9. **`LinkedViews`:** mismo estado en superficie 3D, contornos 2D, expresión y tabla.
10. **`MathResultProvenance`:** etiqueta `symbolic-exact`, `numeric-approx`, `conjectured`, `undefined`, `unsupported`, junto con método y precisión.
11. **`InteractionRecorder`:** conserva estados reproducibles, no datos privados ni acciones externas.
12. **`RenderQualityManager`:** límites de muestras, FPS adaptativo, cancelación de tareas y degradación gráfica elegante.

### IV.3. Posibles bloques de lenguaje **propuestos**, todavía NO admitidos por el parser actual

Se sugieren nombres descriptivos sin afirmar compatibilidad inmediata: `timeline`, `particle`, `movingvector`, `movingframe`, `region2d`, `riemann2d`, `revolution3d`, `vectorfield3d`, `streamlines`, `lineintegral`, `parametricsurface`, `surfaceflux`, `theoremcompare`. El AST debe validar referencias cruzadas, expresiones, orientación y unidades.

**Prototipo conceptual: partícula en hélice espacial.** El siguiente ejemplo es *sintaxis objetivo*, no un archivo ejecutable hoy en BWJM:

````bwjm
```curve3d
id: helice
x: cos(t)
y: sin(t)
z: t/3
t: [0, 18.8495559215]   # 6*pi, rango numérico compatible como base
```

```timeline
id: reloj
variable: t
min: 0
max: 18.8495559215
seconds: 12
loop: true
showControls: true
```

```particle
id: particula
path: helice
timeline: reloj
showTrail: true
showCoordinates: true
```

```movingframe
path: helice
particle: particula
show: [position, velocity, acceleration, tangent, normal, binormal]
scaleMode: visual-normalized
```
````

**Prueba matemática integrada para esa escena:**

```math
r(t) = (cos(t), sin(t), t/3)
r'(t) = (-sin(t), cos(t), 1/3)
r''(t) = (-cos(t), -sin(t), 0)
|r'(t)| = sqrt(10)/3
kappa(t) = 9/10; tau(t) = 3/10
```

Con estos valores se puede comprobar que la flecha de velocidad no desaparece, que la norma de T vale uno y que la curvatura y torsión son constantes. La capa visual puede normalizar la longitud dibujada de las flechas, pero **nunca debe reemplazar el valor físico que se muestra**.

### IV.4. Modelo de contrato para una escena

```ts
type Quality = "exact" | "approximate" | "unverified" | "undefined";
interface AnimatedSceneSpec {
  id: string;
  references: string[]; // id de curva/campo/superficie
  time?: { variable: string; min: number; max: number; mode: "parameter" | "arcLength" };
  controls: Array<{ name: string; min: number; max: number; step: number }>;
  layers: Array<{ id: string; type: string; visible: boolean }>;
  mathematicalClaims: Array<{ description: string; quality: Quality; tolerance?: number }>;
}
```

## V. Qué construir primero: ruta ejecutable de 6 incrementos

### 1. Incremento 1 — movimiento universal
- **Funciones iniciales:** GFX-001, GFX-002, GFX-003, GFX-004, GFX-005, GFX-011, GFX-061.
- **Entregable:** timeline + partícula + rastro + recta móvil 2D; controles reutilizables y exportables.
- **Criterio de salida:** ejemplo BWJM editable + prueba matemática + prueba de interfaz y regresión + documentación de límites/errores.

### 2. Incremento 2 — cinemática y 3D
- **Funciones iniciales:** GFX-062, GFX-063, GFX-065, GFX-071, GFX-073, GFX-074, GFX-075.
- **Entregable:** velocidad y aceleración adheridas a la partícula; hélice 3D y proyecciones coordinadas.
- **Criterio de salida:** ejemplo BWJM editable + prueba matemática + prueba de interfaz y regresión + documentación de límites/errores.

### 3. Incremento 3 — geometría diferencial y multivariable
- **Funciones iniciales:** GFX-081, GFX-082, GFX-083, GFX-084, GFX-087, GFX-093, GFX-113.
- **Entregable:** triedro TNB, curvatura y gradiente móvil sobre curvas de nivel.
- **Criterio de salida:** ejemplo BWJM editable + prueba matemática + prueba de interfaz y regresión + documentación de límites/errores.

### 4. Incremento 4 — integración y volúmenes
- **Funciones iniciales:** GFX-131, GFX-132, GFX-136, GFX-137, GFX-141, GFX-146, GFX-156, GFX-157.
- **Entregable:** áreas sombreadas, Riemann, doble integral, cambio de orden, giro y arandelas.
- **Criterio de salida:** ejemplo BWJM editable + prueba matemática + prueba de interfaz y regresión + documentación de límites/errores.

### 5. Incremento 5 — campos e integrales de línea
- **Funciones iniciales:** GFX-161, GFX-163, GFX-164, GFX-171, GFX-172, GFX-173, GFX-177.
- **Entregable:** partículas advectadas, líneas de corriente, trabajo y campos conservativos.
- **Criterio de salida:** ejemplo BWJM editable + prueba matemática + prueba de interfaz y regresión + documentación de límites/errores.

### 6. Incremento 6 — teoremas y superficies
- **Funciones iniciales:** GFX-181, GFX-183, GFX-193, GFX-195, GFX-196, GFX-197, GFX-191, GFX-194.
- **Entregable:** Green, orientaciones, flujo superficial, Stokes y Gauss; vistas comparativas.
- **Criterio de salida:** ejemplo BWJM editable + prueba matemática + prueba de interfaz y regresión + documentación de límites/errores.

### Orden urgente por la programación del curso

Según la programación del sílabo 2026–2: semana 13 (9–14 de noviembre) aborda campos, integrales de línea y campos conservativos; semana 14 (16–21 de noviembre), superficies parametrizadas e integrales de superficie; semana 15 (23–28 de noviembre), Green y Stokes. Por cercanía curricular se recomienda un **prototipo temprano de los bloques 16–19**, aun cuando la plataforma de animaciones se construya primero.

## VI. Matriz de pruebas obligatorias: 30 escenarios, no solo imágenes

| ID | Escenario | Resultado o comportamiento que se debe comprobar |
|---|---|---|
| Q01 | Partícula en parábola r(t)=(t,t²) | En t=2, posición (2,4), velocidad (1,4), aceleración (0,2). |
| Q02 | Circunferencia uniforme r(t)=(cos t,sin t) | |v|=1, v·r=0, la estela se cierra en 2π. |
| Q03 | Circunferencia con reparametrización t=s² | Misma curva, distinta rapidez; sin desfase geométrico. |
| Q04 | Hélice r(t)=(cos t,sin t,t/3) | |v|=√10/3, κ=9/10, τ=3/10 para todo t regular. |
| Q05 | Punto estacionario r(t)=(t²,t³), t=0 | No fabricar T,N,B únicos si r’(0)=0. |
| Q06 | Tangente a y=x² en x=1 | Pendiente 2 y recta y−1=2(x−1). |
| Q07 | Elipse centro (0,0), ejes a,b | Distancias focales suman 2a en los puntos de la elipse. |
| Q08 | Plano por tres puntos colineales | Se rechaza plano único y se explica por qué. |
| Q09 | Recta paralela a un plano | No inventar punto de intersección. |
| Q10 | Polar r=2cosθ | Proyección cartesiana describe círculo de centro (1,0), radio 1. |
| Q11 | Campo de nivel f=x²+y² | Curvas de nivel círculos, gradiente (2x,2y). |
| Q12 | Diferenciabilidad parcial engañosa | Parciales existentes no se certifican automáticamente como diferenciabilidad. |
| Q13 | Direccional de f=x²+y² en (1,1) | Para u=(1,0): D_u f=2. |
| Q14 | Plano tangente z=x²+y² en (1,1) | z=2x+2y−2. |
| Q15 | Lagrange f=x+y sobre x²+y²=1 | Máximo √2, mínimo −√2. |
| Q16 | Área entre x y x², 0≤x≤1 | A=1/6; aproximación distinta de prueba exacta. |
| Q17 | Área entre 1/x y 0, [-1,1] | No declarar región continua acotada ni inventar cruce en 0. |
| Q18 | Riemann para f(x)=x² en [0,1] | Las sumas de punto medio convergen a 1/3. |
| Q19 | Cambio de orden en triángulo x≥0,y≥0,x+y≤1 | Ambos órdenes representan la misma área 1/2. |
| Q20 | Jacobian polar sobre disco unitario | ∫0^{2π}∫0^1 r dr dθ=π. |
| Q21 | Integral triple sobre cubo unitario de 1 | Volumen 1 en cualquier orden válido. |
| Q22 | Giro de x≥0, 0≤y≤1 sobre eje x | Volumen del cilindro longitud 1 igual a π. |
| Q23 | Giro de región 0≤x≤1, −1≤y≤1 sobre eje x | Volumen π, radio interior 0; no 0 por cancelación incorrecta. |
| Q24 | Giro de región x a x² en [0,1] sobre eje x | Volumen 2π/15 al giro completo; no aumenta de 2π a 3π. |
| Q25 | Trabajo F=(y,−x) sobre circunferencia unitaria CCW | ∮F·dr=−2π. |
| Q26 | Campo conservativo F=(2x,2y) | Potencial φ=x²+y²; trabajo entre A,B depende de extremos. |
| Q27 | Campo F=(−y/r²,x/r²) con origen excluido | Curl local cero fuera del origen, circulación sobre círculo igual 2π. |
| Q28 | Green con P=−y/2 y Q=x/2 sobre disco unitario CCW | Circulación=área=π. |
| Q29 | Flujo de F=(x,y,z) por esfera radio R, exterior | Flujo=4πR³ y ∭div F dV=4πR³. |
| Q30 | Stokes para F=(−y/2,x/2,0) sobre disco unitario | ∮F·dr=π y ∬curl F·n dS=π con orientación compatible. |

Estas pruebas deben incluir **validación de límites, dominios, inversión de orientación, equivalencia de parametrizaciones, fallos de integración numérica, estado del documento y exportación**. Ninguna escena se considera implementada solo porque pasa una captura de pantalla.

## VII. Reglas de rigor, seguridad y experiencia

- **No inventar continuidad:** un muestreador debe separar tramos al detectar valores no finitos o saltos, y emitir aviso cuando no pueda asegurar el comportamiento.
- **No llamar «exacto» a Simpson, cuadraturas o aproximaciones por malla:** separar estimación, tolerancia y expresión simbólica comprobada.
- **Derivadas locales:** en puntos no regulares, gradientes nulos o marcos degenerados, mostrar «no definido» cuando corresponda.
- **Orientación coherente:** un único modelo de normales, producto cruz, curva frontera y convenciones para Green, Stokes y Gauss.
- **Simulación de campos:** las líneas de corriente aproximan soluciones de una EDO; mostrar paso, método, control de error y posibles singularidades.
- **Conservar la geometría al repetir una vuelta:** de 2π a 3π la trayectoria continúa, pero el conjunto geométrico ya barrido no debe duplicarse; las rotaciones parciales pueden tener solapamientos.
- **Modo accesible:** pausa inmediata, navegación por teclado, reducción de movimiento, descripción textual de cambios y representación de datos alternativa.
- **Rendimiento adaptable:** limitar densidad de malla y FPS según dispositivo; no prometer 60 FPS en toda máquina ni recalcular todo si cambia solo la cámara.
- **Archivos seguros:** bloques declarativos validados, prohibición de ejecución arbitraria, límites de cómputo y sin descargas automáticas.
- **Exportación reproducible:** guardar versión de formato, escenario, ecuaciones, parámetros, convenciones, unidades y precisiones.
- **UI sin resultados ajenos a la escena:** no mostrar un panel genérico de x versus x² bajo un documento sobre otro problema.
- **Pruebas visuales y matemáticas independientes:** pixel regression verifica apariencia; identidades, propiedades y límites verifican matemáticas.

## VIII. Recomendación final

Las 200 funcionalidades **no deben convertirse en 200 componentes gigantes**. La estrategia es desarrollar un pequeño conjunto de primitivas (curva, partícula, flecha, plano, campo, región, malla y línea temporal) y construir con ellas escenas de Cálculo Vectorial. La primera demostración pública convincente sería: **cargar un archivo `.bwjm`, editar `r(t)`, ver moverse la partícula sobre la curva 3D, observar T/N/B, cambiar velocidad y comprobar que las fórmulas y las proyecciones responden al mismo tiempo.**

### Fuentes documentales y distinción de evidencia

- **[Código revisado]** GitHub [repositorio](https://github.com/BlackWolfJM/BWJM), commit [`0180b9600205f71df78cae6562d6c5c555967cb2`](https://github.com/BlackWolfJM/BWJM/commit/0180b9600205f71df78cae6562d6c5c555967cb2); lectura de [`ast`](https://github.com/BlackWolfJM/BWJM/blob/0180b9600205f71df78cae6562d6c5c555967cb2/packages/ast/src/index.ts), [`parser`](https://github.com/BlackWolfJM/BWJM/blob/0180b9600205f71df78cae6562d6c5c555967cb2/packages/parser/src/index.ts), [`core`](https://github.com/BlackWolfJM/BWJM/blob/0180b9600205f71df78cae6562d6c5c555967cb2/packages/core/src/index.ts), [`math`](https://github.com/BlackWolfJM/BWJM/blob/0180b9600205f71df78cae6562d6c5c555967cb2/packages/math/src/mathEngine.ts), [`playground`](https://github.com/BlackWolfJM/BWJM/blob/0180b9600205f71df78cae6562d6c5c555967cb2/apps/playground/src/main.tsx), [`SVG`](https://github.com/BlackWolfJM/BWJM/blob/0180b9600205f71df78cae6562d6c5c555967cb2/packages/renderer-svg/src/svgRenderer.ts), [`Plotly`](https://github.com/BlackWolfJM/BWJM/blob/0180b9600205f71df78cae6562d6c5c555967cb2/packages/renderer-plotly/src/plotlyRenderer.ts) y funciones de integración.
- **[Sílabo del usuario]** `SILABO ─ CÁLCULO VECTORIAL PARA INGENIERÍA ─ 2026 ─ 2 [V.1] (1).pdf`: unidades 1–4 (página impresa 2), cronograma detallado (páginas impresas 6–10).
- **[Propuesta de diseño]** Todos los bloques `GFX-001` a `GFX-200`, las interfaces `TimelineController`/`SceneGraph` y la sintaxis futura de `timeline`, `particle`, `movingframe`, etc. No se atribuyen al repositorio como características ya implementadas.
- **[Limitación]** No se ejecutó la aplicación en un navegador ni las escenas propuestas; el estado del CI proviene del resultado registrado en GitHub para el commit revisado.
