# Verificación de implementación — BWJM y las 200 funcionalidades gráficas

**Repositorio:** https://github.com/BlackWolfJM/BWJM  
**Revisión:** rama `main`, commit `6604eb41e6d0847d11ca62cf32500c6838287a0f` (2026-11-08, horario de Lima; GitHub lo fecha 2026-11-09 01:10 UTC).  
**Base de comparación:** `0180b9600205f71df78cae6562d6c5c555967cb2`.  
**Cambio observado:** 1 commit nuevo, 10 archivos cambiados.  
**Método:** comparación GitHub de commits, revisión de fuentes, pruebas añadidas y estado de GitHub Actions; **no** se realizó una prueba visual manual del navegador. 

## Veredicto

**Implementación parcial, con avances verificables.** Se aplicó una primera fase de las propuestas relacionadas con cálculo vectorial: cinemática de trayectorias 3D, partícula móvil, vectores velocidad/aceleración y triedro T/N/B, visualización de campos 2D y cálculos numéricos de trabajo. **No se implementaron las 200 funcionalidades** ni existe evidencia en este commit de un motor universal de animaciones para todas las escenas.

La ejecución de CI para el commit nuevo está **aprobada**, con instalación, lint, typecheck, tests y build completados: https://github.com/BlackWolfJM/BWJM/actions/runs/42544205753

**Comparación verificable:** https://github.com/BlackWolfJM/BWJM/compare/0180b9600205f71df78cae6562d6c5c555967cb2...6604eb41e6d0847d11ca62cf32500c6838287a0f

## Cambios aplicados, con evidencia

| Área propuesta | Estado | Evidencia | Qué significa realmente |
|---|---|---|---|
| Importación del catálogo de 200 ideas | Documentado | `BWJM_200_FUNCIONALIDADES_GRAFICAS_ANIMADAS_CALCULO_VECTORIAL.md`, archivo añadido en el commit | La lista está en el repo; agregarla **no implementa** sus 200 puntos. |
| Auditoría del curso | Documentado | `AUDITORIA_BWJM_AMPLIADA_CALCULO_VECTORIAL_2026-2.md`, archivo añadido | Se conserva el plan curricular dentro del repo. |
| Motor de cinemática de curva r(t) | Implementación nueva | `packages/math/src/vectorCalculus.ts`, `computeKinematics()` | Posición, velocidad, aceleración, rapidez, tangente, normal, binormal, curvatura, torsión y radio osculador mediante diferencias finitas. |
| Muestreo de trayectoria paramétrica 2D/3D | Implementación nueva | `sampleParametricTrajectory()` | Devuelve puntos para dibujar curvas paramétricas. |
| Campo vectorial 2D con divergencia y rotacional | Implementación nueva | `sampleVectorField2D()` | Muestrea flechas y evalúa derivadas numéricas; la detección de conservatividad se declara aproximada. |
| Integral de línea para trabajo | Implementación nueva | `computeLineIntegral()` | Aproxima numéricamente trabajo, longitud y densidad media en curvas parametrizadas. |
| `curve3d` visible en el estudio | Integrado | `apps/playground/src/main.tsx` (render de `curve3d`) y `packages/renderer-plotly/src/plotlyRenderer.ts` (`renderCurve3D`) | Renderiza trayectoria 3D en Plotly. |
| Partícula que se mueve en la hélice | Básico implementado | `renderCurve3D()`, con `currentT` y traza `markers`; slider `t` del ejemplo | Muestra y mueve una partícula al variar `t`, incluyendo reproducción mediante el slider. |
| Velocidad y aceleración transportadas | Básico implementado | `renderCurve3D()` con `showVectors` | Dibuja segmentos desde la posición de la partícula; no hay evidencia de puntas de flecha específicas. |
| Triedro de Frenet T/N/B | Básico implementado | `renderCurve3D()` con `showTNB` | Dibuja tres segmentos móviles; cálculo basado en derivación numérica. |
| Campo `vectorfield2d` visible en Studio | Integrado | `main.tsx` usa `SVGRenderer` para ese nodo | Conecta la funcionalidad de campo ya presente en el core/SVG a la interfaz principal. |
| Asistente para curva 3D y campo 2D | Integrado | `apps/playground/src/ChartModal.tsx`, `MenuBar.tsx` | Genera bloques de sintaxis y permite insertarlos. |
| Ejemplo de Frenet y ejemplo de Green | Implementado como demostraciones | `SAMPLE_LESSONS` en `main.tsx` | Lecciones preparadas; el panel numérico de ambas tiene fórmulas fijadas en código. |
| Pruebas matemáticas de las funciones nuevas | Añadidas y ejecutadas en CI | `packages/math/__tests__/vectorCalculus.test.ts` | Casos de parábola, circunferencia, hélice, trabajo, campo y Green. |
| Prueba de render de curva 3D | Añadida y ejecutada en CI | `packages/renderer-plotly/__tests__/plotlyRenderer.test.ts` | Valida montaje de trazas; no equivale a prueba visual de animación fluida. |

