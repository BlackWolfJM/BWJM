# BWJM — Catálogo de 200 funcionalidades científicas (Roadmap)

> **Estado:** propuesta de desarrollo, NO 200 funciones implementadas. Revisión base: 2026-11-08. Los identificadores `SCI-001`–`SCI-200` sirven para issues, pruebas y releases.

## Principios de aceptación

- Una funcionalidad no se considera terminada hasta disponer de bloque declarativo válido, motor de cálculo, representación visible, controles accesibles, casos límite y pruebas automatizadas.
- Todo dato numérico debe declarar si es exacto, aproximado o estimado. Las visualizaciones deben respetar dominios, singularidades y orientaciones.
- El formato `.bwjm` debe ser portable, seguro, reproducible, con lectura sin conexión y exportación a formatos abiertos.
- Los objetos deben vincularse por ID, compartir controles temporales y actualizarse de manera reactiva sin duplicar reglas matemáticas.

## Estado de implementación actual

Primera entrega del PR: tipografía LaTeX, tablas y exportaciones. El lote 01 desarrolla SCI-001 a SCI-010 con alcances detallados en [LOTE_01_ANIMACION.md](LOTE_01_ANIMACION.md). SCI-007, SCI-008 y SCI-009 siguen **parciales**; los restantes están implementados en el alcance descrito. La verificación visual completa en navegador queda pendiente.

## 01. Motor visual y control

- [x] **SCI-001 · Reloj global sincronizado para escenas.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [x] **SCI-002 · Reproducción y pausa con estados reproducibles.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [x] **SCI-003 · Velocidad temporal ajustable de 0.1× a 8×.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [x] **SCI-004 · Avance cuadro a cuadro reversible.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [x] **SCI-005 · Bucle de intervalo con marcas de tiempo.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [x] **SCI-006 · Animación con rastro configurable.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-007 · Cámara de seguimiento suave.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-008 · Grabador local de secuencias en fotogramas.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-009 · Capas ocultables por tipo de objeto.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [x] **SCI-010 · Marcadores y anotaciones ligados al tiempo.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.

## 02. Gráficas 2D

- [ ] **SCI-011 · Pan y zoom con coordenadas exactas.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-012 · Puntos críticos detectables con clic.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-013 · Intersecciones entre curvas señaladas.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-014 · Recta tangente móvil con pendiente.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-015 · Recta normal móvil.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-016 · Secante que converge a tangente.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-017 · Asíntotas verticales y horizontales.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-018 · Sombreado entre curvas arbitrarias.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-019 · Dominio y discontinuidades señalados.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-020 · Exportación SVG vectorial de escena.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.

## 03. Gráficas 3D

- [ ] **SCI-021 · Superficies 3D con iluminación opcional.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-022 · Cortes horizontales de superficies.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-023 · Cortes verticales de superficies.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-024 · Rotación y cámara libre.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-025 · Ejes y unidades configurables.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-026 · Planos de nivel coloreados.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-027 · Superficies implícitas mediante isosuperficies.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-028 · Malla adaptativa cerca de singularidades.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-029 · Mapa de color por altura y gradiente.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-030 · Exportación de malla a glTF.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.

## 04. Geometría analítica

- [ ] **SCI-031 · Animación de circunferencia parametrizada.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-032 · Elipse y ejes principales dinámicos.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-033 · Parábola con foco y directriz.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-034 · Hipérbola con asíntotas móviles.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-035 · Familia de cónicas en coordenadas polares.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-036 · Transformación cartesiano-polar animada.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-037 · Distancia punto-recta medida gráficamente.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-038 · Proyección de un punto sobre plano.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-039 · Intersección de recta y plano 3D.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-040 · Ángulos entre vectores y planos.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.

## 05. Vectores

- [ ] **SCI-041 · Suma de vectores cabeza-cola.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-042 · Ley del paralelogramo interactiva.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-043 · Producto escalar y proyección.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-044 · Producto cruz con área orientada.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-045 · Producto mixto y volumen de paralelepípedo.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-046 · Vector unitario y magnitud ajustable.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-047 · Componentes en bases no ortogonales.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-048 · Rotación de vectores por matrices.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-049 · Proyección sobre subespacios.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-050 · Campos de flechas escaladas por magnitud.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.

## 06. Curvas parametrizadas

- [ ] **SCI-051 · Partícula en curva 2D arbitraria.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-052 · Partícula en curva 3D arbitraria.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-053 · Velocidad vectorial móvil.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-054 · Aceleración vectorial móvil.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-055 · Tangente unitaria móvil.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-056 · Normal principal móvil.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-057 · Binormal móvil y triedro TNB.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-058 · Plano osculador móvil.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-059 · Círculo osculador y radio dinámico.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-060 · Comparación de parametrizaciones de una curva.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.

