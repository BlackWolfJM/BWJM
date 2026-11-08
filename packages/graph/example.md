# Ejemplo de Análisis con MathMD Graph

Este documento demuestra cómo @mathmd/graph extrae relaciones de conocimiento de documentos MathMD.

## Ejemplo 1: Slider Reactivo

\`\`\`slider
name: a
min: 0
max: 10
default: 5
\`\`\`

\`\`\`plot2d
equation: a*x^2
x: [-5, 5]
grid: true
\`\`\`

## Ejemplo 2: Superficie 3D con Gradiente

\`\`\`surface3d
equation: x^2 + y^2
x: [-5, 5]
y: [-5, 5]
samples: 50
\`\`\`

\`\`\`gradient
function: x^2 + y^2
point: [1, 1]
show-surface: true
\`\`\`

## Ejemplo 3: Campo Vectorial

\`\`\`vectorfield2d
field: [-y, x]
x: [-5, 5]
y: [-5, 5]
density: 15
\`\`\`

## Análisis Esperado

Al procesar este documento con @mathmd/graph, se deberían extraer:

1. **Nodos**: 5 bloques MathMD + funciones matemáticas + variables
2. **Relaciones**: Slider afecta plot, gradiente depende de función, etc.
3. **Comunidades**: Visualización, Interactividad, Matemática
4. **Conceptos**: sin, cos, x^2, gradiente, campo vectorial
