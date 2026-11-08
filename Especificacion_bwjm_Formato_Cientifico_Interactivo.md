# BWJM (`.bwjm`): propuesta de formato científico interactivo

> **Estado:** propuesta conceptual y especificación inicial de producto (no es todavía un formato estandarizado ni un lector implementado).
>
> **Objetivo:** crear un formato de documentos donde matemáticas, texto, gráficos, simulaciones, ejercicios y código sean objetos vivos, editables, verificables y reproducibles. Debe servir para estudiar, enseñar, investigar y crear apuntes de múltiples disciplinas.

## 1. Visión y filosofía

- **Más que un PDF con animaciones.** El contenido no debe ser una colección de imágenes o vídeos pegados: sus objetos matemáticos deben guardar expresiones, restricciones, parámetros, relaciones y comportamiento para permitir modificaciones reales.
- **Un archivo, distintos modos de uso.** El mismo material debería poder abrirse como libro de estudio, cuaderno de apuntes, laboratorio virtual, hoja de ejercicios, presentación o informe técnico.
- **Separar contenido de visualización.** Una fórmula debe almacenarse como expresión matemática estructurada; su gráfica 2D, superficie 3D, tabla y explicación son vistas sincronizadas de esa misma expresión.
- **Interacción por defecto, código opcional.** Un lector debería cambiar una función escribiendo `y=x^2`, sin saber JavaScript o Python. Un autor avanzado sí podría agregar código cuando lo necesite.
- **Matemática rigurosa.** No basta con producir gráficos bonitos: el documento debe conservar dominios, hipótesis, unidades, orientaciones, singularidades y nivel de precisión.
- **Generalidad sin prometer lo imposible.** No se pueden preprogramar literalmente todos los problemas; se propone un motor combinable y ampliable con módulos y capacidades de cálculo para atender familias de problemas abiertas.
- **Independencia de la IA.** El documento base debe funcionar sin conexión ni modelo generativo. Un asistente de IA puede ampliarlo, pero no debe ser condición para abrirlo.
- **Portabilidad.** Idealmente, un único `.bwjm` podría transportarse entre computadoras y sistemas compatibles con un lector del formato.

## 2. Gráficas matemáticas como objetos manipulables

- **Representación 2D.** Funciones explícitas (`y=f(x)`), implícitas (`F(x,y)=0`), paramétricas (`r(t)`), polares (`r(θ)`), desigualdades y conjuntos definidos por condiciones.
- **Representación 3D.** Superficies `z=f(x,y)`, implícitas `F(x,y,z)=0`, parametrizadas `r(u,v)`, curvas espaciales, cuerpos y volúmenes.
- **Edición directa.** Escribir, reemplazar o arrastrar coeficientes, puntos, tangentes, radios, vértices y límites, con actualización instantánea cuando sea viable.
- **Controles de parámetros.** Deslizadores, campos numéricos, botones de reproducción, interruptores, selectores de intervalo y entradas simbólicas; con posibilidad de fijar valores exactos como `π/4`.
- **Intersecciones.** Mostrar todos los cruces válidos en un dominio seleccionado, identificando multiplicidad, tangencia y soluciones aproximadas cuando no exista solución cerrada conocida.
- **Áreas sombreadas.** Distinguir región bajo la curva, entre curvas, intersección, unión, diferencia, regiones definidas por desigualdades y límites por tramos.
- **Capas geométricas.** Activar y ocultar ejes, cuadrículas, etiquetas, puntos críticos, niveles, planos, normales, vectores, regiones y trazas.
- **Vistas coordinadas.** Una misma construcción vista desde arriba, de lado, en perspectiva 3D, como sección transversal y como ecuación.
- **Rotación y traslación de cámara.** Orbitar, hacer zoom, centrar objetos, seguir un punto y cambiar entre proyección ortográfica y perspectiva.
- **Lecturas sobre el objeto.** Al pasar el cursor o tocar, obtener coordenadas, pendientes, distancias, ángulos, normas, derivadas y valores de parámetros.
- **Comparación sincronizada.** Visualizar `f(x)`, `f'(x)` y `∫f(x)dx` en paneles unidos por el mismo cursor; comparar antes/después de una transformación.
- **Exportación científica.** Capturar gráficos en SVG/PNG y resultados geométricos compatibles, según el motor, con OBJ/STL/GLTF, preservando unidades y leyendas.

