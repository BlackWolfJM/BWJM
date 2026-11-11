# 41.08 · Elegir un método de integración en BWJM Studio

En **Insertar → Gráficos y superficies → Áreas e integrales (10)**, abre **Guía para elegir un
método de integración**. Selecciona la clase de integral y confirma las
hipótesis del problema. La guía enumera las que faltan y propone una
parametrización directa cuando falta alguna. También cubre el atajo por
potencial cuando se conoce una función cuyo gradiente coincide con el campo.

Para Green, la guía permite seleccionar la plantilla existente e insertar el
bloque `calculusviz` en el documento. El archivo
[`guia-integracion-green.bwjm`](../examples/guia-integracion-green.bwjm)
compara la circulación y la integral doble en el disco unitario. El valor
exacto de ambas es π. Puedes editar, guardar y reabrir el bloque con la
sintaxis de `calculusviz` existente.

| Método | Verificación que decide si se aplica | Caso que debe quedar fuera |
|---|---|---|
| Potencial | Gradiente igual al campo en un entorno de la trayectoria | Rotacional nulo en un dominio perforado sin potencial global |
| Green | Frontera plana completa, orientación positiva y campo C¹ en un entorno de la región | Campo de circulación alrededor del origen, singular dentro del contorno |
| Stokes | Borde completo, superficie compacta y orientable, normal compatible y campo C¹ en su entorno | Superficie de Möbius, semiplano no compacto o normal incompatible |
| Gauss | Frontera cerrada completa, normal exterior y campo C¹ en un entorno del sólido | Hemisferio sin tapa o campo singular dentro del volumen |

La guía valida la combinación de hipótesis **confirmadas por el usuario**. La
plantilla de Green estima cierre, intersecciones y orientación sobre una única
curva muestreada. Estas comprobaciones no demuestran regularidad del campo.
Stokes y Gauss se recomiendan mediante sus fórmulas. Sus integrales 3D aún
requieren motores de superficie y volumen para calcular ambos lados.

## Cobertura de prerrequisitos

- Campos 2D, gradiente, rotacional escalar, divergencia plana y líneas de
  corriente tienen implementaciones en `packages/math` y visualizaciones en
  el lector. Las trayectorias 3D y el cálculo de cinemática permiten
  reutilizar parametrizaciones. La cobertura numérica 2D no verifica por sí
  sola identidades diferenciales 3D.
- Hay integración de línea sobre curvas parametrizadas y una comparación
  numérica para Green en `calculusviz`. El motor adicional de Green admite
  regiones disco y rectángulo. Su comprobación de signo por orientación se
  puede reutilizar como caso de prueba.
- Para Stokes y Gauss faltan integradores de superficies orientadas y
  volúmenes generales, manejo de fronteras completas y estimación de error.
  Las escenas 3D ayudan a mostrar las normales, pero dibujar una superficie
  no garantiza que sea orientable ni que encierre un sólido.