## Mapeo de funcionalidades del catálogo previo (GFX)

**Aplicadas de forma básica, según el código:**
- **GFX-002 — Partícula ligada a una trayectoria:** sí para `curve3d` usando `currentT` y un slider `t`; aún no es un sistema independiente de cualquier tipo de escena.
- **GFX-061 — Partícula en hélice espacial:** sí, hay una lección de hélice 3D y un renderizador con marcador.
- **GFX-063 / GFX-064 — Vectores velocidad y aceleración 3D:** se dibujan con la partícula, sin configuración individual avanzada ni punta de flecha visible en el código revisado.
- **GFX-071 / GFX-072 / GFX-073 / GFX-074 — T, N, B y marco de Frenet móvil:** dibujo básico integrado y sincronizado con `t`; sin planos osculadores ni selección independiente de las capas.

**Parcialmente cubiertas, no equivalentes a la especificación completa:**
- **GFX-001 — Reloj global:** existe reproducción de sliders, pero no un reloj central sincronizador de cualquier escena, velocidad y fotogramas.
- **GFX-004 — Segmento móvil vinculado:** existen segmentos de T, N, B, v y a; no existe un objeto genérico de línea móvil con anclajes configurables.
- **GFX-080 — Torsión visual:** el motor calcula torsión y la lección la muestra en texto; no hay un medidor/coloreado general para todas las curvas.
- **GFX-156 — Campo rotacional:** se dibujan las flechas del ejemplo `(-y,x)`; no hay partículas que sigan líneas de corriente ni animación automática del flujo.
- **GFX-161 — Trayectoria orientada para integral de línea:** se calcula trabajo en el motor y se presenta Green en un ejemplo, pero falta un recorrido orientado con partícula y cambios de sentido que modifiquen la integral.
- **GFX-173 / GFX-179 — Comparación visual de Green:** la demostración presenta una integral de línea numérica y la fórmula del otro lado para un círculo fijo; faltan regiones y caminos arbitrarios, orientaciones manipulables y doble visualización general.

**No encontrados como implementaciones nuevas en este commit** (esto no reemplaza una auditoría línea por línea de las 200 entradas): GFX-003 estela temporal, GFX-005 animación por longitud de arco, GFX-006 fotogramas, GFX-008 vistas sincronizadas, GFX-009 comparador de movimientos, GFX-010 exportación animada, GFX-065 proyecciones simultáneas, GFX-068 cámara de seguimiento, GFX-075 círculo osculador móvil, GFX-077 gráfica κ(t) sincronizada, GFX-078 plano osculador, GFX-153 partículas arrastradas por campo, GFX-154 líneas de corriente, GFX-157 caja de divergencia, GFX-158 ruedita de rotacional, GFX-174 Green con celdas, GFX-181–189 superficies parametrizadas y flujo.

## Limitaciones importantes observadas