## 3. Área entre curvas: la interacción propuesta en detalle

- **Entrada libre.** El estudiante escribe, por ejemplo, `f(x)=x` y `g(x)=x^2`. Puede sustituir ambas ecuaciones por otras sin programar otra visualización.
- **Detección de intersecciones.** El motor resuelve `f(x)=g(x)`. Para este caso, `x=x²`, luego `x(x-1)=0`, de donde `x=0` y `x=1`.
- **Delimitación visual del intervalo.** Mostrar los puntos `(0,0)` y `(1,1)`, líneas verticales opcionales y los límites configurables `a=0`, `b=1`.
- **Identificación de función superior e inferior.** En `[0,1]`, `x ≥ x²`. El visor debe verificar el orden en cada subintervalo, no asumir que una función permanece arriba en todo el dominio.
- **Sombreado interactivo.** Colorear `R={(x,y):0≤x≤1, x²≤y≤x}`. Al mover `a`, `b` o coeficientes, debe cambiar la región.
- **Área exacta y aproximada.** `A=∫₀¹(x−x²)dx=1/6`. Mostrar expresiones exactas cuando sea posible, cálculo numérico y su error estimado cuando corresponda.
- **Suma de Riemann.** Dividir en rectángulos de distinto ancho; aumentar `n` y observar cómo converge la suma al área, indicando cuándo es una aproximación.
- **Cambio del sentido de integración.** Si se solicita, reescribir la región mediante cortes horizontales y explicar cómo cambian los límites.
- **Casos complejos.** Si hay más de dos cruces, zonas desconectadas, curvas implícitas o cambios de orden, segmentar la región, comprobar restricciones y ofrecer representación por piezas.
- **Diferenciar formas de región.** El motor debe distinguir claramente una región acotada de una gráfica abierta y avisar si faltan límites para definir un área finita.

## 4. Giro de regiones, ángulos `2π` y `3π`, y sólidos de revolución

- **Animar la región que gira.** Elegir una región plana y un eje de revolución; al desplazar el ángulo `α` desde `0` hasta el valor final, mostrar la trayectoria del área en el espacio.
- **Ejes disponibles.** Eje `x`, eje `y`, recta arbitraria en 2D/3D y ejes definidos por dos puntos o por un vector director.
- **Valores libres de giro.** Permitir `π/2`, `π`, `2π`, `3π`, `4π` y cualquier ángulo válido; representar vueltas completas y fracciones de vuelta.
- **Regla geométrica importante.** Para una región plana que gira en torno a un eje fijo, **después de `2π` ya se ha completado una vuelta**. Pasar a `3π` añade media vuelta recorrida a la animación, pero **no crea un volumen distinto** del ya barrido en `2π`, si el sólido se entiende como conjunto de puntos alcanzados. No confundir recorrido angular con volumen de la unión espacial.
- **Capas de estado.** Colorear de forma diferente el área original, la superficie generadora, la parte ya barrida, el borde y las secciones transversales.
- **Métodos de integración.** Ofrecer discos, arandelas, capas cilíndricas y, cuando proceda, enfoques alternativos; explicar la elección geométrica y las condiciones del método.
- **Cortes dinámicos.** Deslizar un plano perpendicular al eje para mostrar radio exterior, radio interior, espesor diferencial y sección transversal.
- **Volumen exacto y numérico.** En el caso `y=x` y `y=x²` para `0≤x≤1`, al girar alrededor del eje `x`: `V=π∫₀¹(x²−x⁴)dx=2π/15`. El panel debe mostrar el cálculo y actualizarlo cuando cambie el eje o la región.
- **Diferenciar conceptos.** Separar 'volumen del sólido generado', 'área de superficie de revolución', 'trayectoria angular recorrida' y 'multiplicidad de barrido'; pueden responder preguntas distintas.
- **Vista de creación progresiva.** Opción de visualizar el barrido desde `0` hasta `α`, reproducir en cámara lenta, retroceder, pausar o situarse en un valor exacto del ángulo.
- **Sólidos transparentes.** Opacidad ajustable y mallas/alambres para observar el interior; evitar que una representación superficial oculte los radios y vacíos.
- **Detección de problemas.** Si la región cruza el eje, si el eje está dentro de la región o si existe autointersección, el motor debe advertirlo y adaptar la geometría y la integral.

