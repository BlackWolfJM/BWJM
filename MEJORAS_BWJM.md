# BWJM: qué falta para ser un mejor proyecto

Documento de trabajo para el repositorio `BlackWolfJM/BWJM`. Reúne el diagnóstico del estado actual, las brechas frente a la especificación, el rediseño del editor (barra de herramientas, fórmulas, gráficas, interfaz 3D), las skills de skills.sh que conviene instalar y los repositorios recomendados.

Está escrito para que lo lea tanto una persona como un agente (Claude Code, ECC, etc.). La sección 10 es el prompt operativo para el agente.

---

## 1. Diagnóstico del estado actual

| Área | Estado | Observación |
|---|---|---|
| Parser (`packages/parser`) | Funcional | remark + YAML + Zod. Bien separado del renderer. |
| AST (`packages/ast`) | Funcional | Tipos y esquemas para los bloques actuales. |
| Motor matemático (`packages/math`) | Parcial | Intersecciones, Riemann, revolución. Falta CAS simbólico, EDO, álgebra lineal. |
| Reactividad (`core`, `graph`) | Funcional | Grafo de dependencias con recálculo incremental. |
| Renderizado 2D | Funcional | SVG propio. |
| Renderizado 3D | Parcial | Solo Plotly. `renderer-three` está vacío. |
| Playground (BWJM Studio) | Básico | ~1.170 líneas en un solo `main.tsx`, DOM manual con `innerHTML`, sin componentes. |
| Extensión VS Code | Funcional | Webview propia. |
| Extensión Chrome | Básica | 80 líneas; `matches` demasiado amplio. |
| Exportador (`packages/github`) | Incompleto | TODOs en cuadrícula, ejes, vectores y puntos. |
| `packages/react`, `renderer-three`, `apps/docs`, `apps/demo-vector-calculus` | Vacíos | Solo `.placeholder`. |
| Tests | Escasos | Un archivo por paquete; el playground no tiene ninguno. |

Problemas transversales:

1. **Nombre inconsistente.** El `package.json`, los paquetes `@mathmd/*`, ARCHITECTURE.md y LANGUAGE.md dicen MathMD; el README y la especificación dicen BWJM. La especificación además propone el contenedor `.scinote`, mientras que el formato se llama `.bwjm`. Hay que decidir un solo nombre y un solo contenedor.
2. **El formato hoy es Markdown plano con bloques.** La especificación propone un paquete ZIP con `manifest.json`, `objects/`, `states/`, `tests/`. Esa distancia es la mayor brecha estructural.
3. **Seguridad del visor.** `formatInlineMarkdown` no escapa HTML y se asigna con `innerHTML`; la extensión de Chrome usa `postMessage(..., "*")`; el sandbox de expresiones es una lista negra con regex.
4. **La interfaz actual se percibe genérica.** Panel dividido editor/lector sin barra de herramientas, sin menús, sin paneles laterales, sin estado de documento.

---

## 2. Decisiones de estructura (hacer primero)

1. **Unificar nombre.** Renombrar `@mathmd/*` a `@bwjm/*` y actualizar `package.json`, ARCHITECTURE.md, LANGUAGE.md y SPEC.md. Dejar un alias de compatibilidad solo si hay usuarios externos.
2. **Elegir contenedor.** Mantener `.bwjm` como archivo de texto (Markdown con bloques) para la lectura y Git, y añadir un contenedor `.bwjmz` (ZIP) para el paquete completo. Así se conserva la legibilidad y se llega a la arquitectura de la especificación.
3. **Estructura del paquete `.bwjmz`:**

```text
leccion.bwjmz
├── manifest.json
├── document.bwjm
├── objects/
├── states/
├── assets/
├── tests/
└── scripts/
```