1. **Lecciones y paneles parcialmente codificados para casos fijos.** `apps/playground/src/main.tsx` muestra valores exactos de la hélice y del ejemplo de Green en un panel condicionado por nombres de archivo. Si se edita la función manteniendo el nombre, la interpretación y el valor exacto impresos pueden dejar de corresponder a las ecuaciones del documento.
2. **Movimiento vinculado a un slider `t`, no a una API de animación reutilizable.** `main.tsx` llama a `renderer.render` al cambiar variables y el slider reproduce con `setInterval`; no hay motor de cinemática compartido entre todas las escenas.
3. **Precisión derivativa aproximada.** `computeKinematics()` utiliza diferencias finitas de órdenes 1–3 con pasos fijos y redondea a 6 decimales. Eso es suficiente para muchas visualizaciones introductorias, pero no prueba resultados simbólicamente exactos ni garantiza estabilidad cerca de singularidades.
4. **Estacionariedad y degeneraciones geométricas.** El cálculo devuelve ceros en situaciones estacionarias y puede construir un marco auxiliar cuando `r' × r''` es casi nulo. Un marco auxiliar es útil para visualizar orientación, pero no debe rotularse como normal principal/Frenet si ésta no existe.
5. **Pruebas del navegador todavía limitadas.** CI aprobado comprueba código, tipos, tests y build, no velocidad real de animación, FPS, accesibilidad de la escena, GPU ni fidelidad geométrica de todas las combinaciones.
6. **Campo conservativo como estimación.** El motor usa un muestreo limitado de `curlAt`: no prueba conservatividad global ni topología del dominio.
7. **El renderer 3D avanzado con Three.js permanece como paquete placeholder.** Plotly ya renderiza superficies y curvas, pero no se añadió el motor complejo de simulación propuesto.
8. **No hay implementación general de las 200 ideas.** Algunas capacidades ya existían en el código anterior (gráficas SVG, superficies, áreas, Riemann y revolución) y no se deben confundir con avances de este nuevo commit.

## Próximas 10 tareas recomendadas, en este orden

1. **P0:** contratos de escena genéricos: `trajectory`, `particle`, `vectorArrow`, `frame`, `field`, `region`, `camera` y `timeline` con ID/ref.
2. **P0:** reloj compartido (play/pause/scrub/speed), vinculado a varios bloques y no solo a la presencia del parámetro `t`.
3. **P0:** parametrización y validación del panel científico a partir de objetos del documento; eliminar valores exactos hardcodeados dependientes del nombre de archivo.
4. **P0:** diferenciar **datos simbólicos**, **aproximaciones numéricas** y **situaciones matemáticas indefinidas** (`T/N/B` degenerados, discontinuidades).
5. **P0:** test de integración de UI donde la partícula y los tres vectores realmente cambien al desplazar `t` y permanezcan sobre la curva.
6. **P1:** puntas de flecha, escala física/visual separada, visibilidad de capas y leyenda de vectores.
7. **P1:** estela animada y gráfica sincronizada de κ(t), |v(t)|, torsión y aceleración.
8. **P1:** partículas que integran `dr/dt = F(r)` para campos 2D/3D, con RK4 o adaptativo y control de dominio.
9. **P1:** escena de Green general con curva orientada, región, campo y comparación numérica de ambas integrales.
10. **P2:** superficies parametrizadas, normales móviles, elemento de área, integral de flujo; después Stokes y Gauss.

## Pruebas concretas que faltan

- Editar `curve3d` en una lección, mantener el nombre y comprobar que el panel derive todo de la nueva curva, no del ejemplo fijo.
- Mover `t` desde inicio hasta final y comprobar numericamente `particle(t) = r(t)` y `T⋅N=T⋅B=N⋅B=0` en puntos regulares.
- Curva no regular: `r(t)=(t^2,t^3,0)` en `t=0`; la app debe identificar marco de Frenet indefinido, no presentar una normal “verdadera”.
- Curva sin torsión: `r(t)=(cos t,sin t,0)`; mostrar τ=0 donde existe.
- Campo `F=(-y,x)` y círculo antihorario: trabajo +2π, sentido horario −2π.
- Campo `F=(2x,2y)` en dominio simplemente conexo: curl≈0, divergencia≈4; explicar que curl≈0 en algunos puntos no basta para certificar conservatividad.
- Simular 500 cambios de `t` con Plotly y medir pérdidas de memoria, latencia y conservación de la cámara.

## Resumen

**Sí: comenzó la implementación real. No: no se han implementado las 200 funcionalidades.** El nuevo commit aporta una primera familia de visualizaciones de cinemática y campos, con pruebas y CI exitoso. La prioridad es pasar de escenas de demostración a objetos reutilizables, vinculados al documento y matemáticamente verificables.
