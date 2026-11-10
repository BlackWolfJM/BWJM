# MathMD — Lenguaje y sintaxis

## Principio

MathMD es un lenguaje declarativo, no un lenguaje de programación general.

Debe describir objetos matemáticos mediante bloques sencillos.

## Tipos iniciales

```text
plot2d
surface3d
vector2d
vector3d
curve2d
curve3d
vectorfield2d
vectorfield3d
contour
gradient
tangentplane
slider
checkbox
point2d
point3d
diagram
geometry
```

## Sintaxis

````markdown
```plot2d
equation: x^2
x: [-5,5]
```
````

## Dominios

```yaml
x: [-5, 5]
y: [-5, 5]
z: [-3, 3]
t: [0, 2*pi]
```

## Variables compartidas

````markdown
```slider
name: a
min: 0
max: 5
default: 1
```

```plot2d
equation: a*x^2
```
````

## Defaults

Cada bloque debe definir defaults estables y documentados.

## Errores

Un bloque inválido no rompe el documento completo.

Ejemplo:

```text
MathMD error
Invalid expression: x^^2
```

## Versionado

Opcional:

```yaml
---
mathmd: 1
---
```

## Estudio vectorial incremental (lote 01)

Los bloques tradicionales `vector2d` y `vector3d` ahora admiten, de manera
opcional, `mode`, `other`, `third`, `factor`, `secondFactor` y `showSteps`.
Si se omite `mode`, el bloque conserva el comportamiento previo.

```slider
name: k
min: -3
max: 3
step: 0.25
default: 2
```

```vector2d
mode: sum
origin: [0, 0]
vector: [3, 2]
other: [-1, 4]
```

```vector3d
mode: scale
origin: [0, 0, 0]
vector: [1, 2, 3]
factor: k
showSteps: true
```

`mode`: `classify`, `coordinates`, `translate`, `components`,
`displacement`, `compare`, `sum`, `difference`, `scale`,
`properties`, `combination`. Para `displacement`, `origin` representa
A y `other` representa la posición absoluta B; `vector` continúa siendo
obligatorio por compatibilidad. Los factores son números o identificadores
de sliders declarados. No se admiten expresiones arbitrarias como factores.
La salida es numérica y las comprobaciones de propiedades no sustituyen
demostraciones generales. Consulta
[`docs/LOTE_01_VECTORES_DOCUMENTOS.md`](docs/LOTE_01_VECTORES_DOCUMENTOS.md).
