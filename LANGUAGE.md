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
crossproduct
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

### Producto cruz en ℝ³

Un bloque `crossproduct` recibe los vectores `u` y `v` como ternas de números
finitos. La flecha normal representa el producto cruz sin normalizar. Con
vectores paralelos o nulos se ocultan el plano y la flecha normal, y el área es cero.

````markdown
```crossproduct
u: [1, 0, 0]
v: [0, 1, 0]
showPlane: true
showNormal: true
showArea: true
```
````

`showPlane: true` y `showNormal: true` (ambas activas por defecto) controlan la visualización
del plano generado por $\mathbf{u}$ y $\mathbf{v}$ y de la normal perpendicular resultante.
Al posicionar el cursor sobre la flecha normal en 3D, se confirma analíticamente la
perpendicularidad verificando los productos escalares nulos $\mathbf{u} \cdot \mathbf{n} = 0$ y
$\mathbf{v} \cdot \mathbf{n} = 0$. Cuando los vectores son paralelos, colineales o alguno es nulo,
el producto cruz se anula ($\mathbf{u} \times \mathbf{v} = \mathbf{0}$) y el sistema advierte
explícitamente en el título y en el diagnóstico que no existe una normal única por esos vectores.

`reverseOrder: true` calcula v × u en vez de u × v e invierte la normal sin
intercambiar las identidades de los vectores. `showSteps: true` activa la
calculadora con un procedimiento expandible. `showSteps: false` mantiene el
resultado y oculta el procedimiento. Al omitir la opción solo aparece la
escena. Ambas opciones pueden cambiarse en **Personalizar gráfica**. Las componentes
enteras seguras se calculan exactamente cuando las entradas son enteras
seguras. Las demás se muestran con la precisión de coma flotante.

`showDeterminant: true` muestra la matriz de tres filas del producto cruz.
Los coeficientes firmados comparten los colores de i, j y k. Las filas
numéricas siguen el orden activo y la matriz se actualiza al mover los
vectores. La opción está desactivada por defecto. Al activar conjuntamente
`showDeterminant: true` y `showSteps: true`, el procedimiento desglosa los
menores 2×2 con sus signos de cofactor (+/−/+), conservando el signo negativo
exterior del eje j antes de simplificar.

`showArea: true` (activado por defecto) muestra el área del paralelogramo sustentado
por los vectores, calculada tanto mediante $\|\mathbf{u} \times \mathbf{v}\|$ como a través de
$\|\mathbf{u}\| \|\mathbf{v}\| \sin\theta$, incorporando una etiqueta tridimensional en el centroide
del plano generado. Si los vectores son colineales o paralelos, el área se anula
limpiamente y el sistema protege de forma estricta contra divisiones por cero.
Al activar `showSteps: true`, el procedimiento incluye el medidor de módulo y área
comparando la norma directa $\|\mathbf{u} \times \mathbf{v}\|$ con la evaluación por ángulo
$\|\mathbf{u}\| \|\mathbf{v}\| \sin\theta$, explicando la anulación a 0 en casos paralelos.

`showRightHand: true` activa la capa 3D de la regla de la mano derecha con el
arco de giro u → v en el plano y el pulgar orientado a lo largo de la normal.
Al cambiar las entradas o activar `reverseOrder: true`, el giro y el pulgar se
invierten en el espacio tridimensional de forma independiente de la cámara.
El procedimiento didáctico desglosa la orientación espacial demostrando la
propiedad anticonmutativa $\mathbf{v} \times \mathbf{u} = -(\mathbf{u} \times \mathbf{v})$ y la naturaleza
dextrógira del triedro mediante el determinante del producto triple escalar
$\det(\mathbf{u}, \mathbf{v}, \mathbf{n}) = \|\mathbf{n}\|^2 > 0$, con un indicador interactivo de orden
en la calculadora que permite conmutar directamente entre $\mathbf{u} \times \mathbf{v}$ y $\mathbf{v} \times \mathbf{u}$.