## 5. Funciones para que la visualización se adapte a ejercicios nuevos

- **Lenguaje matemático estructurado.** Guardar ecuaciones como árboles de expresión (AST/MathJSON u otro estándar estable), no solo cadenas LaTeX o capturas. LaTeX sería la representación visual, no la única fuente de verdad.
- **Objetos semánticos reutilizables.** Tipos tales como `Function`, `Curve`, `Surface`, `Region`, `VectorField`, `Integral`, `Transformation`, `Constraint`, `Simulation` y `Assessment`, con propiedades comunes.
- **Motor de dependencias.** Si cambia `a`, recalcular los límites, soluciones, región, gráfico, volumen y explicación afectados, sin repetir operaciones no vinculadas.
- **Motor simbólico.** Integración, derivación, álgebra, resolución de ecuaciones, cambio de variables, simplificaciones y comparación de expresiones usando herramientas como SymPy.
- **Motor numérico.** Integración aproximada, búsqueda de raíces, optimización y simulación cuando la forma simbólica no esté disponible, con tolerancias y avisos de convergencia.
- **Motor geométrico.** Intersecciones, transformaciones, mallas 3D, cortes, cálculo de regiones y renderizado de sólidos.
- **Motor de reglas pedagógicas.** Una operación como 'girar región' debería reutilizar el mismo mecanismo para nuevas funciones y nuevos ejes, no depender de un vídeo exclusivo del ejemplo.
- **Reconocimiento contextual.** Analizar el tipo de entrada: distinguir función escalar/vectorial, curva, sistema, intervalo, desigualdad o ecuación diferencial, y sugerir vistas útiles sin ejecutar acciones opacas.
- **Entrada por lenguaje natural.** Permitir instrucciones como 'muéstrame la zona común', 'gira esta región alrededor de y=−1' o 'traza el plano tangente en P', que se traduzcan a operaciones estructuradas verificables.
- **Generación de código bajo demanda, como complemento.** Para un problema fuera de las capacidades estándar, un módulo de IA o un desarrollador puede generar un complemento con código, validado y ejecutado en un entorno aislado. El formato **no debería confiar en ejecutar código arbitrario por defecto**.
- **Sistema de extensiones.** Plugins para nuevos tipos de objetos, visualizadores, algoritmos y disciplinas, con manifiestos de capacidades, versionado y permisos.
- **Descomposición de tareas difíciles.** Poder representar por tramos las regiones no elementales, superficies singulares o soluciones implícitas; si algo no se puede representar con precisión, explicarlo.
- **Modo inspección.** Mostrar al estudiante qué algoritmo se utilizó, con qué supuestos y si el resultado es exacto, numérico o estimado.

## 6. Apuntes y lectura científica