4. **Separar paquetes de UI.** Crear `packages/ui` (componentes), `packages/editor` (núcleo del editor) y `packages/viewer-3d` (escena Three.js). Mantener la regla actual: parser, AST y motor sin dependencias de React ni del DOM.
5. **Esquema versionado.** Añadir `bwjmVersion` en el manifiesto y migraciones reversibles, como pide la sección 12 de la especificación.

---

## 3. Funcionalidades de la especificación que faltan

Marcadas según la sección de `Especificacion_bwjm_Formato_Cientifico_Interactivo.md`. Prioridad: **A** (núcleo), **B** (importante), **C** (ecosistema).

### Gráficas y geometría (§2)
- [A] Curvas implícitas `F(x,y)=0`, paramétricas y polares en 2D.
- [A] Desigualdades y regiones definidas por condiciones, con sombreado.
- [A] Capas activables: ejes, cuadrícula, etiquetas, puntos críticos, normales, trazas.
- [A] Lecturas al pasar el cursor: coordenadas, pendiente, distancia, ángulo.
- [B] Edición directa arrastrando puntos, coeficientes y límites.
- [B] Superficies implícitas y paramétricas `r(u,v)`; curvas espaciales; cuerpos.
- [B] Vistas coordinadas (planta, perfil, perspectiva, sección) sincronizadas.
- [B] Comparación `f`, `f'`, `∫f` con cursor compartido.
- [C] Exportación SVG/PNG y modelos OBJ/STL/GLTF con unidades y leyendas.

### Área entre curvas (§3)
- [A] Verificar función superior e inferior en cada subintervalo, no solo globalmente.
- [A] Zonas desconectadas y más de dos cruces: segmentar la región por piezas.
- [A] Aviso cuando falten límites para definir un área finita.
- [B] Cambio del sentido de integración (cortes horizontales) con explicación.
- [B] Multiplicidad y tangencia en intersecciones.

### Revolución (§4)
- [A] Eje arbitrario: recta en 2D/3D, dos puntos o vector director.
- [A] Detección de región que cruza el eje o lo contiene, con adaptación de la integral.
- [A] Métodos de discos, arandelas y capas cilíndricas con explicación del método elegido.
- [B] Separar en la interfaz volumen, área de superficie, recorrido angular y multiplicidad de barrido.
- [B] Opacidad ajustable y malla de alambre.
- [B] Reproducción en cámara lenta, retroceso y posicionamiento exacto del ángulo.

### Motor (§5)
- [A] Representación estructurada de expresiones (AST propio o MathJSON), con LaTeX solo como vista.
- [A] Objetos semánticos: `Function`, `Curve`, `Surface`, `Region`, `VectorField`, `Integral`, `Transformation`, `Constraint`, `Simulation`, `Assessment`.
- [A] Validación de dominios: denominadores cero, raíces, logaritmos, discontinuidades.
- [B] CAS simbólico (SymPy vía Pyodide o Compute Engine) para integrales, derivadas y resolución de ecuaciones.
- [B] Modo inspección: qué algoritmo se usó y si el resultado es exacto, numérico o estimado.
- [B] Entrada por lenguaje natural traducida a operaciones estructuradas verificables.
- [C] Sistema de plugins con manifiesto de capacidades, versionado y permisos.

### Apuntes y lectura (§6)
- [A] Anotaciones ancladas a coordenadas matemáticas, no a píxeles.
- [B] Vínculos bidireccionales entre apuntes e índice conceptual.
- [B] Referencias bibliográficas (DOI, URL, licencias).
- [B] Historial de versiones y comparación de fórmulas.
- [C] Importación desde PDF, LaTeX, Jupyter y exportación con degradación elegante a PDF (capturas + QR).
- [C] Sincronización opcional y coedición.

### Aprendizaje activo (§7)
- [B] Pistas graduadas, respuestas equivalentes, resolución paso a paso con condiciones de validez.
- [B] Modo examen y ejercicios generativos con parámetros aleatorizados.
- [C] Práctica espaciada, mapa de prerrequisitos, progreso conceptual.
- [A] Modo accesible: teclado, lectores de pantalla, descripción textual de escenas, contraste.