El paso procedimental final de **Comprobación** desglosa la verificación algebraica de perpendicularidad
mediante los productos escalares exactos $\mathbf{u} \cdot \mathbf{n} = 0$ y $\mathbf{v} \cdot \mathbf{n} = 0$,
con una tarjeta interactiva `.bwjm-cross-perpendicular-card` que detalla las sumas componente a componente y
las conclusiones geométricas para vectores ortogonales, oblicuos o colineales/paralelos.

`showAnticommutative: true` superpone la normal opuesta del producto cruz inverso ($\mathbf{v} \times \mathbf{u} = -(\mathbf{u} \times \mathbf{v})$ o viceversa)
en color violeta con trazo discontinuo y cono indicador, demostrando visualmente que invertir el orden de los operandos invierte exactamente
el sentido del vector normal conservando su magnitud ortogonal al plano.

`showDistributive: true` activa la visualización de la propiedad distributiva respecto a la suma vectorial:
$\mathbf{u} \times (\mathbf{v} + \mathbf{w}) = (\mathbf{u} \times \mathbf{v}) + (\mathbf{u} \times \mathbf{w})$.
Permite especificar el tercer vector `w: [x, y, z]` (opcional, por defecto `[0, 1, 1]`) y su etiqueta `labelW: "w"`.
La escena traza el vector $\mathbf{w}$, el vector suma $\mathbf{v} + \mathbf{w}$ y el producto resultante $\mathbf{u} \times (\mathbf{v} + \mathbf{w})$,
verificando analíticamente su coincidencia con $(\mathbf{u} \times \mathbf{v}) + (\mathbf{u} \times \mathbf{w})$.
El procedimiento didáctico desglosa ambas propiedades en la tarjeta interactiva `.bwjm-cross-properties-card`.

`showIdentities: true` activa el **Inspector de identidades con pruebas simbólicas guiadas**,
evaluando analítica y simbólicamente de extremo a extremo:
1. Anticonmutatividad: $\mathbf{u} \times \mathbf{v} = -(\mathbf{v} \times \mathbf{u})$
2. Autoproducto / Nilpotencia: $\mathbf{u} \times \mathbf{u} = \mathbf{0}$
3. Homogeneidad y asociatividad escalar: $(c\mathbf{u}) \times \mathbf{v} = c(\mathbf{u} \times \mathbf{v})$
4. Distributividad respecto a la suma vectorial: $\mathbf{u} \times (\mathbf{v} + \mathbf{w}) = (\mathbf{u} \times \mathbf{v}) + (\mathbf{u} \times \mathbf{w})$
El inspector desglosa cada demostración simbólica paso a paso en la tarjeta didáctica `.bwjm-cross-identities-card`,
contrastando explícitamente las propiedades del producto vectorial con las del producto escalar para evitar confusiones conceptuales.

`showTriangle: true` activa la capa del **triángulo sombreado** apoyado sobre el mismo par de vectores
(vértices $\mathbf{P}_0$, $\mathbf{P}_0 + \mathbf{u}$ y $\mathbf{P}_0 + \mathbf{v}$), cuya área satisface exactamente
$\text{Área}(\text{triángulo}) = \frac{1}{2} \|\mathbf{u} \times \mathbf{v}\| = \frac{1}{2} \text{Área}(\text{paralelogramo})$.
Se puede configurar el origen trasladado `origin: [x, y, z]` (por defecto `[0, 0, 0]`) y el color de sombreado
`colorTriangle: "#f59e0b"`, preservando invariantes las magnitudes vectoriales y la relación de área exacta.
El renderizador ubica la etiqueta de área en el centroide del triángulo y el procedimiento didáctico desglosa
ambas áreas comparativamente en la tarjeta `.bwjm-cross-area-card`.

Con `showSteps: true` y componentes enteras seguras, el procedimiento calcula
exactamente la suma de cuadrados de la normal y presenta las áreas como
`√N` y `√N/2`. Si `N` es un cuadrado perfecto, muestra el entero y su mitad
como entero o fracción. Las etiquetas de la gráfica mantienen las aproximaciones
numéricas. El procedimiento justifica la invariancia de área al recuperar los
desplazamientos `u` y `v` mediante la resta del origen común.

