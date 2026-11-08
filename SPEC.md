# MathMD — Especificación maestra

> **Nombre provisional:** MathMD  
> **Tipo:** lenguaje declarativo embebido en Markdown para visualizaciones matemáticas estáticas e interactivas.

## 1. Visión

MathMD extiende Markdown para que un documento pueda contener teoría, LaTeX y bloques matemáticos que un renderer compatible convierta directamente en gráficos, superficies, vectores, campos y controles interactivos.

Ejemplo:

````markdown
# Paraboloide

Sea:

$$
z=x^2+y^2
$$

```surface3d
equation: x^2 + y^2
x: [-5, 5]
y: [-5, 5]
```
````

El archivo sigue siendo texto plano y Markdown válido. El renderer interpreta `surface3d` y genera una visualización 3D manipulable.

## 2. Objetivo

Permitir crear, sin imágenes externas y sin programar JavaScript:

- gráficos 2D;
- superficies 3D;
- vectores 2D/3D;
- curvas paramétricas;
- campos vectoriales;
- curvas de nivel;
- gradientes;
- planos tangentes;
- sliders;
- checkboxes;
- puntos móviles;
- animaciones;
- visualizaciones reactivas.

## 3. Filosofía

MathMD debe ser:

- **Markdown-first**: la fuente sigue siendo `.md`;
- **declarativo**: se describe qué visualizar, no cómo programarlo;
- **legible**: un humano entiende el bloque aunque no se renderice;
- **portable**: usable en Git, GitHub y localmente;
- **seguro**: no ejecuta JavaScript arbitrario;
- **extensible**: admite nuevos tipos de bloque;
- **renderer-independent**: la sintaxis no depende de React, Plotly o Three.js.

## 4. Sintaxis base

Usar fenced code blocks:

````markdown
```<tipo>
clave: valor
clave: valor
```
````

El cuerpo usa una sintaxis YAML restringida.

## 5. Bloques principales

### `plot2d`

````markdown
```plot2d
equation: sin(x)
x: [-10, 10]
y: [-2, 2]
grid: true
axes: true
interactive: true
```
````

### `surface3d`

````markdown
```surface3d
equation: x^2 + y^2
x: [-5, 5]
y: [-5, 5]
samples: 80
contours: true
```
````

### `vector2d`

````markdown
```vector2d
origin: [0,0]
vector: [3,4]
label: v
```
````

### `vector3d`

````markdown
```vector3d
origin: [0,0,0]
vector: [2,3,1]
label: v
```
````

### `curve3d`

````markdown
```curve3d
x: cos(t)
y: sin(t)
z: t
t: [0, 8*pi]
```
````

### `vectorfield2d`

````markdown
```vectorfield2d
field: [-y, x]
x: [-5,5]
y: [-5,5]
density: 15
```
````

### `gradient`

````markdown
```gradient
function: x^2 + y^2
point: [1,1]
show-surface: true
show-level-curves: true
```
````

### `tangentplane`

````markdown
```tangentplane
function: x^2 + y^2
point: [1,1]
```
````

### `slider`

````markdown
```slider
name: a
min: -5
max: 5
step: 0.1
default: 1
```
````

Otro bloque puede usar `a`:

````markdown
```surface3d
equation: a*x^2 + y^2
```
````

Mover `a` debe actualizar la superficie en tiempo real.

## 6. Variables y reactividad

Cada documento mantiene un estado compartido.

```text
slider a
  ↓
document state
  ↓
dependency graph
  ├─ plot2d
  └─ surface3d
```

Solo se recalculan los bloques que dependan de la variable modificada.

## 7. Motor matemático

Soporte mínimo:

```text
sin cos tan asin acos atan
sqrt abs exp log ln
floor ceil min max
pi e
```

Nunca usar `eval()` ni `new Function()` sobre contenido del documento.

## 8. Compatibilidad con GitHub

GitHub controla su propio renderer. Un repositorio no puede registrar automáticamente `surface3d` dentro de github.com.

Por eso MathMD debe generar fallbacks:

```text
plot2d        → SVG
diagram       → SVG
geometry      → SVG
vector2d      → SVG
surface3d     → STL cuando sea viable
```

La fuente MathMD permanece intacta; los fallbacks son derivados.

## 9. Implementación de referencia

Stack recomendado:

| Área | Tecnología |
|---|---|
| Lenguaje | TypeScript |
| Runtime | Node.js |
| Packages | pnpm |
| Markdown | unified + remark |
| GFM | remark-gfm |
| Math Markdown | remark-math |
| YAML | yaml |
| Schemas | Zod |
| Math engine | math.js |
| UI | React |
| Build | Vite |
| 2D | SVG propio |
| 3D inicial | Plotly.js |
| 3D avanzado | Three.js |
| Tests | Vitest |
| E2E | Playwright |
| CI | GitHub Actions |

## 10. Arquitectura

```text
.md
 ↓
Markdown parser
 ↓
Markdown AST
 ↓
MathMD parser
 ↓
MathMD AST
 ↓
validation
 ↓
math engine
 ↓
renderer
 ├─ SVG
 ├─ Plotly
 └─ Three.js (futuro)
```

Separar paquetes:

```text
@mathmd/ast
@mathmd/parser
@mathmd/math
@mathmd/core
@mathmd/renderer-svg
@mathmd/renderer-plotly
@mathmd/renderer-three
@mathmd/react
@mathmd/github
@mathmd/cli
```

## 11. CLI

```bash
mathmd dev
mathmd build
mathmd validate
mathmd github
mathmd export
```

## 12. Seguridad

Reglas obligatorias:

- tratar documentos como entrada no confiable;
- prohibir `eval` y `new Function`;
- limitar `samples` y densidad;
- sanitizar HTML;
- no permitir `fetch` arbitrario;
- no permitir acceso directo al filesystem desde bloques;
- aislar errores por bloque;
- usar sandbox si en el futuro se compila TikZ/PGFPlots.

## 13. Roadmap

```text
M0 bootstrap
M1 parser
M2 math engine
M3 plot2d → SVG
M4 playground
M5 surface3d
M6 sliders + reactividad
M7 GitHub fallbacks SVG/STL
M8 CLI
M9 cálculo vectorial
M10 cálculo avanzado
M11 docs + demo
```

## 14. Definition of Done

Una función está terminada si:

- parsea;
- valida;
- renderiza;
- tiene tests;
- está documentada;
- pasa lint/typecheck/test/build;
- no rompe el resto del documento;
- tiene ejemplo de uso.

## 15. Resultado final esperado

Debe ser posible escribir:

````markdown
# Gradiente

$$
f(x,y)=a x^2+y^2
$$

```slider
name: a
min: 0
max: 4
step: 0.1
default: 1
```

```surface3d
equation: a*x^2+y^2
x: [-5,5]
y: [-5,5]
contours: true
```

```gradient
function: a*x^2+y^2
point: [1,1]
```
````

y obtener un documento donde la teoría siga siendo Markdown, la superficie sea manipulable y el slider actualice la visualización.