### Disciplinas (§8)
- [B] Álgebra: manipulación paso a paso, transformaciones de funciones, matrices y autovalores.
- [B] Cálculo: límites ε-δ, series de Taylor, secante a tangente, integrales impropias.
- [B] Cálculo vectorial: gradiente, plano tangente, Lagrange, jacobiano animado, Green/Stokes/Gauss.
- [C] Ecuaciones diferenciales, física, probabilidad y estadística, datos experimentales con unidades.

### Seguridad y pruebas (§12, §15)
- [A] Abrir no significa ejecutar: código embebido tratado como no confiable.
- [A] Carpeta `tests/` dentro del documento con casos verificables y un ejecutor en el visor.
- [A] Los ocho casos de prueba de la sección 15 convertidos en tests automáticos.

---

## 4. Rediseño del editor: BWJM Studio

### 4.1. Objetivo visual

La interfaz actual se ve genérica por tres motivos: no hay jerarquía de herramientas, el diseño no tiene identidad propia y todo está construido con DOM manual. El objetivo es un editor con aspecto de herramienta profesional de publicación científica (en la línea de Word, Overleaf, Notion o Typora), con identidad propia y tema oscuro como opción principal.

Principios:

- Barra de herramientas densa pero ordenada, con grupos separados y tooltips con atajo.
- Paneles acoplables: estructura del documento, propiedades del objeto seleccionado, variables y parámetros.
- Vista previa viva que se actualiza al escribir, con modos: solo editor, dividido, solo lector.
- Tipografía científica (serif para el lector, monoespaciada para el editor) y una paleta propia, no los degradados y tarjetas redondeadas por defecto.
- Iconografía coherente (Lucide u otro set único).

### 4.2. Distribución general

```text
┌──────────────────────────────────────────────────────────────────┐
│ Menú: Archivo  Editar  Insertar  Formato  Gráficas  Ver  Ayuda   │
├──────────────────────────────────────────────────────────────────┤
│ Barra de herramientas (ver 4.3)                                   │
├───────────┬──────────────────────────────────┬───────────────────┤
│ Esquema   │  Editor / Lector                 │ Propiedades       │
│ Variables │  (dividido o por pestañas)       │ Parámetros        │
│ Archivos  │                                  │ Inspección        │
├───────────┴──────────────────────────────────┴───────────────────┤
│ Barra de estado: palabras, errores de parseo, modo, versión      │
└──────────────────────────────────────────────────────────────────┘
```

### 4.3. Barra de herramientas (grupos)

| Grupo | Herramientas |
|---|---|
| Archivo | Nuevo, Abrir, Guardar, Exportar (PDF, LaTeX, SVG, PNG, HTML estático), Deshacer, Rehacer |
| Texto | Estilo de párrafo (H1-H3, cita, llamada), negrita, cursiva, código en línea, tachado, color de resaltado |
| Listas y bloques | Lista con viñetas, numerada, tareas, cita, regla horizontal, tabla, llamada (teorema, definición, ejemplo, nota) |
| Matemáticas | **Insertar fórmula**, fórmula en línea, fórmula en bloque, ecuación numerada, símbolos (griegos, operadores), plantillas (fracción, raíz, integral, sumatoria, matriz, sistema) |
| Gráficas | **Insertar gráfica 2D**, superficie 3D, campo vectorial, curvas de nivel, área entre curvas, sólido de revolución, deslizador, casilla |
| Insertar | Imagen, diagrama, tabla de datos (CSV), enlace, referencia bibliográfica, nota al pie, anotación sobre gráfica |
| Ejercicios | Ejercicio, pista graduada, solución oculta, pregunta de predicción, bloque de examen |
| Vista | Editor, dividido, lector, pantalla completa, tema claro/oscuro, zoom, modo enfoque |
| Herramientas | Buscar y reemplazar, ir a bloque, verificar documento, ejecutar tests del documento, modo inspección |
| IA (opcional) | Explicar bloque, generar gráfica desde texto, revisar procedimiento |