- **Editor híbrido Markdown + matemáticas.** Texto común, encabezados, listas, tablas, imágenes, diagramas y fórmulas editables mediante LaTeX o editor visual.
- **Bloques vivos.** Cada sección puede contener demostraciones, gráficos, simulaciones, ejercicios, tarjetas de memoria y datos vinculados.
- **Anotaciones sobre gráficos.** Escribir directamente junto a un punto o vector y guardar la nota anclada a las coordenadas matemáticas, no a píxeles fijos.
- **Vínculos entre apuntes.** Conectar 'gradiente' con 'derivada direccional', 'superficie de nivel' y 'multiplicadores de Lagrange' mediante referencias bidireccionales.
- **Índice conceptual.** Buscar por tema, fórmula, definición, símbolo, hipótesis, dibujo o palabra clave.
- **Anclajes a fuentes.** Guardar el nombre del libro, sección y página de origen, respetando derechos de autor cuando el documento se comparta.
- **Historial de cambios.** Control de versiones, comparación de fórmulas, deshacer/rehacer y recuperación de estados.
- **Importación razonable.** De PDF, Markdown, LaTeX, Jupyter, imágenes o datos tabulares: el documento debería reconocer qué se puede convertir en objeto interactivo y qué debe permanecer estático.
- **Exportación con degradación elegante.** A PDF se exportaría una versión imprimible (sin movimiento) con capturas, fórmulas y enlaces/QR a simulaciones cuando existan.
- **Sincronización opcional.** El archivo local debe abrirse sin una cuenta; una nube puede agregar sincronización, coedición y biblioteca personal.
- **Referencias bibliográficas.** DOI, URL, libros, autores, páginas, fecha y metadatos de licencia.
- **Reproducibilidad.** Guardar parámetros utilizados en una gráfica o cálculo, versiones del motor y semillas aleatorias para regenerar resultados.

## 7. Aprendizaje activo integrado

- **Explicaciones por niveles.** Modo intuitivo, formal, universitario y avanzado, con la misma base matemática y profundidades distintas.
- **Pruebas visuales.** Mostrar el concepto primero, después la identidad, luego la demostración y finalmente su aplicación, si el tema lo permite.
- **Resolución paso a paso.** Cada paso debe indicar operación, justificación y condiciones de validez, no únicamente una igualdad transformada.
- **Pistas graduadas.** Una primera pista ayuda a detectar el método; la siguiente explica un obstáculo; la solución completa se desbloquea solo si el estudiante quiere verla.
- **Detección de errores.** Permitir que el estudiante ingrese un desarrollo y comprobar equivalencia, signos, factores, restricciones, condiciones iniciales y unidades.
- **Respuestas equivalentes.** Reconocer expresiones algebraicamente distintas pero matemáticamente equivalentes dentro de sus dominios correctos.
- **Ejercicios generativos con restricciones.** Crear variantes con números o funciones diferentes pero una estructura y dificultad controladas.
- **Predicción antes de mostrar.** Preguntar '¿la región crece o disminuye si muevo el eje?' antes de activar la animación.
- **Modo examen.** Ocultar sugerencias y respuestas, mantener temporizador opcional, permitir dibujos y dar una corrección posterior.
- **Práctica espaciada.** Guardar qué se aprendió, qué conceptos requieren revisión y cuándo conviene volver a resolverlos.
- **Mapa de prerrequisitos.** Mostrar relaciones entre álgebra, trigonometría, geometría, funciones, límites, derivadas e integrales.
- **Progreso conceptual real.** Medir dominio por tipo de habilidad (interpretar, plantear, calcular, justificar) en vez de contabilizar solo páginas leídas.
- **Exploración libre.** Permitir experimentar y formular hipótesis sin calificar cada intento.
- **Modo accesible.** Navegación por teclado, lectores de pantalla, descripciones textuales, contraste configurable, controles táctiles y alternativas no visuales cuando sea posible.

## 8. Aplicaciones por disciplinas

### 8.1. Álgebra

- **Manipulación paso a paso.** Expansión, factorización, simplificación, fracciones, ecuaciones, desigualdades y sistemas, registrando condiciones de equivalencia.
- **Gráfica vinculada.** Al mover el coeficiente `a` de `ax²+bx+c`, cambian la parábola, raíces, discriminante, vértice y factorización.
- **Transformaciones de funciones.** Comparar `f(x)` con `f(x-h)+k`, `af(x)` y `f(bx)` mediante deslizadores.
- **Matrices y álgebra lineal.** Operaciones, transformaciones lineales 2D/3D, espacios vectoriales, autovalores, autovectores y descomposiciones visualizables.

### 8.2. Geometría y trigonometría