`showVolume: true` activa la visualización del **volumen del paralelepípedo** generado
por tres vectores $\mathbf{u}$, $\mathbf{v}$, $\mathbf{w} \in \mathbb{R}^3$.
Requiere que se especifique el tercer vector `w: [x, y, z]` (además de `u` y `v`).
El volumen firmado se calcula mediante el producto triple escalar:
$V = \mathbf{u} \cdot (\mathbf{v} \times \mathbf{w}) = \det(\mathbf{u}, \mathbf{v}, \mathbf{w})$.
- $V > 0$: triedro **dextrógiro** (mano derecha)
- $V < 0$: triedro **latrógiro** (mano izquierda)
- $V = 0$: vectores **coplanares** (paralelepípedo colapsado)
El renderizado 3D muestra las caras del paralelepípedo y una etiqueta con el
volumen geométrico y el signo de su orientación. El color del sombreado se controla con `colorVolume: "#8b5cf6"` (por defecto).
El procedimiento didáctico desglosa la fórmula, el cálculo exacto del determinante y
las permutaciones cíclicas que conservan el volumen.

`showSteps: true` con `showVolume: true` activa la **calculadora de producto triple**
con el procedimiento completo `TripleProductStudy`:
1. **Datos y condiciones**: tres vectores $\mathbf{u}, \mathbf{v}, \mathbf{w} \in \mathbb{R}^3$
2. **Producto vectorial $\mathbf{v} \times \mathbf{w}$**: componentes con determinantes $2 \times 2$
3. **Producto escalar $\mathbf{u} \cdot (\mathbf{v} \times \mathbf{w})$**: evaluación componente a componente
4. **Volumen firmado y geométrico**: $V = \mathbf{u} \cdot (\mathbf{v} \times \mathbf{w})$, $|V|$
5. **Permutaciones cíclicas**: $\mathbf{u} \cdot (\mathbf{v} \times \mathbf{w}) = \mathbf{v} \cdot (\mathbf{w} \times \mathbf{u}) = \mathbf{w} \cdot (\mathbf{u} \times \mathbf{v})$
6. **Permutaciones antíclicas**: intercambio de dos vectores cambia el signo
7. **Determinante y orientación**: $\det(\mathbf{u}, \mathbf{v}, \mathbf{w}) = V$, dextrógiro/latrógiro
8. **Comprobación**: verificación algebraica del producto triple

El cálculo usa aritmética entera exacta (BigInt) cuando las componentes son enteras seguras,
y muestra el resultado exacto como entero o fracción. Para entradas decimales usa
precisión de coma flotante. El procedimiento explica la interpretación geométrica
(triedro mano derecha/izquierda) y el criterio de coplanaridad ($V=0$).

`showCollapse: true` activa la **animación de colapso del paralelepípedo**:
- Requiere `showVolume: true` y vector `w` definido
- `collapseFactor ∈ [0, 1]`: interpola `w` hacia su proyección coplanar (`coplanar`) o hacia cero (`zero`)
- `collapseTarget: "coplanar"` interpola la componente perpendicular al plano $u,v$ hacia cero
- `collapseTarget: "zero"` interpola $w \to \mathbf{0}$
- El deslizador `collapseFactor` (0–100 %) actualiza el volumen al confirmar el cambio
- Al factor = 1: **⚠ PARELEPÍPEDO COLAPSADO: Volumen = 0 (coplanar)**
- El procedimiento didáctico desglosa la interpolación y el volumen en cada paso

En BWJM Studio, **Producto cruz 3D** en el asistente inserta un ejemplo.
**Personalizar gráfica** permite editar coordenadas con el teclado o arrastrar
los extremos en la proyección XY, XZ o YZ. El arrastre conserva la coordenada
fuera del plano elegido. Si los extremos se superponen, **Extremo al frente**
determina cuál puedes arrastrar. El documento guarda los vectores y la visibilidad
de las capas.

### Bloques cercados

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