### 4.4. Herramienta "Añadir fórmula"

Flujo:

1. El usuario pulsa **Insertar fórmula** (o `Ctrl+Shift+M`).
2. Se abre un diálogo con tres zonas: campo de entrada matemático (MathLive) o campo LaTeX, vista previa renderizada con KaTeX y una paleta de plantillas.
3. El usuario escribe en modo visual (`\frac{a}{b}`, `\int`) o en LaTeX directo. El campo traduce entre ambos.
4. Al confirmar, el editor inserta en la posición del cursor:
   - en línea: `$ ... $`
   - en bloque: `$$ ... $$`
   - numerada: `$$ ... \tag{n} $$`
5. La fórmula insertada se renderiza de inmediato en el lector y se puede reabrir con doble clic para editarla.
6. Si el LaTeX es inválido, el diálogo muestra el error de KaTeX y no inserta hasta corregirlo.

Extras:

- Historial de fórmulas recientes y favoritas.
- Conversión de la fórmula a objeto computable (`plot2d`, `integral`) con un botón: "Graficar esta expresión".
- Reconocimiento de fórmula manuscrita o en imagen como función futura.

Interfaz sugerida del contrato:

```typescript
interface FormulaDialogResult {
  latex: string;
  mode: "inline" | "block" | "numbered";
  label?: string;
}

interface EditorCommands {
  insertFormula(result: FormulaDialogResult): void;
  insertChart(spec: ChartInsertSpec): void;
  insertBlock(type: BwjmBlockType, defaults?: Record<string, unknown>): void;
}
```

### 4.5. Herramienta "Añadir gráfica"

Flujo:

1. Pulsar **Insertar gráfica** y elegir tipo: función 2D, paramétrica, polar, implícita, superficie 3D, campo vectorial, área entre curvas, sólido de revolución.
2. Un asistente de pasos pide los datos mínimos con valores por defecto y vista previa viva:
   - ecuación(es), dominio, muestras;
   - parámetros (deslizadores que se crean automáticamente al detectar variables libres);
   - capas (ejes, cuadrícula, puntos críticos).
3. Al confirmar, se inserta el bloque correspondiente en la sintaxis del lenguaje:

````markdown
```plot2d
equation: a*x^2
x: [-5, 5]
```
````

4. El bloque queda enlazado a un panel de **Propiedades**, desde donde se edita sin tocar el texto.
5. Cada gráfica tiene un menú contextual: duplicar, convertir a 3D, exportar, bloquear parámetros.

### 4.6. Otras herramientas de escritura que agilizan

- Menú de comandos con `/` (insertar bloque escribiendo `/teorema`, `/gráfica`, `/ejercicio`).
- Paleta de comandos global (`Ctrl+K`).
- Autocompletado de variables, funciones y nombres de bloques.
- Plegado de bloques y navegación por esquema.
- Fragmentos reutilizables (plantillas de lección, teorema-demostración, ejercicio resuelto).
- Corrector ortográfico y ajuste de ancho de línea.
- Edición multicursor y reemplazo por expresión regular.
- Arrastrar y soltar imágenes y archivos CSV.
- Marcadores de errores en el margen del editor, con mensaje del parser.

### 4.7. Interfaz 3D

Objetivo: una escena 3D como ciudadano de primera clase, no solo un gráfico incrustado.