- **Construcciones geométricas.** Rectas, ángulos, mediatrices, polígonos, circunferencias y lugares geométricos con restricciones persistentes.
- **Cónicas vivas.** Parábola, elipse, hipérbola y circunferencia con focos, directrices, excentricidad, ejes y sus ecuaciones vinculadas.
- **Transformaciones.** Traslaciones, rotaciones, reflexiones, homotecias y composiciones animadas.
- **Círculo trigonométrico.** Relación entre ángulo, seno, coseno, tangente, identidades, períodos y gráficas sincronizadas.
- **Coordenadas.** Conversión gráfica y algebraica entre cartesianas, polares, cilíndricas y esféricas, con convenciones angulares explícitas.

### 8.3. Cálculo diferencial e integral

- **Límites.** Aproximación por la izquierda/derecha, secuencias, indeterminaciones, discontinuidades y definición ε–δ con bandas móviles.
- **Derivadas.** Recta secante convergiendo a la tangente, pendiente local, derivadas sucesivas, velocidad y aceleración.
- **Integrales.** Riemann, integral definida, integrales impropias, área bajo la curva, áreas entre curvas y volumen por revolución.
- **Técnicas de integración.** Sustitución, partes, sustitución trigonométrica y fracciones parciales con árbol de decisión y pasos validados.
- **Series.** Sumas parciales, convergencia/divergencia, series de Taylor y error de aproximación visual.

### 8.4. Cálculo vectorial y multivariable

- **Funciones vectoriales.** Trayectorias 2D/3D, posición, velocidad, aceleración, tangente unitario, normal y curvatura.
- **Superficies.** Dominio, curvas y superficies de nivel, continuidad, derivadas parciales y plano tangente.
- **Gradiente.** Vector de máximo crecimiento superpuesto a curvas de nivel, con dirección, norma y derivada direccional.
- **Optimización.** Puntos críticos, Hessiana, máximos/mínimos locales y absolutos; multiplicadores de Lagrange con restricciones visualizadas.
- **Integrales múltiples.** Región de integración en 2D/3D, cortes, orden de integración, cambio de coordenadas y jacobiano animado.
- **Campos vectoriales.** Flechas, líneas de flujo, circulación, potencial, divergencia y rotacional.
- **Integrales de línea/superficie.** Curva orientada, trabajo, flujo, normales y superficies parametrizadas con orientación visible.
- **Green, Stokes y Gauss.** Representar dominios, fronteras y campos para visualizar qué relaciona cada teorema y bajo qué hipótesis.

### 8.5. Otras ciencias y áreas técnicas

- **Ecuaciones diferenciales.** Campos de pendientes, condiciones iniciales, soluciones numéricas y estabilidad de sistemas.
- **Física y mecánica.** Cinemática, oscilaciones, energía, fuerzas, movimiento de partículas y sistemas dinámicos.
- **Electromagnetismo.** Campos eléctricos/magnéticos, flujo y circulación, con atención a las hipótesis físicas del modelo.
- **Química.** Cinética, equilibrio, curvas de concentración y variación de parámetros de reacción.
- **Probabilidad y estadística.** Distribuciones, simulación Monte Carlo, inferencia, regresión e intervalos de confianza.
- **Optimización e ingeniería.** Restricciones de diseño, análisis de sensibilidad, problemas geométricos, simulación de procesos y comparación de escenarios.
- **Computación.** Complejidad algorítmica, visualización de estructuras de datos, algoritmos numéricos y ejemplos de código ejecutables bajo permisos.
- **Datos experimentales.** Importación de CSV, manejo de incertidumbre, ajuste de modelos, unidades y propagación de errores.

## 9. Inteligencia opcional del documento

