# BWJM — Fase 2 de implementación científica

## Estado real

Esta fase implementa componentes **reutilizables** en el formato `.bwjm`. No constituye la implementación completa de las 200 funcionalidades propuestas en el [roadmap](ROADMAP_200_FUNCIONALIDADES_CIENTIFICAS.md).

### Nuevos tipos de bloque

| Bloque | Funcionalidad implementada | Herramientas |
|---|---|---|
| `datatable` | Tabla nativa de datos con unidades, precisión, celdas textuales y numéricas | CSV, TSV, JSON |
| `functiontable` | Muestreo automático de expresiones de 1 variable con hasta 500 filas | CSV, TSV, JSON |
| `datachart` | Gráfico vinculado a una tabla por su identificador | dispersión, línea, barra, área, escalón, histograma, caja, pastel |
| `statistics` | Resumen estadístico y regresión lineal | media, mediana, extremos, cuartiles, varianza muestral, desviación, correlación y R² |
| `parametric2d` | Curva parametrizada animable en 2D con partícula y estela | vector velocidad, aceleración, T y N, exportación SVG |
| `flow2d` | Semillas en un campo vectorial y líneas de corriente RK4 | flechas, partículas temporales, exportación SVG |

### Pruebas manuales recomendadas

Abre [laboratorio-cientifico-interactivo.bwjm](../examples/laboratorio-cientifico-interactivo.bwjm) desde BWJM Studio:

1. Reproduce el deslizador `t` y observa la partícula de la circunferencia.
2. Comprueba que su velocidad es tangente y su normal apunta hacia el centro.
3. Exporta `muestras-circulo` a CSV, TSV y JSON.
4. Comprueba que `radio2` se aproxima a 1.
5. Inspecciona las vistas dispersión, línea e histograma.
6. Comprueba que `experiencia-lineal` produce una regresión creciente.
7. Exporta la curva 2D en SVG.
8. Verifica que las expresiones matemáticas de las superficies no aparecen como títulos crudos de Plotly.
9. Observa las líneas de corriente de `flow2d` y el movimiento temporal de sus partículas.

### Verificación automatizada

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`

Consultar el resultado del pipeline de GitHub Actions asociado al commit; no afirmar que los cambios están verificados visualmente en un navegador solo porque CI aprueba.

### Pendiente

- Exportar a XLSX y PDF científico estructurado.
- Integración temporal 2D/3D multiescena a alto rendimiento.
- Gráficas de límites, Lagrange, integrales múltiples, flujo, Green, Stokes y Gauss configurables de extremo a extremo.
- Interoperabilidad completa de todos los bloques heredados y nuevos.
- Validación visual de accesibilidad, rendimiento y navegación con teclado.