- Escena Three.js en `packages/renderer-three` (hoy vacío), con `OrbitControls`, proyección ortográfica/perspectiva y selección de objetos.
- Panel de capas: superficie, malla, planos de corte, normales, vectores, ejes.
- Cámara guardable por vista (estados reproducibles en `states/`).
- Barra 3D flotante: restablecer vista, vistas estándar (planta, frente, lateral, isométrica), captura PNG, pantalla completa, rejilla y ejes.
- Barrido de revolución progresivo con control de ángulo hasta `3π` y plano de corte arrastrable.
- Rendimiento: niveles de detalle, `InstancedMesh` para campos vectoriales densos, recalcular solo lo afectado.
- Accesibilidad: descripción textual de la escena y navegación con teclado.
- Opcional: exportación a GLTF/OBJ/STL y modo AR/VR a futuro.

### 4.8. Migración técnica del playground

1. Pasar `apps/playground` de DOM manual a **React + TypeScript** (usar el paquete `packages/react`, hoy vacío).
2. Sustituir el editor de texto por un editor real:
   - **CodeMirror 6** si se mantiene el modo código fuente con resaltado del lenguaje BWJM.
   - **Tiptap/ProseMirror** si se quiere un modo WYSIWYG con bloques vivos.
   - Recomendación: CodeMirror 6 para el modo fuente y Tiptap para el modo visual, ambos sobre el mismo AST.
3. Estado global con un store simple (Zustand) y comandos del editor centralizados (`EditorCommands`).
4. Sistema de diseño propio con tokens (color, espaciado, radio, sombra) y componentes accesibles (Radix UI + shadcn/ui).
5. Atajos de teclado configurables.
6. Persistencia local (IndexedDB) y recuperación de sesión.

---

## 5. Seguridad

Lista de tareas concretas:

1. Escapar el texto antes de aplicar formato en `formatInlineMarkdown` y pasar todo HTML generado por un sanitizador (DOMPurify) antes de `innerHTML`; mejor, eliminar `innerHTML` al migrar a React.
2. Cambiar la lista negra `FORBIDDEN_FUNCTION_PATTERN` por una **lista blanca** de funciones permitidas de mathjs, y compilar en un entorno con `import`, `createUnit`, `evaluate`, `parse` y `simplify` deshabilitados.
3. Extensión de Chrome: restringir `matches` (evaluar solo `file://`), usar un `targetOrigin` explícito en `postMessage`, declarar CSP, no reemplazar `document.body` entero.
4. Política de ejecución: el código en `scripts/` no se ejecuta sin consentimiento y siempre en sandbox (Web Worker o iframe con `sandbox`), con límites de CPU, memoria y tiempo.
5. Integridad: hash del paquete `.bwjmz` y aviso para extensiones desconocidas.
6. Dependencias: auditoría automática en CI (`pnpm audit`, OSV-Scanner), detección de secretos (gitleaks) y análisis estático (Semgrep, reglas para JS/TS).
7. Fuzzing del parser con `fast-check` para entradas malformadas.
8. Revisar licencias de dependencias (license-checker).

---

## 6. Calidad, pruebas y CI

- Tests unitarios por paquete con cobertura mínima (objetivo: 80 % en `parser`, `math`, `core`).
- Convertir los ocho casos de la sección 15 de la especificación en pruebas de integración.
- Pruebas de regresión visual de los renderizadores (capturas comparadas).
- Pruebas E2E del editor con Playwright (insertar fórmula, insertar gráfica, guardar y reabrir).
- Pruebas de accesibilidad automáticas con axe-core.
- Storybook para los componentes de interfaz.
- CI: añadir cobertura, auditoría de dependencias, Semgrep y compilación de extensiones.
- Formatear con un solo estándar (Prettier ya está configurado) y activar `lint-staged` con hooks de pre-commit.

---

## 7. Documentación y ecosistema

