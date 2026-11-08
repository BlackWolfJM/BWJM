# BWJM: Formato Cientifico Interactivo (.bwjm / .jm)

Autor y Creador del Formato: BlackWolfJM
Repositorio Oficial: https://github.com/BlackWolfJM/BWJM

BWJM es un formato de documento cientifico interactivo de codigo abierto, disenado para sustituir las limitaciones estaticas del PDF tradicional y erradicar la dependencia de archivos HTML intermedios o generados. Permite que formulas matematicas, graficas 2D, superficies 3D, simulaciones parametricas y deducciones analiticas coexistan como objetos vivos, verificables y reproducibles en tiempo real.

---

## Tabla de Contenidos

1. Finalidad del Proyecto
2. Funcionalidades Implementadas
   - 2.1. BWJM Studio: Editor y Lector Cientifico Interactivo
   - 2.2. Area entre Curvas y Sumas de Riemann (Fase 2)
   - 2.3. Solidos de Revolucion y Regla Geometrica de 2pi (Fase 3)
   - 2.4. Superficies 3D y Osciladores Armonicos
   - 2.5. Arquitectura del Motor y Pipeline Zero-HTML
3. Futuras Herramientas del Proyecto (Roadmap)
4. Estructura del Monorepo
5. Instalacion y Uso
6. Comprobaciones de Calidad y Tests

---

## 1. Finalidad del Proyecto

La finalidad principal del proyecto BWJM, fundamentada en la Especificacion de Formato Cientifico Interactivo redactada por BlackWolfJM, es superar el paradigma de los documentos cientificos pasivos:

- Mas alla de un PDF estatico: En un PDF tradicional o una impresion, las formulas son graficos inertes y los calculos no pueden explorarse. En BWJM, cada expresion matematica es un nodo de arbol sintactico estructurado capaz de recalcularse, animarse y someterse a variaciones de parametros.
- Cero dependencia de archivos HTML: El formato procesa y renderiza nativamente en memoria mediante su propio nucleo reactivo y renderizadores vectoriales, evitando la dispersion de archivos `.html`, carpetas auxiliares o scripts externos inseguros.
- Matematica rigurosa y verificable: El sistema resuelve intersecciones exactas, calcula integrales analiticas y numericas, evalua sumas de Riemann con medicion precisa de error y aplica leyes geometricas estrictas como el limite de volumen en revoluciones espaciales.
- Autonomia y reproducibilidad: Los documentos `.bwjm` y `.jm` son completamente portables y funcionan sin depender de modelos generativos de nube ni conexiones remotas obligatorias.

---

## 2. Funcionalidades Implementadas

Cada funcionalidad descrita a continuacion se encuentra desarrollada, probada y respaldada por su correspondiente captura visual.

### 2.1. BWJM Studio: Editor y Lector Cientifico Interactivo

Entorno integrado de trabajo con interfaz profesional de publicacion cientifica. Dispone de dos modos de operacion sincronizados:
- Modo Editor: Panel dividido con editor de codigo fuente en tiempo real, contador de caracteres, atajos de teclado y deteccion instantanea de sintaxis.
- Modo Lector: Hoja de estudio tipo publicacion academica de alta fidelidad, con formulas renderizadas en KaTeX, tipografia optimizada y visualizaciones integradas.
- Controles reactivos: Deslizadores de parametros continuos con boton de reproduccion automatica (Play/Pause) a 60 FPS, permitiendo observar la dinamica de cualquier ecuacion.

![BWJM Studio: Interfaz de Editor y Lector Interactivo](docs/images/01-bwjm-studio-interface.png)

---

### 2.2. Area entre Curvas y Sumas de Riemann (Fase 2)

Modulo analitico y grafico integral para el calculo de regiones acotadas en el plano segun la Seccion 3 de la especificacion:
- Resolucion automatica de intersecciones: Calcula analitica y numericamente los puntos de corte entre dos curvas arbitrarias $f(x)$ y $g(x)$. Para el caso base $f(x)=ax$ y $g(x)=x^2$, halla los limites $x_1 = 0$ y $x_2 = 1$.
- Integral definida analitica: Obtiene el area exacta de la region acotada mediante integracion formal ($A = \int_0^1 (x - x^2)dx = 1/6 \approx 0.16667$).
- Particion interactiva de Riemann: Divide la region en $n$ rectangulos parametrizables desde $n = 2$ hasta $n = 50$, con calculo en tiempo real de la suma de Riemann $S_n$ y el error de aproximacion residual.
- Diagrama vectorial en vivo: Muestra las dos funciones con codificacion cromatica diferenciada, puntos criticos señalizados y los rectangulos de Riemann escalando dinamicamente ante cualquier cambio en los controles.

