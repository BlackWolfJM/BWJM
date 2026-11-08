# MathMD — Ejemplos

## 1. Función 2D

````markdown
```plot2d
equation: x^2
x: [-5, 5]
grid: true
```
````

## 2. Dos funciones

````markdown
```plot2d
functions:
  - equation: sin(x)
    label: sen(x)
  - equation: cos(x)
    label: cos(x)
x: [-6.28, 6.28]
legend: true
```
````

## 3. Slider reactivo

````markdown
```slider
name: a
min: -3
max: 3
step: 0.1
default: 1
```

```plot2d
equation: a*x^2
x: [-5, 5]
```
````

## 4. Superficie 3D

````markdown
```surface3d
equation: x^2 + y^2
x: [-5, 5]
y: [-5, 5]
contours: true
```
````

## 5. Curva 3D

````markdown
```curve3d
x: cos(t)
y: sin(t)
z: t
t: [0, 8*pi]
```
````

## 6. Campo vectorial

````markdown
```vectorfield2d
field: [-y, x]
x: [-5, 5]
y: [-5, 5]
density: 15
```
````

## 7. Documento educativo

````markdown
# Gradiente y curvas de nivel

Sea:

$$
f(x,y)=x^2+y^2
$$

El gradiente es:

$$
\nabla f=(2x,2y)
$$

```surface3d
equation: x^2 + y^2
x: [-5,5]
y: [-5,5]
```

```contour
function: x^2 + y^2
x: [-5,5]
y: [-5,5]
levels: 10
```

```gradient
function: x^2 + y^2
point: [1,1]
```
````