- **Asistente contextual.** Responder a preguntas sobre un bloque específico usando sus ecuaciones, datos y referencias, en vez de improvisar información sin conexión al documento.
- **Traducción de intención a acciones.** Convertir 'muestra el área de la región entre estas curvas' a una estructura `Region` y una visualización segura; pedir contexto solo cuando la región o el eje no están definidos.
- **Generador de escenas.** Producir un nuevo gráfico a partir de un problema con controles adecuados, reconociendo los objetos matemáticos y evitando gráficos decorativos inconexos.
- **Explicaciones adaptativas.** Si una persona se equivoca al establecer límites, ofrecer una representación de las proyecciones y una pista focalizada.
- **Auditoría de resultados.** Comparar salidas del asistente con cálculo simbólico o numérico cuando sea posible, identificando explícitamente qué quedó sin demostrar.
- **Trabajar sin IA.** Las lecciones, controles, fórmulas y procedimientos deterministas deben seguir funcionando si no hay red ni credenciales.

## 10. Arquitectura recomendada

- **Contenedor.** Un archivo `.scinote` puede ser un paquete ZIP versionado; las rutas internas se documentan públicamente para permitir otros lectores.
- **Manifiesto.** Archivo `manifest.json` con identificación, versión de especificación, licencias, dependencias, capacidades, compatibilidad y permisos.
- **Contenido humano.** `document.md` guarda la narrativa en Markdown y referencias a objetos interactivos mediante identificadores estables.
- **Objetos computables.** Directorio `objects/` con JSON tipados para expresiones, variables, gráficos, regiones, construcciones, evaluaciones y relaciones de dependencia.
- **Recursos.** `assets/` guarda imágenes, tablas, fuentes de datos y otros recursos locales autorizados.
- **Estados.** `states/` contiene parámetros iniciales, escenarios y vistas reproducibles.
- **Pruebas.** `tests/` define casos verificables como 'dos funciones cruzan en 0 y 1' o 'el volumen para 2π coincide con el de 3π'.
- **Código opcional.** `scripts/` contiene extensiones autorizadas, declarando el intérprete, las capacidades y los límites de ejecución requeridos.
- **Tipos y esquemas.** Validación formal de JSON, referencia a un estándar para ecuaciones, versión migrable y reglas para preservar datos desconocidos.
- **Dependencias discretas.** Grafo dirigido que vincula una expresión con sus resultados y vistas, con recalculado incremental.

### Estructura de ejemplo

```text
leccion-integrales.scinote
├── manifest.json
├── document.md
├── objects/
│   ├── funciones.json
│   ├── region.json
│   ├── rotacion.json
│   └── ejercicio.json
├── states/
│   ├── inicial.json
│   └── ejemplo-3pi.json
├── assets/
│   └── bibliografia.json
├── tests/
│   └── volumen.json
└── scripts/             # opcional y sujeto a permisos
```

### Ejemplo mínimo declarativo (ilustrativo, no sintaxis oficial)

```json
{
  "id": "revolucion-01",
  "type": "solid_of_revolution",
  "region": {
    "variable": "x",
    "lower": "x^2",
    "upper": "x",
    "interval": [0, 1]
  },
  "axis": "x",
  "angle": {
    "parameter": "alpha",
    "initial": 0,
    "final": "3*pi",
    "slider": true
  },
  "views": ["region_2d", "sweep_3d", "cross_section", "volume_formula"],
  "verify": {
    "expected_full_turn_volume": "2*pi/15",
    "no_extra_union_volume_after": "2*pi"
  }
}
```

- **Interpretación.** Un lector compatible crea la región, muestra el deslizador de ángulo, dibuja el barrido 3D y computa el volumen. El estudiante puede modificar las ecuaciones y el lector reutiliza el motor.
- **El ejemplo no impone un parser.** La notación `"x^2"` es legible; una implementación rigurosa debe convertirla a una representación estructurada con validación de variables y sintaxis.

## 11. Tecnologías reutilizables para un prototipo