![Area entre Curvas y Sumas de Riemann](docs/images/02-area-entre-curvas-riemann.svg)

---

### 2.3. Solidos de Revolucion y Regla Geometrica de 2pi (Fase 3)

Motor tridimensional para el estudio de cuerpos generados por rotacion en torno a ejes coordenados segun la Seccion 4 de la especificacion:
- Barrido continuo de 0 a 3pi radianes: El usuario puede deslizar o animar el angulo de giro $\alpha$ desde $0$ hasta $3\pi$ ($540^\circ$).
- Implementacion estricta de la Ley de 2pi: Reconocimiento formal de que el volumen maximo del solido se consolida al completar una vuelta completa ($2\pi$). Continuar el giro hasta $3\pi$ anade una trayectoria cinematica visual, pero el volumen del conjunto de puntos alcanzados permanece rigurosamente constante en $V = 2\pi/15 \approx 0.41888$.
- Corte transversal dinamico: Permite desplazar un plano perpendicular $x$ para inspeccionar la seccion generada por el metodo de arandelas, calculando el radio exterior $R(x)$, radio interior $r(x)$ y el area de la arandela diferencial $A(x) = \pi(R(x)^2 - r(x)^2)$.
- Medidor cinematico radial: Marcador angular continuo con distincion entre la rotacion base ($0$ a $2\pi$) y el sobregiro ($2\pi$ a $3\pi$).

![Solidos de Revolucion y Ley Geometrica de 2pi](docs/images/03-solido-revolucion-3pi.svg)

---

### 2.4. Superficies 3D y Osciladores Armonicos

Renderizado tridimensional avanzado de funciones multivariables $z = f(x, y)$:
- Soporte para ondas estacionarias y osciladores armonicos: Visualizacion de ondas radiales amortiguadas $z(x,y) = A \cdot \sin(\omega \sqrt{x^2+y^2}) / \sqrt{x^2+y^2}$.
- Modificacion de parametros en vivo: Variacion de amplitud, frecuencia y fases angulares con recalculado instantaneo de la malla 3D.
- Contornos de nivel e interactividad orbital: Rotacion en 360 grados, zoom dinamico, proyeccion ortografica o en perspectiva y lectura de curvas de nivel topologicas.

![Superficies Tridimensionales y Ondas Armonicas](docs/images/05-superficies-3d-interactivas.svg)

---

### 2.5. Arquitectura del Motor y Pipeline Zero-HTML

Estructura modular que garantiza la ejecucion en memoria sin generacion de archivos HTML secundarios:
- @mathmd/ast: Definicion del Arbol de Sintaxis Abstracta con tipado estricto TypeScript para bloques cientificos (`plot2d`, `surface3d`, `slider`, `checkbox`, `vectorfield2d`, `contour`).
- @mathmd/parser: Analizador sintactico determinista con preprocesamiento seguro de esquemas YAML, proteccion contra inyecciones y tolerancia a codigos hexadecimales sin comillas.
- @mathmd/core: Grafo reactivo de dependencias que actualiza exclusivamente los nodos y ecuaciones afectadas por un parametro modificado.
- @mathmd/math: Biblioteca matematica analitica (deteccion de raices, integracion simbolica, particiones de Riemann y evaluacion diferencial).
- Renderizadores vectoriales: Renderizador SVG puro para graficos bidimensionales y renderizador Plotly/WebGL para superficies tridimensionales.

![Arquitectura del Motor Cientifico BWJM](docs/images/04-arquitectura-formato-bwjm.svg)

---

## 3. Futuras Herramientas del Proyecto (Roadmap)

Conforme a la vision integral de la especificacion de BlackWolfJM, el ecosistema evolucionara a traves de las siguientes herramientas de proxima implementacion:

