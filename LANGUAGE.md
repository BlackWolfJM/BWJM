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