## 07. Movimiento y cinemática

- [ ] **SCI-061 · Gráfica de rapidez contra tiempo.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-062 · Gráfica de curvatura contra tiempo.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-063 · Gráfica de torsión contra tiempo.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-064 · Descomposición aceleración tangencial-normal.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-065 · Longitud de arco acumulada animada.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-066 · Tiempo versus longitud de arco.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-067 · Detección de reposo y cúspides.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-068 · Frenado y aceleración coloreados.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-069 · Comparación de dos partículas simultáneas.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-070 · Movimiento relativo entre observadores.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.

## 08. Límites y continuidad

- [ ] **SCI-071 · Aproximación por trayectorias diferentes.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-072 · Animación de disco epsilon-delta.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-073 · Límites de funciones vectoriales.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-074 · Discontinuidades removibles en superficies.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-075 · Límites polares hacia el origen.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-076 · Trayectorias rectas versus parabólicas.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-077 · Secciones dirigidas de funciones multivariables.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-078 · Topología de vecindades y fronteras.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-079 · Dominio multivariable sombreado.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-080 · Comparación entre límite y valor de función.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.

## 09. Derivadas multivariables

- [ ] **SCI-081 · Plano tangente manipulable.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-082 · Linealización con error local.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-083 · Derivadas parciales como trazas.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-084 · Gradiente perpendicular a nivel.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-085 · Derivada direccional por vector rotatorio.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-086 · Ascenso más pronunciado animado.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-087 · Regla de la cadena mediante árbol interactivo.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-088 · Diferenciabilidad en superficies.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-089 · Jacobiano como deformación de cuadrículas.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-090 · Hessiana y curvaturas locales.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.

## 10. Optimización

- [ ] **SCI-091 · Puntos críticos clasificados en 3D.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-092 · Extremos absolutos en región cerrada.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-093 · Fronteras parametrizadas en optimización.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-094 · Punto de silla con secciones ortogonales.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-095 · Multiplicadores de Lagrange animados.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-096 · Curvas de nivel tangentes a restricciones.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-097 · Optimización con dos restricciones.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-098 · Diferencia entre extremo local y absoluto.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-099 · Matrices Hessianas visualizadas.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-100 · Comparación numérica y simbólica de extremos.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.

## 11. Integrales 1D

- [ ] **SCI-101 · Acumulación de área bajo curva.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-102 · Sumas de Riemann izquierda-derecha.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-103 · Sumas de Riemann punto medio.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-104 · Regla del trapecio visual.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-105 · Regla de Simpson visual.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-106 · Teorema fundamental con recta tangente.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-107 · Método de sustitución como cambio de eje.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-108 · Integración por partes con regiones.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-109 · Integrales impropias y zonas singulares.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-110 · Comparación de cuadraturas y error.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.

## 12. Sólidos de revolución

- [ ] **SCI-111 · Barrido alrededor de eje horizontal.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-112 · Barrido alrededor de eje vertical.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-113 · Giro alrededor de eje desplazado.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-114 · Discos y arandelas como cortes.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-115 · Cascarones cilíndricos dinámicos.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-116 · Giro parcial hasta pi.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-117 · Giro entre 2pi y 3pi sin volumen adicional.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-118 · Detección de cruces del eje.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-119 · Comparación cascarones-arandelas.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-120 · Volumen acumulado por rebanadas.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.

## 13. Integrales dobles

- [ ] **SCI-121 · Región tipo I sombreada.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-122 · Región tipo II sombreada.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-123 · Intercambio del orden de integración.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-124 · Barra de altura de integrando sobre región.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-125 · Suma de Riemann doble en celdas.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-126 · Cambio a coordenadas polares animado.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-127 · Jacobiano polar representado con celdas.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-128 · Dominios con agujeros y exclusiones.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-129 · Integración sobre polígonos.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-130 · Comparación integral doble y volumen firmado.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.

## 14. Integrales triples

- [ ] **SCI-131 · Sólido de integración 3D transparente.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-132 · Rebanadas acumulativas x-y-z.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-133 · Coordenadas cilíndricas interactivas.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-134 · Coordenadas esféricas interactivas.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-135 · Jacobiano cilíndrico por deformación.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-136 · Jacobiano esférico por deformación.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-137 · Visualización de límites anidados.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-138 · Cambio de orden de integración triple.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-139 · Centro de masa volumétrico.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-140 · Densidad espacial coloreada.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.

