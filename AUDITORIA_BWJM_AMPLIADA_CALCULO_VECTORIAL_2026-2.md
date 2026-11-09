# Auditoría técnica y hoja de ruta de BWJM — TruthMode + Cálculo Vectorial

> **Repositorio:** [BlackWolfJM/BWJM](https://github.com/BlackWolfJM/BWJM)  
> **Rama y revisión:** `main`, commit [`828fcaafa2b3e3a0a5846a3687b98a88db7b01e7`](https://github.com/BlackWolfJM/BWJM/commit/828fcaafa2b3e3a0a5846a3687b98a88db7b01e7)  
> **Fecha de la revisión:** 8 de noviembre de 2026  
> **Método:** lectura directa de la estructura completa del repositorio, código fuente y pruebas de los paquetes principales; inspección de GitHub Actions y de los registros del último trabajo fallido. **No** se ejecutó una instalación local de las dependencias ni una sesión de navegador.  
> **Alcance:** auditoría estática + diagnóstico real de CI; no es una certificación de seguridad ni una medición de rendimiento.

> **Ampliación curricular incorporada:** sección XI, 49 funcionalidades `CV-01` a `CV-49`, 26 pruebas `CV-T01` a `CV-T26`, ejemplos declarativos y prioridades por las unidades del sílabo 2026–2. Se conserva íntegra la auditoría técnica original.

## 0. Cómo interpretar esta auditoría

**Etiquetas de certeza**:

- **[C] Confirmado por código/log:** el flujo señalado existe literalmente, o el registro demuestra el fallo. Un caso de prueba propuesto puede demostrar el impacto aunque no se haya ejecutado.
- **[R] Riesgo verificable:** se encontró una debilidad potencial, pero falta una reproducción real o una prueba de penetración. No se presenta como vulnerabilidad explotada.
- **[M] Mejora/función faltante:** decisión de producto o deuda de arquitectura. No equivale a afirmar que algo que se prometió esté roto.

**Prioridades**: P0 = corregir antes de afirmar que el producto es estable o matemáticamente fiable; P1 = siguiente versión funcional; P2 = robustez y experiencia; P3 = capacidades futuras. **No confundir las afirmaciones del README con garantías verificadas.**

### Resumen ejecutivo

BWJM ya contiene un parser de Markdown + bloques YAML con Zod, AST tipado, motor de expresiones `mathjs`, grafo reactivo, render SVG/Plotly, playground React, extensiones VS Code/Chrome, CLI, generador de fallbacks y pruebas unitarias. **No es un proyecto vacío.** La arquitectura está repartida en paquetes y algunos controles de seguridad son reales.

Sin embargo, el estado actual no permite describirlo como un formato científico universal, exacto y enteramente offline: el CI no llega a ejecutar las pruebas; el playground combina análisis fijados al ejemplo con documentos arbitrarios; determinadas rutinas numéricas reciben el nombre de *exactas*; existen errores geométricos para regiones que cruzan el eje; hay bloques reconocidos por el parser que el playground no muestra; y la representación de paquetes todavía no conserva los recursos binarios.

| Área | Estado comprobado | Qué impide avanzar |
|---|---|---|
| CI | **Falla** en configuración de Node/pnpm | No existe comprobación verde del último commit |
| Sintaxis/AST | 15 tipos y validación por esquemas | Diferencias entre ejemplos, especificación y soporte real |
| Motor numérico | Cálculo funcional de casos demostrativos | Exactitud impropia, discontinuidades, límites y geometría general |
| Reactividad | Cache por nodo y dependencias de controles | Detección por regex y reconstrucciones de interfaz |
| Playground | Editor, lector, modales, paletas y gráficas 2D/3D | Panel de análisis codificado para una lección; cobertura parcial de nodos |
| VS Code | Custom editor, diagnóstico, webview con CSP | Compatibilidad y controles aún necesitan evaluación E2E |
| Chrome | Content script y visor sobre archivo local | Dependencia de permisos y transporte de mensajes de página |
| Contenedor | Modelo JSON preliminar con estados/pruebas | No existe una implementación completa del contenedor prometido |
| Exportación | SVG 2D y STL 3D | Pérdida de información y consideraciones de dominios/mallas |

---

## I. Bloqueadores actuales — prioridad P0

### 01. [P0][C] Arreglar el pipeline de GitHub Actions, que está rojo
- **Evidencia:** [`.github/workflows/ci.yml` L11–17](https://github.com/BlackWolfJM/BWJM/blob/828fcaafa2b3e3a0a5846a3687b98a88db7b01e7/.github/workflows/ci.yml#L11-L17) instala pnpm 11.15.0 y configura Node 20. En la [ejecución 42510938917](https://github.com/BlackWolfJM/BWJM/actions/runs/42510938917) falla el paso `actions/setup-node` y los pasos `install`, `lint`, `typecheck`, `test`, `build` quedan **omitidos**. El log registra: `pnpm requires at least Node.js v22.13` y `ERR_UNKNOWN_BUILTIN_MODULE: node:sqlite`.
- **Acción:** usar Node compatible con la versión exacta fijada de pnpm (por ejemplo, una versión LTS moderna verificada con pnpm 11), fijar versiones de Actions y comprobar caché/lockfile. **No** desactivar los tests para obtener un check verde.
- **Aceptación:** CI verde en un push limpio con `pnpm install --frozen-lockfile`, lint, typecheck, tests, build y `test:dist` ejecutados. Registrar matriz mínima de plataformas si se desea compatibilidad multiplataforma.

### 02. [P0][C] Corregir el cálculo de volumen cuando la región cruza el eje de giro
- **Evidencia:** [`packages/math/src/solidRevolution.ts` L107–145](https://github.com/BlackWolfJM/BWJM/blob/828fcaafa2b3e3a0a5846a3687b98a88db7b01e7/packages/math/src/solidRevolution.ts#L107-L145). El integrando siempre es `abs(distF²-distG²)`; cruzar el eje solo activa `crossesAxis` y un mensaje, sin cambiar la fórmula.
- **Contraejemplo matemático:** la región `-1 ≤ y ≤ 1`, `0 ≤ x ≤ 1` rotada alrededor de `y=0` produce un cilindro de volumen **π**. El código evalúa `|1²−1²|=0` y devuelve 0. Para una sección que contiene el eje, el radio interior debe ser cero; no se crea un agujero.
- **Acción:** definir una función geométrica de sección a partir del **intervalo continuo** entre las curvas, obtener distancias máxima y mínima **al conjunto**, no solo a los extremos, y validar qué eje admite cada método.
- **Aceptación:** rectángulo simétrico → π; región totalmente encima del eje → arandela; eje tangente a frontera → disco; eje dentro de región → disco. Comparar con integración analítica independiente.

### 03. [P0][C] No aceptar el eje `y` como si aplicara la misma integral de arandelas en `x`
- **Evidencia:** [`solidRevolution.ts` L42–57, L90–135](https://github.com/BlackWolfJM/BWJM/blob/828fcaafa2b3e3a0a5846a3687b98a88db7b01e7/packages/math/src/solidRevolution.ts#L42-L57). `axis="y"` cambia `orientation` pero el cálculo sigue integrando con respecto a `x` las distancias verticales a `offset`.
- **Impacto:** para `y=f(x)` y `y=g(x)`, girar alrededor del eje vertical exige cascarones cilíndricos o reexpresar la región en `y`; no basta con cambiar una etiqueta.
- **Acción:** implementar un motor geométrico con orientación explícita y métodos `washers/disks/shells`, selección justificada, partición por regiones y validación de dominio.
- **Aceptación:** para el rectángulo `1≤x≤2, 0≤y≤1` al girar sobre `x=0`, comprobar `V=3π`; comparar cascarones contra integración directa.

### 04. [P0][C] Renombrar y corregir `computeExactArea`: hoy es una aproximación numérica
- **Evidencia:** [`packages/math/src/regionRiemann.ts` L136–200](https://github.com/BlackWolfJM/BWJM/blob/828fcaafa2b3e3a0a5846a3687b98a88db7b01e7/packages/math/src/regionRiemann.ts#L136-L200) usa **Simpson compuesto con n=600**, redondea a 8 decimales y asigna una fracción por cercanía a una lista finita de fracciones conocidas. No deriva una primitiva simbólica.
- **Acción:** devolver `{method: "simpson", value, estimatedError, precision}`. Mantener un campo `exact` solo si proviene de una operación CAS demostrable, con supuestos. No afirmar que la fracción inferida sea exacta.
- **Aceptación:** funciones sin primitiva elemental se etiquetan «aproximación»; una fracción meramente cercana jamás se presenta como una identidad demostrada.

### 05. [P0][C] Cambiar el rótulo de volumen «exacto» y la inferencia por tabla
- **Evidencia:** [`solidRevolution.ts` L60–87 y L123–146](https://github.com/BlackWolfJM/BWJM/blob/828fcaafa2b3e3a0a5846a3687b98a88db7b01e7/packages/math/src/solidRevolution.ts#L60-L87) obtiene `rawIntegral` por Simpson y compara con fracciones precargadas usando tolerancia `1e-4`.
- **Acción:** separar `numericVolume` de una expresión simbólica opcional `exactVolume`; mostrar método, tolerancia y procedencia; sustituir `exactFractionOfPi` por `rationalGuess` hasta demostrarlo.
- **Aceptación:** casos de aproximación accidental a una fracción conocida no se anuncian como resultados exactos.

### 06. [P0][C] El análisis de área y volumen del playground no usa las curvas del documento
- **Evidencia:** [`apps/playground/src/main.tsx` L883–908](https://github.com/BlackWolfJM/BWJM/blob/828fcaafa2b3e3a0a5846a3687b98a88db7b01e7/apps/playground/src/main.tsx#L883-L908) define `fStr` como `x` o `${a}*x`, define `gStr="x^2"` y usa `[0,1]` para las integrales **sin relacionarlo** con los bloques cargados por el parser.
- **Impacto:** abrir una lección sobre `sin(x)` u otra disciplina puede seguir mostrando resultados de `x` contra `x²`, con apariencia de validación científica del documento actual.
- **Acción:** modelar el análisis como bloques declarativos `region2d`, `riemann`, `revolution` que referencien IDs de funciones y dominio, o mostrar claramente «Demostración independiente» solo dentro del ejemplo predefinido.
- **Aceptación:** cambiar `f` y `g` en el documento cambia las cifras mostradas o elimina el panel cuando no corresponde.

### 07. [P0][C] Evitar falsos cruces detectados en discontinuidades
- **Evidencia:** [`regionRiemann.ts` L81–134](https://github.com/BlackWolfJM/BWJM/blob/828fcaafa2b3e3a0a5846a3687b98a88db7b01e7/packages/math/src/regionRiemann.ts#L81-L134) considera cambio de signo como intersección y refina por bisección sin verificar continuidad ni residual final pequeño.
- **Contraejemplo a probar:** `f(x)=1/x`, `g(x)=0`, dominio `[-1,1]`: el cambio de signo a ambos lados de 0 no es una raíz.
- **Acción:** segmentar por discontinuidades, comprobar residuo y finitud del candidato, detectar tangencias independientemente del cambio de signo.
- **Aceptación:** no inventa intersección en una asíntota; encuentra raíces tangenciales como `x²=0` aun cuando una rejilla no incluya exactamente cero.

### 08. [P0][C] Definir semántica correcta para giro parcial y solapamiento angular
- **Evidencia:** [`solidRevolution.ts` L130–141](https://github.com/BlackWolfJM/BWJM/blob/828fcaafa2b3e3a0a5846a3687b98a88db7b01e7/packages/math/src/solidRevolution.ts#L130-L141) hace `effectiveAngle = min(angleAlpha, 2π)` y multiplica el área radial por `effectiveAngle / 2` para todos los casos.
- **Problema:** la fórmula necesita supuestos sobre la posición de la región respecto del eje y sobre cómo se mide el volumen de la **unión** al hacer un barrido parcial. Con una región que atraviesa el eje, hay solapamiento entre barridos de lados opuestos antes de 2π.
- **Acción:** modelar el conjunto barrido en coordenadas cilíndricas o restringir formalmente esta opción a regiones enteramente situadas de un lado del eje; validar `angleAlpha` finito y dentro de un rango documentado.
- **Aceptación:** mostrar explícitamente los supuestos; pruebas con `α=0`, `π/2`, `π`, `2π`, `3π`, región simétrica y no simétrica.

---

## II. Exactitud, dominios y algoritmos — P1

### 09. [P1][C] Evitar que `findIntersections` pierda raíces por muestreo fijo
- **Evidencia:** [`regionRiemann.ts` L96–125](https://github.com/BlackWolfJM/BWJM/blob/828fcaafa2b3e3a0a5846a3687b98a88db7b01e7/packages/math/src/regionRiemann.ts#L96-L125) usa 250 tramos, umbral fijo `1e-7`, deduplicación fija `1e-4` y cambios de signo.
- **Acción:** detección de mínimos de `|f-g|`, subdivisión adaptativa, criterio relativo, validación del residuo y opción de resolución simbólica si el CAS lo permite.
- **Aceptación:** funciona con raíces próximas, tangenciales, múltiples, muy grandes o muy pequeñas.

### 10. [P1][C] Validar `n` y el intervalo en `computeRiemannPartition`
- **Evidencia:** [`regionRiemann.ts` L259–315](https://github.com/BlackWolfJM/BWJM/blob/828fcaafa2b3e3a0a5846a3687b98a88db7b01e7/packages/math/src/regionRiemann.ts#L259-L315) calcula `(b-a)/n` y ejecuta el bucle sin una validación explícita de `n` o del orden de los límites.
- **Acción:** exigir `n` entero positivo acotado, extremos finitos y `a<b`, y devolver error tipado si no se cumplen.
- **Aceptación:** `n=0`, `n<0`, `n=1e9`, `NaN`, límites invertidos o no finitos no producen un resultado engañoso.

### 11. [P1][C] Evaluar el error de Riemann contra una referencia identificada como numérica
- **Evidencia:** [`regionRiemann.ts` L306–315](https://github.com/BlackWolfJM/BWJM/blob/828fcaafa2b3e3a0a5846a3687b98a88db7b01e7/packages/math/src/regionRiemann.ts#L306-L315) compara Riemann contra `computeExactArea` aunque este es Simpson.
- **Acción:** `differenceFromReference` si no hay valor exacto; propagar error del integrador de referencia; evitar precisión falsa de 6 decimales.
- **Aceptación:** cálculo de error acompañado del método y tolerancia de referencia.

### 12. [P1][C] `isBounded` no representa la acotación matemática de una región
- **Evidencia:** [`regionRiemann.ts` L193–200 y L203–221](https://github.com/BlackWolfJM/BWJM/blob/828fcaafa2b3e3a0a5846a3687b98a88db7b01e7/packages/math/src/regionRiemann.ts#L193-L221) asigna `isBounded` según que el número computado sea finito; la otra función infiere una región cerrada solo del número de cruces.
- **Acción:** distinguir `finiteIntegral`, `closedRegion`, `boundedSet`, `connectedComponent` y `domainValid`.
- **Aceptación:** una integral finita sobre un intervalo elegido no demuestra por sí sola que dos curvas encierren una región.

### 13. [P1][C] Manejar funciones no reales y no finitas durante el muestreo
- **Evidencia:** [`mathEngine.ts` L67–75 y L77–141](https://github.com/BlackWolfJM/BWJM/blob/828fcaafa2b3e3a0a5846a3687b98a88db7b01e7/packages/math/src/mathEngine.ts#L67-L75) convierte con `Number(result)`; `sample1D` y `sampleSurface` incorporan el valor sin máscara de dominios.
- **Acción:** devolver muestras con máscara de validez, cortes por ramas, discontinuidades y manejo controlado de complejos.
- **Aceptación:** `sqrt(x)`, `log(x)`, `1/x` y `tan(x)` muestran huecos/asíntotas, no segmentos falsos ni polígonos a través de singularidades.

### 14. [P1][C] Corregir las secciones transversales que contienen el eje
- **Evidencia:** [`solidRevolution.ts` L149–175](https://github.com/BlackWolfJM/BWJM/blob/828fcaafa2b3e3a0a5846a3687b98a88db7b01e7/packages/math/src/solidRevolution.ts#L149-L175) devuelve siempre un radio interior igual a la menor distancia de los extremos.
- **Acción:** si el eje pertenece al intervalo vertical, `innerRadius=0`, no `min(distF,distG)`; para otros ejes, usar método apropiado.
- **Aceptación:** `computeCrossSection('1','-1',0.5,'x')` da radio exterior 1, interior 0 y área π.

### 15. [P1][C] Las mallas 3D de revolución solo muestran la superficie exterior
- **Evidencia:** [`solidRevolution.ts` L178–240](https://github.com/BlackWolfJM/BWJM/blob/828fcaafa2b3e3a0a5846a3687b98a88db7b01e7/packages/math/src/solidRevolution.ts#L178-L240) usa `r=max(abs(...),abs(...))`, sin superficie interior, tapas ni semántica de volumen sólido.
- **Acción:** construir mallas exterior/interior, tapas y secciones con normales consistentes; separar `sweptSurface` de `solidVolumeMesh`.
- **Aceptación:** una arandela se ve hueca donde corresponde y el corte coincide con el resultado matemático.

### 16. [P1][C] Validar ejes antes de aceptar cualquier cadena
- **Evidencia:** [`solidRevolution.ts` L42–58](https://github.com/BlackWolfJM/BWJM/blob/828fcaafa2b3e3a0a5846a3687b98a88db7b01e7/packages/math/src/solidRevolution.ts#L42-L58) interpreta cadenas mediante `parseFloat` y usa el eje horizontal 0 por defecto si no reconoce la entrada.
- **Acción:** parser de ejes estricto con errores y esquema tipado; evitar el fallback silencioso.
- **Aceptación:** `y=abc`, `x=2garbage` y `not-an-axis` devuelven error explícito.

### 17. [P1][R] Limitar explosión de trabajo numérico y operaciones costosas
- **Evidencia:** [`mathEngine.ts` L20–48, L77–141](https://github.com/BlackWolfJM/BWJM/blob/828fcaafa2b3e3a0a5846a3687b98a88db7b01e7/packages/math/src/mathEngine.ts#L20-L48) limita longitud de expresión y cantidad de muestras, pero no establece presupuesto de tiempo, complejidad del AST ni memoria de evaluación.
- **Acción:** AST allowlist y límite de nodos/profundidad, trabajadores cancelables, tiempo de CPU/memoria estimada, presupuestos de render.
- **Aceptación:** expresiones adversariales o muchas superficies no congelan la interfaz principal.

### 18. [P1][C] Evitar recompilar funciones repetidamente dentro de bucles
- **Evidencia:** [`packages/core/src/index.ts` L270–283 y L330–380](https://github.com/BlackWolfJM/BWJM/blob/828fcaafa2b3e3a0a5846a3687b98a88db7b01e7/packages/core/src/index.ts#L270-L283) llama `compileExpression` en iteraciones de `curve3d` y en derivadas numéricas repetidas.
- **Acción:** compilar una vez por nodo/versión; invalidar con hash de expresión; compartir la compilación entre muestreo y renderer.
- **Aceptación:** benchmark de curvas con muchas muestras muestra menor tiempo sin cambiar resultados.

### 19. [P1][R] Mejorar derivadas parciales por diferencias finitas
- **Evidencia:** [`packages/core/src/index.ts` L327–380](https://github.com/BlackWolfJM/BWJM/blob/828fcaafa2b3e3a0a5846a3687b98a88db7b01e7/packages/core/src/index.ts#L327-L380) usa paso fijo `h=1e-5` para gradiente y plano tangente.
- **Acción:** diferenciación simbólica para expresiones compatibles, diferencias adaptativas como respaldo, identificación de puntos no diferenciables.
- **Aceptación:** comparar con `x²+y²`, `abs(x)`, `sqrt(x)`, escalas de `1e-9` y `1e9`.

---

## III. Parser, AST y coherencia del lenguaje — P1

### 20. [P1][C] Alinear `EXAMPLES.md` con la gramática real
- **Evidencia:** [`EXAMPLES.md`](https://github.com/BlackWolfJM/BWJM/blob/828fcaafa2b3e3a0a5846a3687b98a88db7b01e7/EXAMPLES.md) propone un bloque `plot2d` con `functions:` como lista; [`parser/src/index.ts` L164–176](https://github.com/BlackWolfJM/BWJM/blob/828fcaafa2b3e3a0a5846a3687b98a88db7b01e7/packages/parser/src/index.ts#L164-L176) requiere `equation: string`.
- **Acción:** admitir múltiples funciones de forma explícita o corregir el ejemplo a múltiples bloques.
- **Aceptación:** un test analiza **todos** los bloques de `EXAMPLES.md` y no devuelve diagnósticos inesperados.

### 21. [P1][C] Admitir constantes matemáticas en límites declarativos o prohibir ese ejemplo
- **Evidencia:** [`EXAMPLES.md` L40–50](https://github.com/BlackWolfJM/BWJM/blob/828fcaafa2b3e3a0a5846a3687b98a88db7b01e7/EXAMPLES.md#L40-L50) usa `t: [0, 8*pi]`; [`parser/src/index.ts` L292–305](https://github.com/BlackWolfJM/BWJM/blob/828fcaafa2b3e3a0a5846a3687b98a88db7b01e7/packages/parser/src/index.ts#L292-L305) entrega el YAML a [`domainSchema`](https://github.com/BlackWolfJM/BWJM/blob/828fcaafa2b3e3a0a5846a3687b98a88db7b01e7/packages/ast/src/index.ts#L265-L270), que exige dos números finitos; `8*pi` escrito como elemento YAML no es número.
- **Acción:** parser seguro para expresiones constantes en `t`, `x`, `y` o documentar únicamente números literales.
- **Aceptación:** el ejemplo oficial carga una hélice con `t=[0,8π]` o avisa de incompatibilidad de forma inequívoca.

### 22. [P1][C] Distinguir bloques reconocidos de bloques renderizados en BWJM Studio
- **Evidencia:** [`packages/parser/src/index.ts` L42–58](https://github.com/BlackWolfJM/BWJM/blob/828fcaafa2b3e3a0a5846a3687b98a88db7b01e7/packages/parser/src/index.ts#L42-L58) acepta 15 tipos. El bucle visual principal en [`apps/playground/src/main.tsx` L752–881](https://github.com/BlackWolfJM/BWJM/blob/828fcaafa2b3e3a0a5846a3687b98a88db7b01e7/apps/playground/src/main.tsx#L752-L881) crea UI principalmente para `slider`, `checkbox`, `plot2d`, `surface3d`.
- **Acción:** introducir `BlockRendererRegistry` con un renderer o fallback/error visual para los 15 tipos.
- **Aceptación:** una lección con vectores, contornos, gradiente y curva 3D no pierde silenciosamente esas visualizaciones en el playground.

### 23. [P1][C] Alinear `LANGUAGE.md`, `SPEC.md` y `README.md`
- **Evidencia:** [`LANGUAGE.md`](https://github.com/BlackWolfJM/BWJM/blob/828fcaafa2b3e3a0a5846a3687b98a88db7b01e7/LANGUAGE.md) enumera `curve2d` y `vectorfield3d`, que no aparecen entre los 15 tipos del parser; [`SPEC.md`](https://github.com/BlackWolfJM/BWJM/blob/828fcaafa2b3e3a0a5846a3687b98a88db7b01e7/SPEC.md) continúa llamando al proyecto MathMD.
- **Acción:** mantener una tabla de capacidades con estados `estable`, `experimental`, `planeado`, `no soportado`, generada automáticamente del registro de nodos.
- **Aceptación:** no existen ejemplos oficiales que el parser rechace ni promesas de render universal en los modos donde no está implementado.

### 24. [P1][R] Revisar la estabilidad de IDs cuando se insertan bloques
- **Evidencia:** [`parser/src/index.ts` L661–717](https://github.com/BlackWolfJM/BWJM/blob/828fcaafa2b3e3a0a5846a3687b98a88db7b01e7/packages/parser/src/index.ts#L661-L717) genera IDs usando ordinal global y contenido, salvo ID explícito.
- **Riesgo:** insertar un bloque al principio modifica IDs posteriores y puede invalidar snapshots, enlaces, estados y referencias entre objetos.
- **Acción:** recomendar `id` persistentes para objetos referenciables; migrador que asigne IDs; detectar renombrados.
- **Aceptación:** agregar texto o un bloque nuevo no rompe referencias existentes ni snapshots guardados.

### 25. [P1][R] Limitar documentos YAML y Markdown maliciosamente grandes
- **Evidencia:** [`parser/src/index.ts` L91–145 y L654–736](https://github.com/BlackWolfJM/BWJM/blob/828fcaafa2b3e3a0a5846a3687b98a88db7b01e7/packages/parser/src/index.ts#L91-L145) prohíbe alias y tags, y Zod valida los bloques, pero no se aprecia un límite global de bytes, bloques, profundidad ni tiempos por documento.
- **Acción:** presupuesto de parser, tamaño máximo por bloque, límites de estructura y diagnóstico recuperable.
- **Aceptación:** un documento enorme o adversarial se detiene con mensaje definido, sin bloquear el proceso de UI.

### 26. [P1][R] Comprobar que la misma expresión tiene la misma semántica entre superficies, curvas y exportación
- **Evidencia:** el runtime usa `mathjs` en [`packages/math`](https://github.com/BlackWolfJM/BWJM/tree/828fcaafa2b3e3a0a5846a3687b98a88db7b01e7/packages/math/src); hay rutas independientes de muestreo en [`packages/github/src/stlExporter.ts`](https://github.com/BlackWolfJM/BWJM/blob/828fcaafa2b3e3a0a5846a3687b98a88db7b01e7/packages/github/src/stlExporter.ts) y distintas representaciones.
- **Acción:** una única API `EvaluatedGeometry`, con máscaras de dominio, unidades, contexto numérico y versionado.
- **Aceptación:** misma función, dominio y parámetros → mismos puntos válidos en editor, VS Code, SVG/STL y prueba numérica.

---

## IV. Reactividad y rendimiento — P1 / P2

### 27. [P1][C] Sustituir extracción de dependencias por AST matemático
- **Evidencia:** [`packages/core/src/index.ts` L60–132](https://github.com/BlackWolfJM/BWJM/blob/828fcaafa2b3e3a0a5846a3687b98a88db7b01e7/packages/core/src/index.ts#L60-L132) usa regex de identificadores sobre expresiones.
- **Acción:** obtener símbolos libres desde el AST validado de mathjs, distinguiendo funciones, constantes, ejes y controles.
- **Aceptación:** slider `sin` no se confunde con función `sin`; `a1` y `a` no se mezclan; los controles afectan solo los objetos pertinentes.

### 28. [P1][C] Evitar recálculo completo de DOM al editar contenido o nombre
- **Evidencia:** [`apps/playground/src/main.tsx` L691–700 y L946](https://github.com/BlackWolfJM/BWJM/blob/828fcaafa2b3e3a0a5846a3687b98a88db7b01e7/apps/playground/src/main.tsx#L691-L700) limpia timers y renderizadores, crea nuevo `MathMDCore` y reconstruye la vista al cambiar dependencias del efecto (`doc`, `markdown`, `filename`, `sliceX`).
- **Acción:** separar parseo, reconciliación de nodos, estado vivo y render, preservando controles por ID.
- **Aceptación:** escribir una palabra en un párrafo no reinicia el ángulo de un deslizador ni la cámara de una superficie 3D.

### 29. [P1][C] No anunciar un control de corte transversal arrastrable cuando no existe
- **Evidencia:** [`apps/playground/src/main.tsx` L419 y L897](https://github.com/BlackWolfJM/BWJM/blob/828fcaafa2b3e3a0a5846a3687b98a88db7b01e7/apps/playground/src/main.tsx#L419) declara `const [sliceX] = useState(0.5)`; no aparece un `setSliceX` en el archivo.
- **Acción:** deslizador de sección conectado a `computeCrossSection`, y plano de corte sincronizado con la escena.
- **Aceptación:** mover el deslizador cambia el radio, el área, la posición del plano y la visualización del sólido.

### 30. [P1][C] El panel de métricas numéricas se reconstruye con `innerHTML` en cada variación
- **Evidencia:** [`apps/playground/src/main.tsx` L883–941](https://github.com/BlackWolfJM/BWJM/blob/828fcaafa2b3e3a0a5846a3687b98a88db7b01e7/apps/playground/src/main.tsx#L883-L941).
- **Acción:** componentes React o nodos reutilizables con `textContent`; mostrar valores solo después de confirmar finitud.
- **Aceptación:** animaciones fluidas y sin reinicios de foco o pérdida de interacción.

### 31. [P2][R] Revisar concurrencia de Plotly con cambios rápidos y destrucción de vistas
- **Evidencia:** [`packages/renderer-plotly/src/plotlyRenderer.ts` L160–205](https://github.com/BlackWolfJM/BWJM/blob/828fcaafa2b3e3a0a5846a3687b98a88db7b01e7/packages/renderer-plotly/src/plotlyRenderer.ts#L160-L205) hace importación dinámica y actualizaciones asíncronas sin secuencia explícita de revisiones.
- **Acción:** cola/epoch para descartar renders anteriores, gestionar rechazos y cancelar al desmontar.
- **Aceptación:** slider movido rápidamente no deja cámara/datos de una versión vieja ni errores no capturados.

### 32. [P2][M] Agregar muestreo adaptativo 2D y 3D
- **Evidencia:** [`mathEngine.ts` L77–141](https://github.com/BlackWolfJM/BWJM/blob/828fcaafa2b3e3a0a5846a3687b98a88db7b01e7/packages/math/src/mathEngine.ts#L77-L141) usa rejillas uniformes; `plot2d` aplica 100 puntos por defecto desde [`core/src/index.ts` L197–211](https://github.com/BlackWolfJM/BWJM/blob/828fcaafa2b3e3a0a5846a3687b98a88db7b01e7/packages/core/src/index.ts#L197-L211).
- **Acción:** más muestras donde exista curvatura alta; discontinuidades y nivel de detalle por viewport.
- **Aceptación:** gráfica de `tan(x)` y funciones muy oscilantes no muestra conexiones falsas o aliasing evidente.

### 33. [P2][M] Virtualizar documentos largos y cachear nodos de manera incremental
- **Evidencia:** [`apps/playground/src/main.tsx` L690–946](https://github.com/BlackWolfJM/BWJM/blob/828fcaafa2b3e3a0a5846a3687b98a88db7b01e7/apps/playground/src/main.tsx#L690-L946) reconstruye el árbol visible y sus visualizadores.
- **Acción:** virtualización de bloques fuera de pantalla; cache por versión y dependencias; liberación de GPU/memoria.
- **Aceptación:** documento con 100+ gráficos sigue siendo navegable; límites de memoria medidos.

### 34. [P2][M] Reducir la monoliticidad del editor principal
- **Evidencia:** [`apps/playground/src/main.tsx`](https://github.com/BlackWolfJM/BWJM/blob/828fcaafa2b3e3a0a5846a3687b98a88db7b01e7/apps/playground/src/main.tsx) supera mil líneas e incorpora importación, exportación, contenido predefinido, cálculos y renderizado del documento; algunos controles ya se han separado en componentes.
- **Acción:** separar `DocumentStore`, `BlockHost`, `MathAnalysisPanel`, `EditorService`, `FileService`, `RendererRegistry` y hooks de animación.
- **Aceptación:** lógica de negocio testeable sin montar toda la interfaz.

---

## V. Formato, portabilidad y persistencia — P1 / P2

### 35. [P1][C] Serialización de contenedor pierde recursos `assets`
- **Evidencia:** [`packages/core/src/container.ts` L67–116](https://github.com/BlackWolfJM/BWJM/blob/828fcaafa2b3e3a0a5846a3687b98a88db7b01e7/packages/core/src/container.ts#L67-L116): `BWJMPackage` tiene `assets`, pero `serializePackageToJSON` solo escribe `manifest/document/states/tests`; `deserializePackageFromJSON` siempre crea `assets: new Map()`.
- **Acción:** diseñar `.bwjmz` como ZIP con archivos, manifest, hashes y migraciones; mantener `.bwjm` como texto fuente legible.
- **Aceptación:** prueba de ida y vuelta incluye imagen/binario/audio/datos y conserva hash de cada recurso.

### 36. [P1][C] Validar manifiestos al cargar
- **Evidencia:** [`container.ts` L77–116](https://github.com/BlackWolfJM/BWJM/blob/828fcaafa2b3e3a0a5846a3687b98a88db7b01e7/packages/core/src/container.ts#L77-L116) convierte JSON a un tipo TS y verifica esencialmente la existencia de `manifest` y `document`, sin validación integral runtime de propiedades.
- **Acción:** Zod schema de manifest con versión, IDs, tamaños, capacidades mínimas, integridad y rutas válidas.
- **Aceptación:** rechaza versiones incompatibles, IDs duplicados, rutas traversal y manifiestos mal tipados.

### 37. [P1][C] Unificar nombre de proyecto y comandos públicos
- **Evidencia:** [`package.json`](https://github.com/BlackWolfJM/BWJM/blob/828fcaafa2b3e3a0a5846a3687b98a88db7b01e7/package.json) y muchos paquetes usan `mathmd`; [`README.md`](https://github.com/BlackWolfJM/BWJM/blob/828fcaafa2b3e3a0a5846a3687b98a88db7b01e7/README.md) anuncia BWJM; [`SPEC.md`](https://github.com/BlackWolfJM/BWJM/blob/828fcaafa2b3e3a0a5846a3687b98a88db7b01e7/SPEC.md) dice MathMD; se aceptan `.bwjm` y `.jm`.
- **Acción:** ADR de naming: marca BWJM, formato `.bwjm`, nombre de paquete opcional, CLI y extensiones; compatibilidad documentada con `mathmd`.
- **Aceptación:** un usuario nuevo sabe cuál es el nombre oficial, qué extensión instalar y qué comando ejecutar.

### 38. [P1][C] Documentar la diferencia entre el archivo actual de texto y el contenedor futuro
- **Evidencia:** [`apps/playground/src/main.tsx` L505–530](https://github.com/BlackWolfJM/BWJM/blob/828fcaafa2b3e3a0a5846a3687b98a88db7b01e7/apps/playground/src/main.tsx#L505-L530) guarda un `Blob` de Markdown, sin contenedor. El modelo de contenedor en [`core/container.ts`](https://github.com/BlackWolfJM/BWJM/blob/828fcaafa2b3e3a0a5846a3687b98a88db7b01e7/packages/core/src/container.ts) es JSON preliminar.
- **Acción:** esquema versionado: `.bwjm` texto declarativo; `.bwjmz` (si se adopta) archivo empaquetado; `application/vnd.bwjm+...` según registro futuro.
- **Aceptación:** especificación oficial identifica claramente qué soporta la versión 0.1.

### 39. [P1][C] No presentar el playground como totalmente offline
- **Evidencia:** [`apps/playground/index.html`](https://github.com/BlackWolfJM/BWJM/blob/828fcaafa2b3e3a0a5846a3687b98a88db7b01e7/apps/playground/index.html) carga KaTeX CSS/JS desde jsDelivr y tipografías desde Google Fonts.
- **Acción:** incluir KaTeX, CSS y fuentes como dependencias empaquetadas/autoservidas, caché offline y pruebas sin red.
- **Aceptación:** cargar, editar y visualizar fórmulas desde una instalación local con la conexión deshabilitada.

### 40. [P2][C] La exportación HTML sí existe; aclarar «zero HTML»
- **Evidencia:** [`apps/playground/src/main.tsx` L534–570](https://github.com/BlackWolfJM/BWJM/blob/828fcaafa2b3e3a0a5846a3687b98a88db7b01e7/apps/playground/src/main.tsx#L534-L570) exporta un `.html` basado en `sheetRef.current.innerHTML`; el README declara «cero dependencia de archivos HTML».
- **Acción:** explicar «el archivo fuente no requiere un HTML auxiliar» en vez de «no usamos HTML»; etiquetar export HTML como snapshot (no como preservación garantizada de toda la interactividad).
- **Aceptación:** documentación distingue formato de almacenamiento, tecnología del visor y formato de exportación.

### 41. [P2][R] Advertir antes de reemplazar un documento sin guardar
- **Evidencia:** [`apps/playground/src/main.tsx` L512–530 y L664–688](https://github.com/BlackWolfJM/BWJM/blob/828fcaafa2b3e3a0a5846a3687b98a88db7b01e7/apps/playground/src/main.tsx#L512-L530) reemplaza `markdown` al abrir/crear/cargar ejemplos sin control visible de `dirty` o confirmación.
- **Acción:** registro de cambios sin guardar, autosave local y cuadro de confirmación al sustituir contenido.
- **Aceptación:** modificar → cargar ejemplo solicita guardar/descartar/cancelar; posibilidad de recuperar borrador tras recarga.

### 42. [P2][M] Guardar también el estado de exploración de gráficas
- **Evidencia:** el guardado del playground serializa solo `markdown` en [`main.tsx` L505–512](https://github.com/BlackWolfJM/BWJM/blob/828fcaafa2b3e3a0a5846a3687b98a88db7b01e7/apps/playground/src/main.tsx#L505-L512); el motor tiene variables en memoria.
- **Acción:** persistir valores de sliders, cámara, sección, visibilidad de capas y una instantánea reproducible opcional.
- **Aceptación:** guardar, cerrar y abrir recupera el mismo estado de estudio sin cambiar la fuente declarativa por defecto.

### 43. [P2][M] Diseñar migraciones compatibles hacia atrás
- **Evidencia:** [`container.ts`](https://github.com/BlackWolfJM/BWJM/blob/828fcaafa2b3e3a0a5846a3687b98a88db7b01e7/packages/core/src/container.ts) define un manifiesto con versión pero no se observa pipeline de `migrate(v1→v2)`.
- **Acción:** semver del documento separado del semver del lector; suite de fixtures antiguos; migraciones puras.
- **Aceptación:** se pueden abrir documentos viejos, con conversiones trazables y sin pérdidas silenciosas.

---

## VI. Seguridad y extensiones — P1 / P2

### 44. [P1][R] Endurecer el lenguaje matemático mediante whitelist de tipos de AST
- **Evidencia:** [`mathEngine.ts` L5–49](https://github.com/BlackWolfJM/BWJM/blob/828fcaafa2b3e3a0a5846a3687b98a88db7b01e7/packages/math/src/mathEngine.ts#L5-L49) limita funciones, símbolos prohibidos y accesores. No se aprecia allí una allowlist exhaustiva de clases de nodos matemáticos ni presupuesto AST.
- **Acción:** admitir solo operaciones matemáticas previstas; rechazar asignaciones, expresiones de bloque, definiciones de funciones y estructuras no necesarias; comprobar mediante fuzzing.
- **Aceptación:** tests para familias de nodos mathjs y entrada hostil; sin afirmar que exista actualmente un exploit demostrado.

### 45. [P1][R] Aislar el runtime matemático de documentos externos
- **Evidencia:** el cálculo de muestras ocurre en los métodos síncronos de [`core/src/index.ts`](https://github.com/BlackWolfJM/BWJM/blob/828fcaafa2b3e3a0a5846a3687b98a88db7b01e7/packages/core/src/index.ts), invocados por la UI; no se identifica en esa ruta un worker con cancelación/timeout.
- **Acción:** Web Worker para evaluación, cancelación por revisión, límite de tiempo y tamaño; no permitir que el documento defina código JS arbitrario.
- **Aceptación:** archivo adversarial no bloquea permanentemente la pestaña.

### 46. [P1][R] Validar el origen y la estructura de mensajes de la extensión Chrome
- **Evidencia:** [`apps/chrome-extension/content.js` L17–27](https://github.com/BlackWolfJM/BWJM/blob/828fcaafa2b3e3a0a5846a3687b98a88db7b01e7/apps/chrome-extension/content.js#L17-L27) usa `window.postMessage` con `*` para orígenes `null`; [`apps/vscode-extension/src/webview.ts` L406–411](https://github.com/BlackWolfJM/BWJM/blob/828fcaafa2b3e3a0a5846a3687b98a88db7b01e7/apps/vscode-extension/src/webview.ts#L406-L411) escucha mensajes por tipo y forma sin comprobación visible de origen, pues se reutiliza para Chrome.
- **Acción:** bridge aislado de extensión, comprobaciones de origen/identificador de sesión y tamaño del mensaje. Verificar modelo de `isolated world` y permisos de archivo de Chrome.
- **Aceptación:** mensajes ajenos no sustituyen el contenido del visor; test E2E de archivo local.

### 47. [P1][R] Revisar CSP y trust para exportaciones y recursos incrustados
- **Evidencia:** [`apps/vscode-extension/src/extension.ts` L57–70](https://github.com/BlackWolfJM/BWJM/blob/828fcaafa2b3e3a0a5846a3687b98a88db7b01e7/apps/vscode-extension/src/extension.ts#L57-L70) establece CSP con `script-src` restringido; el playground usa KaTeX y `innerHTML` para renderizado de markup.
- **Acción:** mantener escaping previo del Markdown y `trust:false` explícito en KaTeX, Trusted Types cuando sea viable, pruebas con `<img onerror>` y TeX no confiable.
- **Importante:** el código **sí usa `escapeHtml()`** antes de `formatInlineMarkdown` en [`main.tsx` L78–99](https://github.com/BlackWolfJM/BWJM/blob/828fcaafa2b3e3a0a5846a3687b98a88db7b01e7/apps/playground/src/main.tsx#L78-L99); **no** se ha demostrado aquí un XSS activo en esa ruta.
- **Aceptación:** suite de pruebas para inyección HTML, SVG y TeX; ninguna carga ejecuta scripts arbitrarios.

### 48. [P2][M] Integridad criptográfica y límites para contenedores descargados
- **Evidencia:** en [`core/container.ts`](https://github.com/BlackWolfJM/BWJM/blob/828fcaafa2b3e3a0a5846a3687b98a88db7b01e7/packages/core/src/container.ts) no existe aún un lector ZIP con control de bombas de descompresión o hashes de assets.
- **Acción:** rutas relativas canónicas, límites de tamaño comprimido/descomprimido, hashes SHA-256, firmas opcionales y permisos explícitos para ejecución de extensiones.
- **Aceptación:** rechazar ZIP bomb, path traversal y assets alterados.

### 49. [P2][M] Auditoría de dependencias y releases reproducibles
- **Evidencia:** [`package.json`](https://github.com/BlackWolfJM/BWJM/blob/828fcaafa2b3e3a0a5846a3687b98a88db7b01e7/package.json) fija el gestor y existe `pnpm-lock.yaml`; el CI solo contempla lint, typecheck, tests y build.
- **Acción:** dependencia renovada por PR, `pnpm audit`, SBOM, revisión de licencias, empaquetado firmado y política de versiones.
- **Aceptación:** artefactos vinculados a commit + lockfile, con versiones y procedencia públicas.

---

## VII. Producto, calidad, pedagogía y experiencia — P2 / P3

### 50. [P2][C] Corregir la divergencia entre pruebas disponibles y garantías del README
- **Evidencia:** las pruebas de [`regionRiemann.test.ts`](https://github.com/BlackWolfJM/BWJM/blob/828fcaafa2b3e3a0a5846a3687b98a88db7b01e7/packages/math/__tests__/regionRiemann.test.ts) y [`solidRevolution.test.ts`](https://github.com/BlackWolfJM/BWJM/blob/828fcaafa2b3e3a0a5846a3687b98a88db7b01e7/packages/math/__tests__/solidRevolution.test.ts) cubren casos demostrativos, no los contraejemplos de discontinuidad, eje vertical y región que atraviesa el eje. El README presenta universalidad y exactitud amplias.
- **Acción:** crear matriz de cobertura vinculada a funciones reales, añadir pruebas de borde, y usar lenguaje más preciso en marketing/documentación.
- **Aceptación:** cada afirmación matemática en README tiene un test o un límite declarado.

### 51. [P2][C] Faltan pruebas E2E del playground y flujo de archivo completo
- **Evidencia:** el árbol contiene tests unitarios en paquetes, una suite VS Code y scripts `test:dist`, pero no se encontró un conjunto Playwright/Cypress para apertura de documentos, edición, controles, captura y guardado del playground.
- **Acción:** Playwright para: editar fórmula → ver gráfica → mover parámetro → guardar → reabrir → recuperar estado; extensiones en navegadores compatibles.
- **Aceptación:** CI ejecuta una smoke suite E2E con fallos visuales reproducibles.

### 52. [P2][M] Implementar `renderer-three` o dejarlo explícitamente en roadmap
- **Evidencia:** [`packages/renderer-three/package.json`](https://github.com/BlackWolfJM/BWJM/blob/828fcaafa2b3e3a0a5846a3687b98a88db7b01e7/packages/renderer-three/package.json) ejecuta un build que informa `placeholder - not in active build`.
- **Acción:** adaptar Three.js para capas 3D, líneas vectoriales, normales, mallas parciales y clips, con contrato común y fallbacks.
- **Aceptación:** al menos una escena 3D de referencia con control orbital, selección y corte.

### 53. [P2][M] Implementar API React pública si se quiere integrabilidad de terceros
- **Evidencia:** [`packages/react/package.json`](https://github.com/BlackWolfJM/BWJM/blob/828fcaafa2b3e3a0a5846a3687b98a88db7b01e7/packages/react/package.json) solo declara un placeholder de build.
- **Acción:** `BwjmDocument`, `BwjmEditor`, `BwjmBlock`, `useBwjmDocument`; widgets adaptados a otros frameworks mediante core sin React.
- **Aceptación:** demo externa importa el paquete sin copiar código de `apps/playground`.

### 54. [P2][M] Usar diagramas de dependencia en vez de fichas aisladas
- **Evidencia:** el motor registra variables y nodos en [`core/src/index.ts` L5–58](https://github.com/BlackWolfJM/BWJM/blob/828fcaafa2b3e3a0a5846a3687b98a88db7b01e7/packages/core/src/index.ts#L5-L58).
- **Acción:** representar `variables → fórmulas → regiones → áreas → sólidos → comprobaciones`, con navegación y seguimiento de qué recalculó cada cambio.
- **Aceptación:** al cambiar `a`, se destaca qué cálculos cambian y por qué.

### 55. [P2][M] Explicaciones matemáticas auditables junto a cada visualización
- **Evidencia:** las clases existentes devuelven cálculos y geometrías, pero no un contrato unificado de pasos pedagógicos verificables equivalente al deseado `EducationalStep`.
- **Acción:** `ScientificStep` con entrada, salida, regla aplicada, hipótesis, certificado/procedencia y referencias; separar pruebas numéricas de demostraciones.
- **Aceptación:** la aplicación puede justificar cada transición y señalar cuando solo existe una aproximación.

### 56. [P2][M] Incorporar un módulo específico de regiones declarativas
- **Evidencia:** `regionRiemann.ts` expone funciones, pero el AST de 15 tipos en [`packages/ast/src/index.ts`](https://github.com/BlackWolfJM/BWJM/blob/828fcaafa2b3e3a0a5846a3687b98a88db7b01e7/packages/ast/src/index.ts) no define aún bloques `region2d`/`revolution` como primitivas declarativas de documento.
- **Acción:** `region2d` con ecuaciones/inecuaciones, IDs, dominio, componente conexa y sombreado; `revolution` con referencia a región, eje y ángulo; parámetros declarados.
- **Aceptación:** cualquier documento puede declarar su propia región, no solo cargar la lección demostrativa.

### 57. [P2][M] Añadir animación de secciones, intersecciones y métodos de integración
- **Acción:** volumen dinámico, sumas de Riemann (izquierda/derecha/punto medio/trapecio/Simpson), cortes y comparación contra volumen; adjuntar semántica matemática al elemento visual.
- **Aceptación:** las cifras y los límites sobre el dibujo coinciden con las fórmulas mostradas en todo instante.

### 58. [P2][M] Hacer accesibles las gráficas, no solo los controles
- **Evidencia:** aparecen `aria-label` y componentes de UI, pero una gráfica SVG/Plotly sigue necesitando alternativas no visuales.
- **Acción:** descripciones de ejes, tabla de valores, teclado para inspeccionar puntos, contraste verificable, resumen de cambios tras un slider y preferencias de movimiento reducido.
- **Aceptación:** recorrido íntegro mediante teclado y lector de pantalla de un ejemplo representativo.

### 59. [P3][M] Extender el formato a geometría y cálculo vectorial sin prometer funciones que faltan
- **Acción:** curvas paramétricas 2D/3D, campos 3D, gradiente y plano tangente con dominios, integrales dobles/triples, flujo, circulación, Green, Stokes y Gauss; coordenadas polares/cilíndricas/esféricas.
- **Aceptación:** tests matemáticos cruzados contra un CAS confiable con tolerancias explícitas para resultados numéricos.

### 60. [P3][M] Ecosistema académico verificable
- **Acción:** compatibilidad con Jupyter/LaTeX/Typst, publicación de documentos con snapshots congelados, bibliografía a nivel de paso, unidades físicas y rúbricas de ejercicios; plugins con sandbox/capabilities.
- **Aceptación:** otro lector reproduce el mismo documento, configuración y resultado numérico respetando versiones.

---

## VIII. Casos de prueba prioritarios, listos para implementar

Los resultados esperados siguientes son **conclusiones matemáticas de referencia**, no pruebas que yo haya ejecutado contra la aplicación. Especificar un test no demuestra que el código pase o falle hasta ejecutarlo.

| ID | Componente | Entrada | Esperado |
|---|---|---|---|
| T01 | CI | pnpm 11.15 + runtime compatible | Todos los pasos del workflow terminan y no se omiten |
| T02 | Revolución | `f=1`, `g=-1`, `x∈[0,1]`, eje `y=0`, giro `2π` | `V=π`; sección `R=1`, `r=0` |
| T03 | Revolución | `f=1`, `g=0`, `x∈[1,2]`, eje `x=0` (eje vertical) | `V=3π` |
| T04 | Revolución | `f=x`, `g=x²`, `[0,1]`, eje `y=0` | `V=2π/15` (caso conocido, debe seguir pasando) |
| T05 | Revolución | región anterior, `y=-1` | `V=7π/15` (caso conocido) |
| T06 | Revolución | región anterior, `α=2π` y `3π` | mismo volumen de unión |
| T07 | Sección | `f=1`, `g=-1`, corte `x=0.5` | disco sin agujero, área `π` |
| T08 | Intersecciones | `f=1/x`, `g=0`, `[-1,1]` | ninguna intersección válida |
| T09 | Intersecciones | `f=x²`, `g=0`, `[-0.99,1.01]` | tangencia `x=0` aunque la rejilla la omita |
| T10 | Riemann | `n=0`, `n=-2`, `n=Infinity` | validación explícita y sin bloqueo |
| T11 | Área | `f=x`, `g=x²` `[0,1]` | `1/6`, exacto solo con prueba CAS; Simpson = aproximación |
| T12 | Área | `f=sin(x)`, `g=0` `[0,π]` | `2`, registrar metodología |
| T13 | Área | `f=1/x`, `g=0` en intervalo que cruza 0 | error de dominio/integral impropia, no área regular finita |
| T14 | Parser | bloque `plot2d` con `functions` lista | soporte real o error documentado, no ejemplo oficial inválido |
| T15 | Parser | `curve3d: t=[0,8*pi]` | admitir constante expresiva o explicar la restricción |
| T16 | UI | documento con solo `surface3d` no relacionado con áreas | panel de área fijo ausente |
| T17 | UI | cambiar `f(x)` a `sin(x)` | área mostrada corresponde a `sin(x)` si el bloque existe |
| T18 | UI | mover slider, editar texto no matemático | conservar valor del slider y cámara |
| T19 | UI | abrir `vectorfield2d`, `contour`, `gradient` | se renderizan o avisan de falta de renderer |
| T20 | Contenedor | guardar `assets` binarios y restaurar | bytes y hashes idénticos |
| T21 | Portabilidad | abrir playground sin red | KaTeX y estilos locales disponibles |
| T22 | Seguridad | expresiones con assignment, accessor, grandes AST | rechazadas o confinadas por política |
| T23 | Security Webview | mensajes externos falsificados | no reemplazan el documento |
| T24 | E2E archivo | editar→guardar→abrir | texto, parámetros y estado recuperados |

---

## IX. Hoja de ruta recomendada (orden de implementación)

### Fase A — Recuperar confianza mínima (P0)
1. Resolver Node/pnpm y obtener CI verde. Guardar URL del nuevo run.
2. Corregir secciones y volumen al cruzar el eje. Añadir contraejemplo de cilindro simétrico.
3. Separar revoluciones alrededor de ejes vertical/horizontal; usar cascarones cuando proceda.
4. Dejar de etiquetar Simpson como resultado exacto.
5. Desacoplar panel de análisis del ejemplo fijo; **si no se resuelve todavía, ocultarlo fuera de la lección demo**.
6. Validar discontinuidades y raíces antes de generar áreas acotadas.

### Fase B — Hacer coherente el lenguaje y la experiencia (P1)
1. Parser y documentación sincronizados; pruebas automáticas de EXAMPLES.
2. Registry de 15 bloques para editor, VS Code, Chrome y exportación.
3. Reactividad por AST y estado de controles preservado al editar.
4. Contenedor versionado con manifiesto validado y assets completos.
5. Motor de cálculo cancelable en worker; dominios y errores tipados.
6. CI añade E2E de navegador y pruebas de escenarios límite.

### Fase C — Convertirlo en formato científico extensible (P2/P3)
1. `region2d`, `riemann`, `revolution`, `crossSection` nativos del AST.
2. Motor `ScientificStep` matemáticamente verificable.
3. Visualización avanzada de geometría, vectores, campos y sólidos con cortes reales.
4. Exportaciones reproducibles, estado de exploración y contenedor seguro.
5. APIs de integración multiplataforma y ecosistema de extensiones.

### Orden de primeros 12 issues

| Orden | Issue sugerido | Prioridad | Definition of Done |
|---:|---|---|---|
| 1 | `ci: align Node version with pnpm 11` | P0 | Nuevo run verde y todos los jobs ejecutados |
| 2 | `math: fix washers across revolution axis` | P0 | T02 y T07 pasan |
| 3 | `math: support vertical-axis volume via shells` | P0 | T03 pasa |
| 4 | `math: distinguish exact CAS and numeric approximations` | P0 | T11/T12 reportan método |
| 5 | `studio: remove hardcoded scientific panel` | P0 | T16/T17 pasan |
| 6 | `math: robust intersections and discontinuities` | P0 | T08/T09/T13 pasan |
| 7 | `math: validate Riemann n and numeric domains` | P1 | T10 pasa |
| 8 | `docs: examples as parser tests` | P1 | T14/T15 pasan |
| 9 | `ui: render all supported node kinds` | P1 | T19 pasa |
| 10 | `core: AST dependencies and preserved controls` | P1 | T18 pasa |
| 11 | `container: roundtrip binary assets + schema` | P1 | T20 pasa |
| 12 | `e2e: document editing/preview/save/offline` | P1 | T21/T24 pasan |

---

## X. Inventario de fuentes revisadas y límites de certeza

### Fuentes base de código
- [`package.json`](https://github.com/BlackWolfJM/BWJM/blob/828fcaafa2b3e3a0a5846a3687b98a88db7b01e7/package.json), [`pnpm-workspace.yaml`](https://github.com/BlackWolfJM/BWJM/blob/828fcaafa2b3e3a0a5846a3687b98a88db7b01e7/pnpm-workspace.yaml), [CI](https://github.com/BlackWolfJM/BWJM/blob/828fcaafa2b3e3a0a5846a3687b98a88db7b01e7/.github/workflows/ci.yml).
- [`packages/ast`](https://github.com/BlackWolfJM/BWJM/tree/828fcaafa2b3e3a0a5846a3687b98a88db7b01e7/packages/ast), [`parser`](https://github.com/BlackWolfJM/BWJM/tree/828fcaafa2b3e3a0a5846a3687b98a88db7b01e7/packages/parser), [`math`](https://github.com/BlackWolfJM/BWJM/tree/828fcaafa2b3e3a0a5846a3687b98a88db7b01e7/packages/math), [`core`](https://github.com/BlackWolfJM/BWJM/tree/828fcaafa2b3e3a0a5846a3687b98a88db7b01e7/packages/core), [`renderer-svg`](https://github.com/BlackWolfJM/BWJM/tree/828fcaafa2b3e3a0a5846a3687b98a88db7b01e7/packages/renderer-svg), [`renderer-plotly`](https://github.com/BlackWolfJM/BWJM/tree/828fcaafa2b3e3a0a5846a3687b98a88db7b01e7/packages/renderer-plotly), [`github`](https://github.com/BlackWolfJM/BWJM/tree/828fcaafa2b3e3a0a5846a3687b98a88db7b01e7/packages/github) y [`cli`](https://github.com/BlackWolfJM/BWJM/tree/828fcaafa2b3e3a0a5846a3687b98a88db7b01e7/packages/cli).
- [`apps/playground`](https://github.com/BlackWolfJM/BWJM/tree/828fcaafa2b3e3a0a5846a3687b98a88db7b01e7/apps/playground), [`apps/vscode-extension`](https://github.com/BlackWolfJM/BWJM/tree/828fcaafa2b3e3a0a5846a3687b98a88db7b01e7/apps/vscode-extension), [`apps/chrome-extension`](https://github.com/BlackWolfJM/BWJM/tree/828fcaafa2b3e3a0a5846a3687b98a88db7b01e7/apps/chrome-extension).
- [`README.md`](https://github.com/BlackWolfJM/BWJM/blob/828fcaafa2b3e3a0a5846a3687b98a88db7b01e7/README.md), [`SPEC.md`](https://github.com/BlackWolfJM/BWJM/blob/828fcaafa2b3e3a0a5846a3687b98a88db7b01e7/SPEC.md), [`LANGUAGE.md`](https://github.com/BlackWolfJM/BWJM/blob/828fcaafa2b3e3a0a5846a3687b98a88db7b01e7/LANGUAGE.md), [`EXAMPLES.md`](https://github.com/BlackWolfJM/BWJM/blob/828fcaafa2b3e3a0a5846a3687b98a88db7b01e7/EXAMPLES.md), [`MEJORAS_BWJM.md`](https://github.com/BlackWolfJM/BWJM/blob/828fcaafa2b3e3a0a5846a3687b98a88db7b01e7/MEJORAS_BWJM.md) y [`Especificacion_bwjm_Formato_Cientifico_Interactivo.md`](https://github.com/BlackWolfJM/BWJM/blob/828fcaafa2b3e3a0a5846a3687b98a88db7b01e7/Especificacion_bwjm_Formato_Cientifico_Interactivo.md).
- Tests revisados: `packages/{ast,parser,math,core,github,cli}/__tests__`, `apps/vscode-extension/__tests__`, `vitest.config.ts`; existencia de scripts `test:dist`.

### Qué puedo afirmar y qué no

**Sí pude verificar**: árbol del repositorio; código de los módulos relevantes; fórmulas que se utilizan; textos de documentación; que GitHub Actions falló y por qué, mediante logs; existencia de suites de pruebas y ejemplos.

**No comprobé**: si el `pnpm test` pasa en un entorno compatible; resultados de una compilación local; pruebas visuales en Chrome/VS Code; rendimiento real bajo carga; explotabilidad de posibles riesgos de seguridad; funcionamiento de artefactos de distribución finales. El CI rojo **no demuestra** por sí solo que los tests fallarían después de corregir Node.

**Advertencia sobre informes anteriores**: `MEJORAS_BWJM.md` refleja observaciones de una fase previa y algunas ya no aplican literalmente (por ejemplo, el texto del playground ahora se escapa con `escapeHtml` antes de interpretarse como Markdown inline, y la interfaz incorpora barras laterales/modales). Esta auditoría utiliza el código de la revisión indicada y no traslada sin verificar esas observaciones.

---

# XI. Ampliación indispensable para Cálculo Vectorial para Ingeniería (2026–2)

> **Tipo de esta sección:** especificación de producto y criterios de aceptación. **Todos los bloques nuevos indicados aquí son PROPUESTAS**, no capacidades que ya estén disponibles. No deben aparecer como «implementados» en el README hasta que existan parser, AST, motor matemático, renderer y tests.
>
> **Fuente curricular primaria:** `SILABO ─ CÁLCULO VECTORIAL PARA INGENIERÍA ─ 2026 ─ 2 [V.1] (1).pdf`, páginas 1–3 (objetivos, cuatro unidades, métodos) y 6–11 (secuencia semanal). **Material que concreta el estilo de ejercicios:** `Práctica_dirigida_4(1).pdf`, pp. 1–4; `examen_parcial.pdf`, pp. 1–24; `parte1.pdf` y `parte2_v2.pdf` (apuntes de clase). Las aplicaciones y criterios de implementación son **propuestas técnicas**, no texto de los materiales.
>
 **Fecha de contexto:** 8/11/2026. El calendario del sílabo ubica la semana 13 (integrales de línea) el 9–14/11, la semana 14 (superficies/flujo y PC2) el 16–21/11, la semana 15 (Green, Stokes, divergencia) el 23–28/11 y el examen final el **30/11** (pp. 10–11). Para mejorar el producto sin comprometer la fiabilidad matemática, **primero resolver los P0 de la auditoría**; el orden funcional urgente es distinto del orden de reparación.

## XI.1. Requisitos pedagógicos transversales — no solo una graficadora

- **[CV-01][P1][M] Documento con teoría, variables y gráficas vinculadas de verdad.** Una ecuación escrita en el texto y su visualización deben apuntar al **mismo objeto matemático** con ID estable; modificar el objeto debe actualizar su gráfica, integral, resultado y anotaciones. **Aceptación:** cambiar `f(x,y)=x^2+y^2` a `x^2-y^2` modifica el gradiente, las curvas de nivel y el plano tangente, sin mantener cifras del ejercicio previo. **Base de código:** `packages/ast`, `packages/parser`, `packages/core` y `apps/playground/src/main.tsx`. Resolver primero el hallazgo 06 del informe original.
- **[CV-02][P1][M] Dos modos complementarios: explorar y resolver.** `Explorar`: manipulación libre de los objetos, sin revelar soluciones. `Resolver`: árbol detallado de razonamiento con decisiones, subpasos algebraicos y justificación geométrica. **Aceptación:** cada paso conserva expresión anterior, regla, expresión nueva, hipótesis y estado `verified/conditional/unverified`.
- **[CV-03][P1][M] Cálculo exacto y numérico con procedencia visible.** Incorporar un servicio CAS real o puente local controlado (por ejemplo, SymPy en proceso aislado) para derivación, integrales, simplificación y álgebra; mantener `mathjs` como evaluación y render veloz. **Aceptación:** nunca etiquetar un resultado Simpson como «exacto»; mostrar error/tolerancia y qué backend resolvió cada operación.
- **[CV-04][P1][M] Contratos de dominio, regularidad y orientación.** Cada objeto declara dominio, discontinuidades, intervalo, unidades, orientación y condiciones de aplicación; se verifican antes de aplicar fórmulas. **Aceptación:** no dibujar una curva atravesando una asíntota como si fuese continua; no normalizar un vector nulo; no aplicar Green sin región admisible/orientación.
- **[CV-05][P1][M] Interacción universal, no animaciones para casos fijos.** Deslizadores ligados a parámetros simbólicos, puntos arrastrables y dependencias AST. **Aceptación:** las mismas herramientas funcionan al sustituir `x^2` por `sin(x)`, cambiar un eje o deformar una región sin reescribir componentes. Separar motor, geometría, renderer y UX.
- **[CV-06][P1][M] Modo práctica por procedimiento.** Entrada de operaciones del estudiante, verificación de equivalencia **en el dominio válido**, pistas graduadas, feedback de pasos, errores comunes y soluciones opcionales. **Aceptación:** el alumno puede equivocarse en un límite de integración o en el factor `r` del jacobiano y recibir retroalimentación localizada, sin ver todo el resultado automáticamente.
- **[CV-07][P2][M] Conversión de un ejercicio contextualizado a modelo matemático.** Tarjetas que distingan «datos», «qué pide», «variables», «hipótesis», «diagrama», «método», «procedimiento», «unidades» e «interpretación». **Aceptación:** un problema de flujo ambiental o movimiento industrial puede resolverse sin quedar limitado a un texto sin contexto.
- **[CV-08][P2][M] Fuentes, ejercicios y trazabilidad.** Adjuntar a cada bloque: `source.file`, `source.page`, `course.unit`, `skill`, `difficulty` y `exercise_id`; no copiar un solucionario completo ni anunciar ejercicios con soluciones validadas que no se hayan revisado. **Aceptación:** al abrir la explicación se identifica el capítulo de clase/ejercicio que la motivó.

## XI.2. Unidad 1 — geometría vectorial y diferenciación de varias variables

**Fundamento curricular:** sílabo pp. 2, 6–8. `Práctica_dirigida_4(1).pdf` pp. 1–4 incluye dominios de funciones vectoriales, trayectorias, parametrizaciones, coordenadas cilíndricas/esféricas y límites vectoriales. `examen_parcial.pdf` incluye variantes de cónicas, planos, coordenadas, longitud de arco y derivadas direccionales.

- **[CV-09][P1][M] Constructor de curvas paramétricas 2D y 3D.** Escribir `r(t)=(x(t),y(t),z(t))`, rango y sentido; visualizar un punto móvil, flecha velocidad y trayectoria acumulada. Detectar si el recorrido repite puntos o da varias vueltas. **Prueba:** `r(t)=(3cos t,3sin t,t/2)`, `t∈[0,4π]`: hélice de dos vueltas y cambio de altura `2π`. **Bloques propuestos:** `curve2d`, `curve3d`, `trajectory` (actualmente `curve3d` existe en el AST, pero el playground requiere renderer completo; ver hallazgo 22).
- **[CV-10][P1][M] Conversor entre ecuaciones paramétricas y cartesianas.** Eliminar parámetros cuando sea posible, conservar restricciones y sentido de trazado. **Prueba:** `x=2cos t`, `y=3sin t` ⇒ `x²/4+y²/9=1`, y avisar si el intervalo recorre solo un arco. No confundir lugar geométrico con su parametrización orientada.
- **[CV-11][P1][M] Laboratorio de cónicas, cuadráticas y coordenadas polares.** Clasificación por ecuación, focos, vértices, ejes, asíntotas, excentricidad y directriz; deslizador de parámetros con lugar geométrico. Comparar ecuación cartesiana/polar de una cónica y marcar restricciones. **Prueba:** elipse e hipérbola con formas estándar y cónica desplazada. Las cónicas se estudian en semanas 2 y 4 del sílabo.
- **[CV-12][P1][M] Vectores y planos en R²/R³.** Suma, proyecciones, producto punto/cruz, ángulos, recta-plano, intersecciones, distancia punto-plano y plano por tres puntos. Mostrar el vector normal, los tres puntos y el plano arrastrable. **Prueba:** `P=(1,0,0)`, `Q=(0,1,0)`, `R=(0,0,1)` ⇒ plano `x+y+z=1`; detectar puntos colineales.
- **[CV-13][P1][M] Conversor cilíndrico/esférico/cartesiano con cuadrantes.** Visualizar `θ` desde `+x`, `φ` desde `+z` bajo convención explícita; explicar `atan2` para elegir el cuadrante, radio y rangos angulares. **Prueba:** `(-4,4√3,6)` ⇒ cilíndricas `(8,2π/3,6)`; no utilizar `atan(y/x)` sin corregir cuadrante. Incluir cambios en sentido inverso y superficies constantes.
- **[CV-14][P1][M] Dominio de funciones vectoriales por componentes.** Intersecar condiciones de raíces pares, logaritmos y denominadores; sombrear tramos admitidos en un eje temporal y marcar puntos prohibidos. **Prueba:** `r(t)=(√(6-t), ln(t+2), 1/(t-1))` ⇒ dominio `(-2,1)∪(1,6]` (si `t` no tiene restricción física adicional). Vincular interpretación física `t≥0` cuando el enunciado lo exija.
- **[CV-15][P1][M] Límite y continuidad multivariable con caminos.** Vista de acercamiento 3D a `(a,b)`, animación por rectas, parábolas y curvas polares; distinguir pruebas de no existencia por dos caminos de las demostraciones de existencia. **Prueba:** `f(x,y)=xy/(x²+y²)` hacia `(0,0)` no tiene límite: `y=x` → `1/2`, `y=-x` → `-1/2`. Advertir que «muchos caminos» no prueban existencia.
- **[CV-16][P1][M] Límites de funciones vectoriales y definiciones ε–δ.** Mostrar el límite componente a componente, discontinuidad removible y vecindades en `R²/R³`; permitir editar `ε` y hallar/testear una cota `δ`. **Prueba:** `(sin t/t, (1−cos t)/t, e^{2t})` → `(1,0,1)` para `t→0`. Una gráfica no constituye una demostración ε–δ.
- **[CV-17][P1][M] Parciales, derivadas de orden superior y planos tangentes.** Derivación analítica de `f_x`, `f_y`, `f_{xy}`, Hessiano, vista de cortes `x=a`, `y=b`, rectas tangentes en cortes y plano tangente. **Prueba:** `z=x²+y²` en `(1,2)` ⇒ `z=5+2(x−1)+4(y−2)`. Señalar puntos donde falta diferenciabilidad.
- **[CV-18][P1][M] Regla de la cadena como grafo interactivo.** Dibujar dependencias `z=f(x,y)`, `x=x(t,u)`, `y=y(t,u)`, `t=t(s)` y propagar derivadas resaltando cada camino. **Prueba:** verificar `dz/dt=f_x x'(t)+f_y y'(t)` contra derivación directa tras sustituir.
- **[CV-19][P1][M] Derivada direccional y gradiente manipulables.** Flecha `∇f` sobre un mapa de nivel y una flecha de dirección arrastrable; normalización de vector y ángulo entre ellos. Graficar `D_uf=∇f·u`, máximo `||∇f||`, mínimo `−||∇f||` para direcciones unitarias. **Prueba:** `f=x²+y²`, `(1,2)`, dirección `(3,4)` ⇒ `22/5`. Rechazar dirección cero.
- **[CV-20][P2][M] Diferenciabilidad, diferencial total, linearización y error.** Plano secante/tangente, superficie original, error absoluto/relativo cerca del punto, hipótesis de diferenciabilidad. **Prueba:** aproximar `f(1.01,1.98)` con linearización de `f=x²+y²` en `(1,2)` y comparar con valor real.
- **[CV-21][P2][M] Series de Taylor multivariables.** Construir polinomios de grado 1/2 alrededor de un punto, vista comparativa de superficie y error, con Hessiano visible. **Prueba:** `f=e^{x+y}` cerca de `(0,0)` para orden 2 y control de radio de exploración.

## XI.3. Unidad 2 — curvas vectoriales, curvatura y optimización

**Fundamento curricular:** sílabo pp. 2 y 7–8; `examen_parcial.pdf` contiene longitud, rapidez, curvatura y métodos de Lagrange, además de operaciones combinadas.

- **[CV-22][P1][M] Cinemática de funciones vectoriales.** Calcular `r'`, `r''`, velocidad, rapidez, aceleración, componentes tangencial/normal; animar cada vector en el punto de la trayectoria. **Prueba:** `r(t)=(cos t,sin t,t)` ⇒ rapidez `√2`, independiente de `t`. Separar velocidad vectorial de rapidez escalar.
- **[CV-23][P1][M] Longitud de arco con integral exacta o numérica y Simpson paso a paso.** Control de intervalo, subdivisiones, método numérico (trapecio, Simpson `n` par), valores tabulados y error identificado. **Prueba:** `r(t)=(3cos t,3sin t,4t)`, `t∈[0,2π]` ⇒ longitud `10π`; distinguir distancia recorrida y desplazamiento.
- **[CV-24][P1][M] Marco de Frenet (T,N,B), curvatura y torsión.** Animar `T`, `N`, `B`, círculo osculador, radio de curvatura, puntos de curvatura máxima y trayectoria espacial. **Prueba:** hélice `r=(3cos t,3sin t,4t)` ⇒ `κ=3/25`, `τ=4/25`; si `r'=0` o `T'=0`, indicar qué objeto no está definido. En 2D distinguir las dos normales unitarias posibles.
- **[CV-25][P1][M] Clasificador de puntos críticos y Hessiano.** Graficar `f(x,y)` y curvas de nivel, localizar candidatos `∇f=0`/frontera/no diferenciables, clasificar con criterio adecuado y declarar «inconcluso» cuando `D=0`. **Prueba:** `f=x²+y²` mínimo en `(0,0)`; `f=x²−y²` silla en `(0,0)`.
- **[CV-26][P1][M] Máximos/mínimos absolutos en regiones cerradas y acotadas.** Flujo guiado de interior + frontera paramétrica + vértices/puntos singulares; mostrar los valores comparados en una tabla. **Prueba:** `f=x²+y²` sobre `x²+y²≤4` ⇒ mínimo `0` en el centro y máximo `4` en la circunferencia. No limitarse a resolver `∇f=0`.
- **[CV-27][P1][M] Multiplicadores de Lagrange visualizados.** Curvas/superficies de nivel de objetivo y restricción, tangencia de gradientes, sistema de ecuaciones, candidatos y evaluación final; detectar que hay casos singulares donde la condición estándar no basta. **Prueba:** maximizar `xy` con `x+y=10`, `x,y≥0` ⇒ máximo `25` en `(5,5)`; analizar extremos del dominio.
- **[CV-28][P2][M] Optimización de ingeniería contextualizada.** Asistente que convierte criterios (costo, rendimiento, material, distancia) y restricciones en una función objetivo con unidades y supuestos explícitos; comparador de soluciones y sensibilidad de parámetros. **Aceptación:** variar una cota de restricción actualiza candidatos y gráfica, no solo una tabla fija.

## XI.4. Unidad 3 — integración múltiple y cambio de variables

**Fundamento curricular:** sílabo pp. 2 y 9; semanas 10–12: integración doble, regiones generales, triples, polares/cilíndricas/esféricas, aplicaciones y cambio de variables.

- **[CV-29][P1][M] Editor geométrico de regiones tipo I y II.** Entrada por desigualdades, fronteras y puntos de intersección; selección de región con clic; visualización de segmentos verticales y horizontales animados. Convertir a `a≤x≤b; g_1(x)≤y≤g_2(x)` o `c≤y≤d; h_1(y)≤x≤h_2(y)` **por tramos**. **Prueba:** triángulo `0≤y≤x≤1`: reconocer límites y área `1/2`.
- **[CV-30][P1][M] Integrales dobles sobre rectángulos y regiones generales.** Bloque `double-integral` con `integrand`, `region`, `order`, `exact/approx`, normal y estimación gráfica de volumen firmado. Mostrar capas de Riemann y coordenadas de cada celda. **Prueba:** `∫_0^1∫_0^1 (x+y)dy dx=1`; si el integrando cambia de signo, explicar integral firmada vs volumen geométrico.
- **[CV-31][P1][M] Cambio de orden con animación.** Graficar misma región en `dy dx` y `dx dy`, producir las expresiones equivalentes, partir el dominio cuando sea necesario. **Prueba:** `∫_0^1∫_0^x y dy dx=∫_0^1∫_y^1 y dx dy=1/6`. Nunca intercambiar `dx` y `dy` dejando las mismas cotas sin justificación.
- **[CV-32][P1][M] Transformación polar con elemento de área.** Animar un rectángulo diferencial `dr dθ` transformado en sector de área aproximada `r dr dθ`; mapas simultáneos cartesiano/polar. **Prueba:** `∬_(x²+y²≤1) (x²+y²)dA = ∫_0^{2π}∫_0^1 r³ dr dθ = π/2`.
- **[CV-33][P1][M] Integración triple y sólidos definidos por inecuaciones.** Construir sólido a partir de seis fronteras o desigualdades, cortes por `x/y/z`, planos transparentes y capas volumétricas, orden de integración editable. **Prueba:** volumen de esfera unitaria `4π/3` con método adecuado y restricciones visibles.
- **[CV-34][P1][M] Coordenadas cilíndricas y esféricas para integrales triples.** Selector de convención angular y transformación inversa; mostrar jacobianos `r` y `ρ² sin φ` (para `φ` desde +z), regiones y elementos de volumen deformándose. **Prueba:** integral de `1` sobre bola unitaria `∫_0^{2π}∫_0^π∫_0^1 ρ² sinφ dρ dφ dθ=4π/3`.
- **[CV-35][P1][M] Cambio de variables general y determinante jacobiano.** Escribir `T(u,v)` o `T(u,v,w)`, dibujar malla antes/después, indicar orientación, `|det DT|`, singularidades y posible falta de inyectividad. **Prueba:** `x=2u,y=3v` transforma el cuadrado unitario en rectángulo de área 6. Detectar jacobiano nulo y solapamientos.
- **[CV-36][P2][M] Aplicaciones: masa, centroide, momentos de inercia y promedio.** Vincular densidad variable, dominios, unidades y cálculos exactos/númericos; representar densidad sobre región/sólido. **Prueba:** densidad uniforme `ρ=2` en cuadrado unitario ⇒ masa `2`; centroide `(1/2,1/2)`.
- **[CV-37][P2][M] Intersección de superficies como frontera de integración.** Mostrar paraboloides/planos/cilindros, calcular curvas de corte y convertir proyecciones al plano `xy`, `xz` o `yz`. **Aceptación:** el alumno puede elegir qué sólido está «encima» y por qué necesita partir la región.

## XI.5. Unidades 3 y 4 — integrales de línea, superficie y teoremas fundamentales

**Fundamento curricular:** sílabo pp. 2, 9–10; semanas 13–15. Esta sección es la **máxima prioridad temática inmediata** por el calendario oficial: trabajos con curvas, campos vectoriales, superficies y flujo antes de Green/Stokes/divergencia.

- **[CV-38][P1 URGENTE][M] Visualizador universal de campos vectoriales 2D/3D.** Dar `F=(P,Q[,R])`, rango y densidad; quiver con normalización opcional, color por magnitud, trayectorias de flujo, puntos críticos y restricciones de dominio. Controles de densidad/escala independientes; no normalizar por cero. **Prueba:** `F=(-y,x)` representa circulación antihoraria alrededor del origen.
- **[CV-39][P1 URGENTE][M] Integrales de línea escalares.** Entrada `C: r(t), t∈[a,b]` y `f(x,y,z)`; animar `ds=||r'(t)||dt` y acumulación de `∫_C f ds`. **Prueba:** `f=1` sobre la circunferencia unitaria ⇒ integral `2π`, independientemente del sentido de recorrido.
- **[CV-40][P1 URGENTE][M] Integrales de línea vectoriales/trabajo.** Calcular `∫_C F·dr = ∫_a^b F(r(t))·r'(t)dt`; mover punto, mostrar `F`, tangente, proyección del campo y contribución positiva/negativa. **Prueba:** `F=(-y,x)`, `r=(cos t,sin t)`, `0≤t≤2π` ⇒ `2π` en sentido antihorario y `−2π` al invertir orientación.
- **[CV-41][P1 URGENTE][M] Campos conservativos y potencial escalar.** Verificación de hipótesis del dominio, cálculo de `curl`/derivadas cruzadas, búsqueda de `φ` con `∇φ=F`, independencia de trayectoria donde aplique; comparación de dos rutas con los mismos extremos. **Prueba:** `F=(2x,2y)` tiene `φ=x²+y²`, trabajo de `(0,0)` a `(1,1)` igual a `2`. Un rotacional cero no garantiza conservación si el dominio no cumple las hipótesis pertinentes.
- **[CV-42][P1 URGENTE][M] Constructor de superficies parametrizadas.** Entrada `r(u,v)=(x,y,z)`, dominio paramétrico, malla UV, normal `r_u×r_v`, área diferencial `||r_u×r_v||du dv` y orientación controlable. **Prueba:** `r(u,v)=(u,v,0)` sobre cuadrado unitario ⇒ área 1; invertir orientación cambia normal, no el área.
- **[CV-43][P1 URGENTE][M] Integrales de superficie escalares.** Sombreado de superficie en 3D, cortes y sumas de Riemann; cálculo `∬_S f dS` sobre cartas paramétricas y comparador de parametrizaciones. **Prueba:** `f=1` sobre rectángulo unitario en `z=0` ⇒ 1.
- **[CV-44][P1 URGENTE][M] Flujo de campos a través de superficies.** Flechas de campo y normales de cada elemento de superficie; cálculo `∬_S F·n dS = ∬_D F(r(u,v))·(r_u×r_v) du dv`; al invertir normal cambia signo. **Prueba:** flujo de `F=(0,0,1)` por cuadrado unitario horizontal con normal +z ⇒ `+1`; con normal -z ⇒ `−1`.
- **[CV-45][P1][M] Teorema de Green: circulación y flujo planar.** Mostrar simultáneamente región D, borde orientado, densidad `∂Q/∂x−∂P/∂y` y la integral de contorno; comprobar orientación positiva y dominios. **Prueba:** `F=(-y,x)` y disco unitario ⇒ `∮Pdx+Qdy=2π=∬_D 2dA`. Animar orientación de frontera y cómo el recorrido cambia de signo.
- **[CV-46][P1][M] Teorema de Stokes con borde orientado.** Visualizar superficie S, curva límite `∂S`, normal, `curl F` y sentido correcto por regla de la mano derecha. **Prueba:** `F=(-y/2,x/2,0)`, disco unitario en `z=0` orientado hacia +z ⇒ circulación `π` y flujo de rotacional `π`. Probar normal invertida.
- **[CV-47][P1][M] Teorema de la divergencia (Gauss).** Superficie cerrada, flechas salientes, cálculo de flujo directo e integral de volumen de `div F`; detectar superficies abiertas y huecos. **Prueba:** `F=(x,y,z)` en esfera unitaria orientada hacia afuera ⇒ flujo `4π` (ya que `div F=3`, volumen `4π/3`).
- **[CV-48][P2][M] Operador nabla y laboratorio diferencial de campos.** Un solo bloque `vector-calculus-lab` con `grad`, `div`, `curl`, rotacional numérico y analítico, visualización de condiciones de derivabilidad, y comparación de direcciones. **Prueba:** `F=(-y,x,0)` ⇒ rotacional `(0,0,2)`, divergencia 0.
- **[CV-49][P3][M] Maxwell y formas diferenciales, con formalismo correcto.** El sílabo **sí menciona** ecuaciones de Maxwell, formas diferenciales, integrales de formas k y Stokes generalizado (p. 2), pero el calendario detallado disponible pone énfasis en Green/Stokes/divergencia. Implementar esto **después de aprobar** los bloques anteriores: notación `d`, `∧`, integración en variedades orientadas, Stokes generalizado, y puente entre versiones clásicas y formas diferenciales. **Aceptación:** una guía de las hipótesis y orientación acompaña cada transformación; no presentar una animación electromagnética como demostración formal.

## XI.6. Bloques declarativos propuestos para `.bwjm` (no implementados)

Conservar compatibilidad con los 15 bloques actuales. Añadir nuevos tipos con **ID persistente**, esquema Zod estricto, diagnóstico con `SourceRange`, motor independiente de React y renderer/fallback por bloque. Los campos aquí son **diseño de API**, no sintaxis existente.

```text
region2d, curve2d, trajectory, parametric-surface, coordinate-transform,
partial-derivatives, chain-rule-graph, optimization, lagrange,
double-integral, triple-integral, jacobian, riemann-2d,
line-integral-scalar, line-integral-vector, vector-field3d,
conservative-field, surface-integral-scalar, surface-flux,
green-theorem, stokes-theorem, divergence-theorem,
educational-step, exercise, hint, course-source
```

### Ejemplo A — cambiar orden de integración

````yaml
```region2d
id: triangular-region
constraints:
  - "x >= 0"
  - "x <= 1"
  - "y >= 0"
  - "y <= x"
show: [boundaries, vertical-slices, horizontal-slices]
```
```double-integral
id: integrate-triangle
region: triangular-region
integrand: "y"
order: "dy-dx"
show: [steps, region, change-order]
answerMode: "exact-preferred"
```
````

**Resultado matemático que debe comprobarse:** `1/6`. **Comportamiento:** un selector cambia a `dx-dy` preservando **la misma región** y la solución.

### Ejemplo B — Green y una curva orientada

````yaml
```curve2d
id: boundary
x: "cos(t)"
y: "sin(t)"
t: [0, "2*pi"]
orientation: "ccw"
```
```green-theorem
id: greens-check
field: ["-y", "x"]
region: "x^2+y^2<=1"
boundary: boundary
show: [boundary-arrows, vector-field, curl-density, equality]
```
````

**Resultado esperado:** circulación `2π` = integral de región `2π`. **Importante:** el esquema de dominio debe aceptar constantes simbólicas de manera segura: el parser actual **no acepta** `"2*pi"` como número sin ampliar el esquema (hallazgo 21).

### Ejemplo C — flujo de superficie y Stokes

````yaml
```parametric-surface
id: disk
x: "r*cos(theta)"
y: "r*sin(theta)"
z: "0"
parameters:
  r: [0, 1]
  theta: [0, "2*pi"]
orientation: "+z"
show: [normal-arrows, tangent-grid]
```
```surface-flux
surface: disk
field: ["0", "0", "1"]
show: [projected-field, differential-patches, integral-steps]
```
````

**Resultado esperado:** flujo **`π`** para `F=(0,0,1)` sobre el disco unitario de radio 1; en cambio, el cuadrado unitario de CV-44 produce `1`. Las pruebas deben distinguir las áreas de ambas superficies y evitar resultados reutilizados de otro ejemplo.

## XI.7. Contrato técnico obligatorio para cada nuevo bloque (evitar demos falsas)

1. **Esquema:** `node.type`, `node.id`, expresiones, variables, dominios, orientación, unidades, `sourceRange`, `schemaVersion`.
2. **Análisis estático:** obtener símbolos libres del AST matemático (no regex), verificar referencias a otros bloques, prevenir ciclos y condiciones incompatibles.
3. **Resultado tipado:** `ExactResult | ApproxResult | ConditionalResult | UndefinedResult | UnsupportedResult`, nunca un `number` ambiguo.
4. **Prueba de validez:** dominio finito, límites integrables, regularidad, orientación, continuidad/integrabilidad, singularidades y cambios de signo según corresponda.
5. **Pasos educativos:** `beforeMath`, `afterMath`, `rule`, `whyApplicable`, `assumptions`, `verified`, `subSteps` y vínculos a entidades geométricas.
6. **Render y controles:** SVG/Plotly/Three, capas, estado de cámara, cortes, animación, zoom, selección, asistencia para teclado y texto alternativo matemático.
7. **Reactividad:** modificar un parámetro solo recalcula los objetos dependientes; el mismo ejercicio produce la misma respuesta en Studio, extensión VS Code y exportador.
8. **Persistencia:** guardar expresiones originales, parámetros, idioma, estados de exploración, soluciones y versión de motor en `.bwjm` / contenedor futuro. Nunca ejecutar código arbitrario de los documentos.
9. **Rendimiento:** límites de muestreo, cancelación real, workers/aislamiento, degradación suave, evitación de recompilar cada muestra, presupuesto máximo de CPU/memoria.
10. **Pruebas:** unitarias por objeto, matemática de referencia independiente, regresión visual, integración parser→core→renderer, pruebas de archivo abierto/guardado y seguridad.

### Contrato de pasos pedagógicos (diseño de TypeScript)

```typescript
type Certainty = 'verified' | 'conditional' | 'numeric' | 'unverified';
type ValueStatus = 'exact' | 'approximate' | 'undefined' | 'unsupported';

interface EducationalStep {
  id: string;
  ruleId: string;
  explanation: string;
  beforeMath: string;
  afterMath: string;
  assumptions: string[];
  certainty: Certainty;
  children: EducationalStep[];
  relatedObjectIds: string[];
}

interface MathResult {
  status: ValueStatus;
  expression?: string;
  numericValue?: number;
  absoluteErrorBound?: number;
  method: string;
  domain?: string;
  steps: EducationalStep[];
}
```

**Restricción central:** que un paso tenga LaTeX renderizable no implica que sea matemáticamente correcto. La verificación debe validar las transformaciones y sus hipótesis, no comparar solo las cadenas.

## XI.8. Pruebas de aceptación adicionales (temario × comportamiento)

| ID | Concepto y caso | Resultado/condición obligatoria | Tipo de comprobación |
|---|---|---|---|
| CV-T01 | Plano por `(1,0,0),(0,1,0),(0,0,1)` | `x+y+z=1` | Exacta, muestra normal |
| CV-T02 | Punto `(-4,4√3,6)` → cilíndricas | `(8,2π/3,6)` | Exacta, verifica cuadrante |
| CV-T03 | Dominio `r(t)=(√(6−t),ln(t+2),1/(t−1))` | `(-2,1)∪(1,6]` | Conjuntos e intervalos |
| CV-T04 | `xy/(x²+y²)` en origen | Límite no existe | Caminos `y=x`, `y=−x` |
| CV-T05 | Plano tangente `x²+y²` en `(1,2)` | `z=5+2(x−1)+4(y−2)` | CAS + superficie |
| CV-T06 | Direccional `x²+y²`, `(1,2)`, `(3,4)` | `22/5` | Exige vector unitario |
| CV-T07 | Hélice `(3cos t,3sin t,4t)` | `||r'||=5`, `κ=3/25`, `τ=4/25` | CAS y vectores Frenet |
| CV-T08 | Extremos `x²+y²` en disco `r≤2` | Mín. 0; máx. 4 | Interior+frontera |
| CV-T09 | Lagrange: `max xy`, `x+y=10`, `x,y≥0` | 25 en `(5,5)` | Condiciones y frontera |
| CV-T10 | Cambiar orden en triángulo `0≤y≤x≤1`, integral de `y` | `1/6` en ambos órdenes | Visualización por rebanadas |
| CV-T11 | Polar: `∬disk (x²+y²)dA` | `π/2` | Factor jacobiano `r` |
| CV-T12 | Bola unitaria, integrando 1 | `4π/3` | Jacobiano esférico |
| CV-T13 | Integral escalar `∫_circle 1 ds` | `2π` con ambas orientaciones | `ds≥0` |
| CV-T14 | `F=(-y,x)` en círculo CCW | `2π`; orientación invertida `−2π` | Trabajo vectorial |
| CV-T15 | Potencial `F=(2x,2y)` entre `(0,0)` y `(1,1)` | Trabajo `2` por cualquier camino admisible | Conservación |
| CV-T16 | Flujo `F=(0,0,1)` por cuadrado unitario | `+1` hacia +z; `−1` hacia −z | Normal y orientación |
| CV-T17 | Flujo `F=(0,0,1)` por disco unitario | `π` hacia +z | Área real del disco |
| CV-T18 | Green: `F=(-y,x)` sobre disco unitario | Circulación `2π` = doble integral `2π` | Dos métodos independientes |
| CV-T19 | Stokes: `F=(-y/2,x/2,0)` y disco unitario | `π` por borde y superficie | Regla mano derecha |
| CV-T20 | Gauss: `F=(x,y,z)` sobre esfera unitaria | Flujo `4π` | Volumen vs superficie |
| CV-T21 | `f=|x|` en cero | Derivada no existe | No falsear tangente |
| CV-T22 | Curva con `r'(t)=0` | No mostrar `T=r'/||r'||` como definida | Degeneraciones |
| CV-T23 | Constante `2π` en límite declarado | Se interpreta correctamente o diagnóstico explícito | Parser y Zod |
| CV-T24 | Abrir documento con `sin(x)` | NO mostrar automáticamente resultados `x` contra `x²` | Estado y asociaciones |
| CV-T25 | Campo irregular y corte en singularidad | Zona excluida; no integrar sin hipótesis | Dominio |
| CV-T26 | Cambiar parámetro mientras se rota 3D | Conserva cámara/selección y no mezcla revisiones | E2E + render |

## XI.9. Prioridad real de construcción — deuda previa + necesidades de clase

**Bloque 0 — Antes de prometer exactitud científica.** Resolver hallazgos 01–08 de la auditoría inicial (CI, integral/volumen exactos vs numéricos, rotación correcta, gráficas correspondientes al documento, discontinuidades). Sin esto **no confiar en números del nuevo laboratorio**.

**Bloque 1 — Uso urgente de las semanas 13–15 (MVP del curso).** Implementar en este orden `CV-38` (campos), `CV-09`/`CV-42` (curvas y superficies), `CV-40` (línea vectorial), `CV-39` (línea escalar), `CV-41` (conservativos), `CV-44` (flujo), `CV-43` (superficie escalar), `CV-45` (Green), `CV-46` (Stokes) y `CV-47` (Gauss). Los cálculos deben salir correctos antes de invertir en gráficos sofisticados.

**Bloque 2 — Completar lo esencial del semestre.** `CV-29` a `CV-35` (regiones, integración múltiple, jacobianos) y `CV-17` a `CV-27` (derivadas, gradiente, curvas, extremos y Lagrange). El estudiante debe poder cambiar datos de los ejercicios y verificar cada paso algebraico.

**Bloque 3 — Fundación espacial y expansión.** `CV-10` a `CV-16` (cónicas, vectores, sistemas de coordenadas, límites), `CV-20`, `CV-21`, `CV-28`, `CV-36`, `CV-37`, `CV-48`, con gráficos manipulables y fuentes trazadas a clase.

**Bloque 4 — Avanzado formal.** `CV-49` (Maxwell, formas diferenciales y Stokes generalizado) solo después de contar con un motor de campos/superficies orientadas confiable.

### Entregables de ingeniería (issues sugeridos)

1. `fix(ci): Node y pnpm compatibles + tests de regresión matemáticos en PR`.
2. `fix(math): volumen al cruzar eje; orientación y discos/arandelas/cascarones`.
3. `refactor(runtime): asociar objetos declarativos con resultados y eliminar panel hardcoded`.
4. `feat(ast/parser): region2d + curve2d + parametric-surface + referencias estables`.
5. `feat(math): cálculo simbólico de derivadas, límites y antiderivadas con fallback numérico etiquetado`.
6. `feat(visual): motor de campos 2D/3D y visualización de curvas orientadas`.
7. `feat(calculus): line-integral-scalar + line-integral-vector + pasos verificados`.
8. `feat(calculus): vector conservative-field, dominio, potencial y caminos comparativos`.
9. `feat(surface): superficie paramétrica, normales, área y flujo`.
10. `feat(theorems): Green/Stokes/Gauss y tests de igualdad de ambas rutas`.
11. `feat(integration): regiones de tipo I/II, cambio de orden, polar/triples y jacobiano`.
12. `feat(education): hoja de estudio, pistas, respuesta parcial, tracking y export reproducible`.

## XI.10. Qué **NO** prometer ni implementar como atajo

- No convertir `mathjs` en un CAS «exacto» por cambiar el nombre de una función; cálculo numérico ≠ demostración analítica.
- No asumir que los 15 tipos del parser se ven en BWJM Studio: el registro de renderers debe cubrirlos y probarlos.
- No calcular superficies ni integrales sobre regiones cruzando polos/singularidades sin partir el dominio.
- No interpretar una hélice, superficie o integral a partir de una imagen: la fuente es la ecuación y sus hipótesis.
- No mezclar área positiva, integral firmada, trabajo orientado y flujo firmado; cada cantidad tiene una semántica diferente.
- No usar animaciones preparadas para `x` y `x²` como respuesta a todos los ejercicios. Los objetos son **paramétricos y declarativos**.
- No afirmar que los contenidos de Maxwell/formas diferenciales fueron desarrollados en las clases solo porque aparecen en la **Unidad 4 del sílabo**. Su prioridad de producto es posterior a los temas explícitos en el calendario.

**Criterio final de calidad:** BWJM será útil para aprender Cálculo Vectorial si permite **plantear una situación, construir su objeto matemático, manipularlo, resolverlo con hipótesis visibles, verificar cada paso, interpretar el resultado y guardar la experiencia como documento reproducible**. Una captura 3D atractiva por sí sola no cumple ese objetivo.

## Conclusión

**BWJM es actualmente un prototipo funcional prometedor de lenguaje declarativo y visor científico, no todavía una plataforma matemática general con exactitud certificada.** La inversión más rentable hoy no es añadir diez visualizaciones: es conseguir CI verde, corregir la geometría de revolución, distinguir exacto de aproximado y conectar el panel de análisis con los objetos reales del documento. Con esas bases, la arquitectura modular existente sí ofrece un camino razonable para una extensión abierta y escalable.