1. Aplicacion de Escritorio Standalone (BWJM Desktop):
   - Construida sobre Tauri / Rust o Electron con aislamiento seguro de procesos.
   - Apertura nativa de archivos `.bwjm` y `.jm` con doble clic en Windows, macOS y Linux.
   - Almacenamiento local directo sin servidor web intermediario.

2. Extension Universal de Navegador (Sustituto de Visor PDF):
   - Extension para Google Chrome, Microsoft Edge y Firefox que intercepta la apertura de archivos `.bwjm`.
   - Permite leer articulos cientificos e informes tecnicos interactivos directamente en el navegador conservando toda la manipulacion 2D/3D y animaciones.

3. Integracion con CAS Simbolico (SymPy / WebAssembly):
   - Integracion de un motor simbolico completo en WebAssembly para resolucion de integrales impropias, ecuaciones diferenciales ordinarias (EDO), algebra lineal y calculo tensorial.

4. Motor 3D de Alto Rendimiento WebGPU / Three.js:
   - Capacidad para simular campos vectoriales de alta densidad, solucion de ecuaciones en derivadas parciales (EDP), dinamica de fluidos computacional y superficies de Riemann complejas con aceleracion por hardware.

5. Pasarelas de Interoperabilidad Academica:
   - Exportadores e importadores bidireccionales con LaTeX, cuadernos de Jupyter (`.ipynb`) y Typst, permitiendo traducir apuntes existentes a documentos interactivos vivos.

6. Sistema de Aprendizaje Activo y Evaluacion por Pasos:
   - Modo examen con verificacion formal de procedimientos algebraicos paso a paso.
   - Pistas graduadas, generacion de ejercicios con parametros aleatorizados y retroalimentacion pedagogica inmediata sin revelar la solucion de forma prematura.

---

## 4. Estructura del Monorepo

```
BWJM/
├── apps/
│   ├── playground/          # BWJM Studio (Editor y Lector interactivo web)
│   ├── vscode-extension/    # Extension para Visual Studio Code con webview nativa
│   └── chrome-extension/    # Extension de navegador para visualizacion de .bwjm
├── packages/
│   ├── ast/                 # Tipos y esquemas del Arbol de Sintaxis Abstracta
│   ├── cli/                 # Herramienta de linea de comandos para validacion y build
│   ├── core/                # Motor de reactividad y grafo de dependencias
│   ├── github/              # Generador de assets estaticos deterministas
│   ├── graph/               # Grafo de evaluacion de variables
│   ├── math/                # Biblioteca analitica (Riemann, intersecciones, revolucion)
│   ├── parser/              # Parser determinista con Zod y tolerancia YAML
│   ├── renderer-plotly/     # Renderizador 3D basado en Plotly
│   └── renderer-svg/        # Renderizador 2D vectorial SVG nativo
├── docs/
│   └── images/              # Capturas y diagramas tecnicos de las funcionalidades
├── Especificacion_bwjm_Formato_Cientifico_Interactivo.md
└── package.json
```

---

## 5. Instalacion y Uso

### Requisitos Previos

- Node.js version 20 o superior
- pnpm version 11.15 o superior

### Clonar el Repositorio

```bash
git clone https://github.com/BlackWolfJM/BWJM.git
cd BWJM
```

### Instalar Dependencias

```bash
pnpm install
```

### Iniciar BWJM Studio en Desarrollo

```bash
pnpm dev
```

El editor y lector interactivo se iniciara en el entorno local (habitualmente `http://localhost:3000` o `http://localhost:5173`).

### Compilacion de Paquetes y Distribuciones

```bash
pnpm build
```

---

## 6. Comprobaciones de Calidad y Tests

El proyecto mantiene un estricto estandar de calidad con cero errores tolerados en TypeScript y linter:

```bash
# Validacion estatica de codigo
pnpm lint

# Comprobacion de tipos en modo estricto
pnpm typecheck

# Suite completa de pruebas unitarias e integracion (138 tests)
pnpm test

# Verificacion de empaquetado y distribucion ESM
node scripts/test-dist.mjs
```

Estado de Verificacion:
- 12 suites de prueba ejecutadas exitosamente.
- 138 tests pasando (100% de cobertura en modulos criticos).
- 0 errores y 0 advertencias en ESLint.
- 0 errores en TypeScript estricto.

---

## Licencia

Este proyecto esta licenciado bajo los terminos de la Licencia MIT.
Formato y concepto original creados por BlackWolfJM.