## 15. Campos vectoriales

- [ ] **SCI-141 · Campo vectorial 2D de densidad ajustable.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-142 · Campo vectorial 3D muestreado.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-143 · Partículas transportadas por campo.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-144 · Líneas de corriente RK4.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-145 · Líneas de corriente con semilla interactiva.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-146 · Comparación Euler-RK4.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-147 · Divergencia representada por expansión.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-148 · Rotacional representado por rotor.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-149 · Mapa de potencial para campo conservativo.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-150 · Detección y visualización de puntos singulares.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.

## 16. Integrales de línea

- [ ] **SCI-151 · Trabajo acumulado sobre trayectoria.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-152 · Orientación horaria y antihoraria.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-153 · Integral escalar sobre longitud de arco.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-154 · Integral vectorial F·dr explicada visualmente.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-155 · Proyección tangencial del campo.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-156 · Comparación de caminos con extremos iguales.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-157 · Campo conservativo con potencial.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-158 · Diferencia de potencial entre puntos.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-159 · Longitud de curva con marcador.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-160 · Circulación alrededor de lazo cerrado.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.

## 17. Teorema de Green

- [ ] **SCI-161 · Región orientada con frontera.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-162 · Circulación de borde animada.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-163 · Rotacional sobre celdas interiores.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-164 · Comparación integral de línea e integral doble.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-165 · Subdivisión de región y cancelación interior.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-166 · Caso de región con agujero.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-167 · Orientación de contornos internos.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-168 · Green para área de región.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-169 · Convergencia numérica con refinamiento.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-170 · Avisos de hipótesis del teorema.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.

## 18. Superficies e integrales de flujo

- [ ] **SCI-171 · Superficie paramétrica en u-v.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-172 · Líneas coordenadas sobre superficie.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-173 · Derivadas parciales de parametrización.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-174 · Vector normal y producto cruz.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-175 · Orientación seleccionable de normales.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-176 · Elemento diferencial de área.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-177 · Flujo por pequeños parches.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-178 · Flujo acumulado sobre superficie.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-179 · Superficies abiertas y cerradas.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-180 · Integral escalar de superficie.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.

## 19. Teoremas 3D

- [ ] **SCI-181 · Stokes: borde y normal orientada.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-182 · Stokes: circulación versus rotacional.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-183 · Rotor de campo 3D interactivo.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-184 · Gauss: flujo de caja cerrada.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-185 · Gauss: divergencia en celdas.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-186 · Flujo entrante y saliente coloreado.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-187 · Cambio de orientación y signo.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-188 · Visualización de normales salientes.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-189 · Superficies con agujeros en dominio.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-190 · Panel de hipótesis de Stokes y Gauss.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.

## 20. Ciencia, datos y publicación

- [ ] **SCI-191 · Tablas nativas exportables CSV.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-192 · Tablas nativas exportables TSV.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-193 · Tablas nativas exportables JSON.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-194 · Importar CSV local como datos.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-195 · Curvas XY desde columnas de tablas.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-196 · Histogramas de datos experimentales.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-197 · Ajuste lineal y residuos.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-198 · Barras de error e incertidumbre.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-199 · Exportación vectorial SVG/PDF.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.
- [ ] **SCI-200 · Paquetes reproducibles con metadatos y unidades.** Implementar como objeto/acción reutilizable con vista 2D/3D o exportación, control de parámetros, verificación numérica y prueba de regresión.

## Orden de ejecución

1. **P0 — Fiabilidad del formato y matemáticas:** parser, ecuaciones legibles, dimensiones, dominios, singularidades, ciclo de animación, datos reproducibles y seguridad.
2. **P1 — Experiencia gráfica básica:** partículas, tangentes, controles temporales, renderizado 2D/3D, captura de gráficos, tablas CSV/TSV/JSON.
3. **P2 — Cálculo Vectorial completo:** regiones, Riemann, Lagrange, integración múltiple, Green, superficies, flujo y teoremas 3D.
4. **P3 — Extensión científica general:** unidades, incertidumbre, regresión, experimentos, publicaciones, módulos/plugins y colaboración.

## Plantilla de issue por funcionalidad

- ID de catálogo, resultado esperado y referencia matemática.
- Sintaxis `.bwjm` y validador.
- Escena de ejemplo y prueba visual.
- Test unitario y de integración con casos límite.
- Persistencia y exportación verificable.
- Estado: propuesta / en desarrollo / implementada / verificada.