- **JSXGraph:** construcciones y gráficos matemáticos interactivos en navegador, con objetos movibles, animaciones y soporte 2D/3D. Documentación: https://jsxgraph.org/docs/
- **Three.js:** geometría y animaciones tridimensionales, controles de cámara y generación de escenas. Documentación: https://threejs.org/docs/
- **Plotly.js:** gráficos científicos, superficies, mapas de calor, curvas de nivel e interactividad estadística. Documentación: https://plotly.com/javascript/
- **SymPy:** motor simbólico para derivadas, integrales, ecuaciones y transformaciones. Documentación: https://docs.sympy.org/latest/
- **Pyodide:** Python en WebAssembly para ejecutar cálculos locales en navegadores compatibles, sujeto a compatibilidad y límites de recursos. Documentación: https://pyodide.org/en/stable/
- **MathLive / Compute Engine:** edición matemática, análisis de LaTeX y operaciones simbólicas en JavaScript. Documentación: https://mathlive.io/compute-engine/
- **Jupyter / nbformat:** referencia de un formato abierto que guarda texto, código, resultados y metadatos en celdas; valioso para interoperabilidad, aunque no reemplaza el diseño específico de escenas. Documentación: https://nbformat.readthedocs.io/en/latest/
- **JupyterLite:** opción para cómputo interactivo mediante componentes de Jupyter en el navegador. Documentación: https://jupyterlite.readthedocs.io/en/stable/
- **Decisión de arquitectura.** No hace falta incluir todas las bibliotecas desde el primer día. Se pueden adoptar motores por especialidad tras pruebas de tamaño, mantenimiento, rendimiento y compatibilidad.

## 12. Requisitos de seguridad, fiabilidad y accesibilidad

- **Abrir no significa ejecutar.** Por defecto, el visor debe tratar código embebido como contenido no confiable; requerir autorización explícita para ejecutarlo.
- **Aislamiento.** Ejecutar scripts y plugins en sandbox con permisos mínimos, límites de CPU/memoria/tiempo y sin acceso arbitrario al sistema de archivos o red.
- **Firma e integridad.** Verificar la integridad de paquetes y dependencias; advertir sobre código externo, extensiones desconocidas y contenido remoto.
- **Conservación de datos.** Copia de seguridad, migraciones reversibles y apertura en modo de solo lectura si la versión no es compatible.
- **Precisión matemática.** Separar cantidades exactas, aproximaciones flotantes, mediciones experimentales y predicciones de modelos.
- **Unidades y dimensiones.** Guardar unidades físicas y comprobar operaciones dimensionalmente inconsistentes.
- **DOMINIOS.** Validar denominadores cero, raíces, logaritmos, parámetros fuera de intervalo, discontinuidades y condiciones de integrabilidad.
- **Convergencia y límites.** Señalar fallos del solver, tolerancias insuficientes, mallas muy gruesas y resultados visuales engañosos.
- **Rendimiento.** Recalcular solo objetos afectados, usar caché y niveles de detalle para mantener fluidas las escenas complejas.
- **Modo offline.** Guardar bibliotecas y datos necesarios o degradar funciones claramente cuando una capacidad requiera conexión.
- **Accesibilidad.** Compatibilidad con teclado, lectores de pantalla, contrastes elevados, tamaños de texto variables y descripción verbal de escenas dinámicas.
- **Licencias y autoría.** Control de permisos, crédito de fuentes y respeto a derechos de los documentos importados.

## 13. Interoperabilidad y colaboración

- **Formato público y documentado.** Publicar una especificación, ejemplos, validador y pruebas de conformidad para evitar depender de un único lector.
- **Compatibilidad con Git.** Permitir una representación textual o un modo de extracción para comparar cambios del archivo aunque el contenedor sea binario.
- **Colaboración opcional.** Comentarios por bloque, revisión por profesores, versiones y coedición sincronizada cuando exista un servidor compatible.
- **Exportación e importación.** Markdown, HTML estático, PDF, LaTeX, datos tabulares, Jupyter Notebook y capturas o modelos 3D, según el contenido.
- **Referencias estables.** Citar objetos y páginas sin que se rompan cuando se reorganiza el documento.
- **Biblioteca de componentes.** Compartir una construcción como 'sólido de revolución' e insertarla en otra lección con parámetros distintos.

## 14. Progresión realista de desarrollo

### Fase 1 — Producto mínimo útil