- Rellenar `apps/docs` con un sitio de documentación (VitePress o Docusaurus) con guía de sintaxis, tutoriales y referencia de bloques.
- Publicar la especificación del formato por versiones, con un validador y pruebas de conformidad.
- Galería de ejemplos: las cuatro lecciones del playground más cálculo vectorial (`demo-vector-calculus`).
- Publicar los paquetes en npm con nombres y versión semántica unificados.
- `CONTRIBUTING.md`, plantillas de issues y PR, `SECURITY.md`, `CODE_OF_CONDUCT.md`.
- Un `AGENTS.md` / `CLAUDE.md` en la raíz con las reglas de la sección 10 (el repo ya lo menciona en ARCHITECTURE.md pero el archivo no existe).

---

## 8. Skills de skills.sh que conviene instalar

Consultado en [skills.sh](https://www.skills.sh/). La página solo muestra nombre, repositorio e instalaciones; el propósito de cada skill se infiere del nombre, así que conviene leer su documentación antes de instalarlas. Comando general:

```bash
npx skills add owner/repo
```

Si el comando no coincide con la CLI actual, consultar [la documentación de la CLI](https://www.skills.sh/docs/cli).

### Diseño de interfaz (prioridad alta para el editor)

| Skill | Repositorio | Uso en BWJM |
|---|---|---|
| frontend-design | `anthropics/skills` | Base para construir pantallas con identidad propia y evitar el aspecto genérico. |
| ui-ux-pro-max | `nextlevelbuilder/ui-ux-pro-max-skill` | Decisiones de UI/UX para la barra de herramientas y los paneles. |
| design-taste-frontend | `leonxlnx/taste-skill` | Criterio estético para pulir el resultado. |
| impeccable | `pbakaus/impeccable` | Refinamiento visual: espaciado, jerarquía, detalles. |
| emil-design-eng | `emilkowalski/skills` | Interacciones y animaciones cuidadas. |
| web-design-guidelines | `vercel-labs/agent-skills` | Guías de diseño web; puede cubrir parte de la accesibilidad. |
| shadcn | `shadcn/ui` | Componentes accesibles para menús, diálogos y paneles. |

### Código frontend

| Skill | Repositorio | Uso en BWJM |
|---|---|---|
| vercel-react-best-practices | `vercel-labs/agent-skills` | Migración del playground a React. |
| vercel-composition-patterns | `vercel-labs/agent-skills` | Composición de los componentes del editor. |

### Calidad y método

| Skill | Repositorio | Uso en BWJM |
|---|---|---|
| tdd | `mattpocock/skills` | Pruebas primero para el parser y el motor. |
| test-driven-development | `obra/superpowers` | Alternativa o complemento a la anterior. |
| verification-before-completion | `obra/superpowers` | Verificar antes de dar tareas por terminadas. |
| systematic-debugging | `obra/superpowers` | Depuración ordenada de errores del motor. |
| improve-codebase-architecture | `mattpocock/skills` | Revisión de arquitectura del monorepo. |
| grill-with-docs | `mattpocock/skills` | Contrastar decisiones con la documentación y la especificación. |
| brainstorming, writing-plans | `obra/superpowers` | Planificar cada fase antes de implementar. |
| git-guardrails-claude-code | `mattpocock/skills` | Protecciones de Git para que el agente no destruya trabajo. |

### Agentes y herramientas

| Skill | Repositorio | Uso en BWJM |
|---|---|---|
| agent-browser | `vercel-labs/agent-browser` | Probar el editor en un navegador real y comprobar la interfaz. |
| find-skills | `vercel-labs/skills` | Descubrir skills nuevas durante el proyecto. |
| skill-creator | `anthropics/skills` | Crear skills propias de BWJM (por ejemplo, "añadir un bloque nuevo al lenguaje"). |
| writing-great-skills | `mattpocock/skills` | Redactar bien esas skills propias. |

### Huecos: no hay skills en skills.sh para esto

La página no muestra skills específicas de **editores WYSIWYG**, **Three.js/3D**, **matemáticas**, **seguridad** ni **accesibilidad** (la más cercana a accesibilidad es `web-design-guidelines`, sin confirmar). Para esas áreas hay dos caminos:

1. Cubrirlas con las librerías y herramientas de la sección 9.
2. Crear skills propias con `skill-creator`: `bwjm-add-block`, `bwjm-security-review`, `bwjm-three-scene`, `bwjm-formula-tool`.

---

## 9. Repositorios y herramientas recomendadas

Ya los tienes instalados: **Claude Everything / ECC** (`affaan-m/everything-claude-code`), **Claude Mem** (`thedotmack/claude-mem`). Lo siguiente es lo que se suma. Todos los de librerías son proyectos conocidos; comprueba su estado y licencia antes de adoptarlos.

### Editor y fórmulas

| Proyecto | Para qué |
|---|---|
| CodeMirror 6 (`codemirror/dev`) | Editor de código fuente extensible con resaltado del lenguaje BWJM. |
| Tiptap / ProseMirror | Editor visual por bloques (modo WYSIWYG) con extensiones propias para fórmulas y gráficas. |
| MathLive (`arnog/mathlive`) | Campo de entrada de fórmulas editable visualmente; base de "Añadir fórmula". |
| Compute Engine (`cortex-js/compute-engine`) | Análisis de LaTeX y operaciones simbólicas, formato MathJSON. |
| KaTeX | Renderizado rápido de LaTeX (ya en uso). |
| Typst | Alternativa de composición tipográfica para exportar a PDF de calidad. |

### Gráficas y 3D

| Proyecto | Para qué |
|---|---|
| Three.js | Escena 3D propia (`renderer-three`). |
| react-three-fiber y drei | Escena 3D declarativa dentro de React, controles y utilidades. |
| JSXGraph | Construcciones geométricas interactivas arrastrables. |
| Plotly.js | Ya en uso para superficies y mapas de calor. |
| three-mesh-bvh | Selección y cortes eficientes en mallas grandes. |

### Cálculo simbólico y numérico

| Proyecto | Para qué |
|---|---|
| SymPy + Pyodide | CAS completo en el navegador. |
| mathjs | Ya en uso; endurecer su sandbox. |
| numeric / ml-matrix | Álgebra lineal numérica. |

### Interfaz

| Proyecto | Para qué |
|---|---|
| shadcn/ui + Radix UI | Componentes accesibles sin aspecto genérico si se personalizan los tokens. |
| Lucide | Iconografía coherente. |
| Zustand | Estado del editor. |
| Framer Motion | Transiciones y paneles. |
| cmdk | Paleta de comandos (`Ctrl+K`). |
| Storybook | Catálogo y pruebas visuales de componentes. |

### Seguridad

| Proyecto | Para qué |
|---|---|
| DOMPurify | Sanitizar el HTML generado. |
| Semgrep | Análisis estático en CI. |
| gitleaks | Detección de secretos en el historial. |
| OSV-Scanner | Vulnerabilidades en dependencias. |
| fast-check | Pruebas basadas en propiedades y fuzzing del parser. |

### Pruebas y accesibilidad

| Proyecto | Para qué |
|---|---|
| Playwright | Pruebas E2E del editor. |
| axe-core | Pruebas de accesibilidad automáticas. |
| Vitest | Ya en uso. |

### Agentes y flujo de trabajo

| Proyecto | Para qué |
|---|---|
| `affaan-m/everything-claude-code` (ECC) | Ya instalado: agentes, comandos y reglas. Activar los agentes de revisión de seguridad, de código y de TDD. |
| `thedotmack/claude-mem` | Ya instalado: memoria persistente entre sesiones. |
| `obra/superpowers` | Flujo de planificación, TDD y verificación (varias de las skills de arriba). |
| `mattpocock/skills` | Skills de arquitectura, TDD y protecciones de Git. |
| Repositorios de skills para Antigravity | Hay colecciones grandes de skills compatibles con Antigravity (por ejemplo, "antigravity-awesome-skills"). No pude confirmar un repositorio llamado "Gravitas"; si lo tienes, pásame la URL exacta. Antes de instalar cualquier colección grande, revisa su contenido: una skill es código e instrucciones que un agente ejecuta con tus permisos. |

---

## 10. Instrucciones para el agente (poner en `CLAUDE.md` / `AGENTS.md`)

```markdown
# BWJM: instrucciones para agentes

## Contexto
BWJM es un formato de documento científico interactivo (.bwjm / .jm). Monorepo TypeScript con pnpm. Ver MEJORAS_BWJM.md y Especificacion_bwjm_Formato_Cientifico_Interactivo.md.

## Reglas
- Responder y documentar en español.
- Código sin comentarios.
- Parser, AST y motor matemático no dependen de React ni del DOM.
- Nunca usar innerHTML con contenido del documento; sanitizar con DOMPurify.
- Las expresiones se evalúan solo con la lista blanca de funciones.
- Todo cambio incluye pruebas; ejecutar pnpm lint, pnpm typecheck y pnpm test antes de dar algo por terminado.
- Cambios de seguridad pasan por el agente de revisión de seguridad de ECC.

## Skills a usar
- Interfaz: frontend-design, ui-ux-pro-max, impeccable, design-taste-frontend, emil-design-eng, web-design-guidelines, shadcn.
- React: vercel-react-best-practices, vercel-composition-patterns.
- Método: brainstorming, writing-plans, tdd, systematic-debugging, verification-before-completion, improve-codebase-architecture.
- Verificación visual: agent-browser.

## Orden de trabajo
1. Unificar nombre y estructura (sección 2).
2. Corregir seguridad (sección 5).
3. Migrar el playground a React y añadir la barra de herramientas (sección 4).
4. Herramientas "Añadir fórmula" y "Añadir gráfica".
5. Escena 3D con Three.js.
6. Funcionalidades de la sección 3, por prioridad A, B, C.
```

---

## 11. Plan por fases

### Fase 0: higiene (1 semana)
- Unificar nombre; crear `CLAUDE.md`/`AGENTS.md`; CI con auditoría y Semgrep.
- Corregir XSS del playground y endurecer la extensión de Chrome.
- Lista blanca de funciones en el motor.

### Fase 1: editor profesional (3 a 4 semanas)
- Migrar el playground a React con sistema de diseño propio.
- Menú, barra de herramientas, paneles, barra de estado, paleta de comandos.
- CodeMirror 6 con resaltado de BWJM; marcadores de error.
- Herramienta **Añadir fórmula** (MathLive + KaTeX) y **Añadir gráfica** (asistente).
- Pruebas E2E de ambos flujos.

### Fase 2: motor y 3D (4 a 6 semanas)
- `renderer-three` con escena, capas y cámaras guardables.
- Curvas implícitas, paramétricas, polares, desigualdades; revolución con eje arbitrario.
- Validación de dominios; modo inspección.
- Paquete `.bwjmz` con manifiesto y `tests/`.

### Fase 3: aprendizaje y ecosistema (6+ semanas)
- Ejercicios, pistas, modo examen y respuestas equivalentes.
- CAS con SymPy/Pyodide.
- Importación/exportación (LaTeX, Jupyter, PDF) y plugins con permisos.
- Sitio de documentación y publicación en npm.

---

## 12. Criterios de éxito

- Insertar una fórmula y una gráfica en menos de cinco segundos desde la barra de herramientas, sin escribir LaTeX a mano.
- Los ocho casos de prueba de la sección 15 de la especificación pasan en CI.
- Abrir un documento con HTML o código malicioso no ejecuta nada.
- El editor supera auditorías automáticas de accesibilidad (axe-core) sin errores graves.
- Un documento `.bwjmz` guardado y reabierto conserva parámetros, vistas, anotaciones y ejercicios.
- La interfaz es reconocible como BWJM: tokens de diseño propios, no componentes por defecto.