- **Editor de apuntes:** Markdown, fórmulas y bloques matemáticos identificables.
- **Gráficas 2D:** curvas editables, deslizadores, intersecciones, límites y regiones sombreadas.
- **Áreas y demostraciones:** cálculo exacto o numérico de áreas con explicación y comprobación de dominio.
- **Guardar y abrir:** especificación inicial de `.scinote` con lector web y prueba de exportación.
- **Una lección de referencia:** `y=x` frente a `y=x²`, incluyendo el sombreado y el valor `A=1/6`.

### Fase 2 — Interactividad 3D y aprendizaje

- **Giro de regiones:** barrido progresivo con ángulo libre, eje configurable, cortes transversales y volumen.
- **Vectores y superficies:** trayectorias, derivadas, planos tangentes, gradientes e integrales múltiples.
- **Evaluación:** pasos guiados, respuestas equivalentes, pistas y ejercicios autocorregibles.
- **Importaciones:** referencias bibliográficas, imágenes y compatibilidad básica con otros formatos.

### Fase 3 — Ecosistema ampliable

- **Motor de plugins:** nuevas disciplinas y visualizadores instalables con controles de seguridad.
- **Asistente opcional:** creación de escenas a partir de problemas en lenguaje natural, con verificación.
- **Informes reproducibles:** datos, simulaciones, incertidumbre y resultados técnicos auditables.
- **Compatibilidad entre lectores:** esquema estable, migraciones, validación y pruebas públicas de conformidad.

## 15. Criterios para saber si el formato funciona

- **Caso de prueba 1.** Crear `f=x` y `g=x²`, localizar intersecciones, sombrear el área correcta y calcular `1/6` sin escribir código de visualización.
- **Caso de prueba 2.** Sustituir `g=x²` por `g=x³` y ver cómo cambian automáticamente intersecciones, región y área, sin construir otra lección.
- **Caso de prueba 3.** Girar la región en torno a `x`, reproducir de `0` a `3π`, mostrar el barrido y comprobar que el volumen geométrico tras `2π` no vuelve a aumentar.
- **Caso de prueba 4.** Cambiar el eje de rotación a una recta desplazada; actualizar malla, método y resultado, mostrando advertencias cuando la región cruza el eje.
- **Caso de prueba 5.** Guardar, cerrar y abrir el archivo sin perder parámetros, apuntes, vistas y ejercicios.
- **Caso de prueba 6.** Abrirlo sin internet y acceder al contenido esencial, aunque el asistente conectado no esté disponible.
- **Caso de prueba 7.** Importar expresiones con raíces, logaritmos y discontinuidades: no dibujar ni calcular sobre dominios prohibidos sin avisar.
- **Caso de prueba 8.** Abrir un documento que incluya código no confiable sin que ese código se ejecute automáticamente.

## 16. La idea que realmente lo diferenciaría

- **Un documento que comprende objetos matemáticos y sus relaciones:** no solo muestra un vídeo de cómo se resuelve un problema, sino que almacena la estructura del problema; por eso puede responder a modificaciones.
- **Un mismo objeto para aprender, experimentar y documentar:** la misma región matemática puede aparecer en teoría, ejercicios, simulación, demostración y reporte científico.
- **Interacción declarativa más extensiones verificadas:** los casos normales se crean con objetos y reglas; los casos inéditos pueden ampliarse mediante módulos o código aislado.
- **Fidelidad conceptual:** priorizar que la visualización ayude a entender qué se está calculando, qué hipótesis se usan y cuándo una fórmula deja de ser aplicable.

---

**Propuesta de dirección:** comenzar con `.bwjm` como un formato abierto de apuntes matemáticos interactivos, construir primero un visor con áreas entre curvas y sólidos de revolución, y extender progresivamente su motor a geometría, álgebra, cálculo vectorial, física e ingeniería. El componente más difícil y valioso no es la animación: es la representación matemática estructurada que permite que nuevas ecuaciones produzcan nuevas interacciones sin programar cada caso por separado.
