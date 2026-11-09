# ADR-0007 — BWJM Studio: cinta modular y documentos en pestañas

- Estado: implementación en rama científica, pendiente de revisión y fusión a main.
- Fecha: 2026-11-09.
- Objetivo: aplicar la interfaz aprobada inspirada en Word sin modificar el formato científico BWJM.

## Decisión de diseño

La aplicación utiliza cuatro superficies con responsabilidades no superpuestas:

| Superficie | Función | Componente |
|---|---|---|
| Cabecera | Marca, búsqueda de palabras y diagnóstico discreto | DocumentSearch |
| Pestañas | Documentos abiertos, activo, indicador de edición, cerrar y crear | DocumentTabs |
| Cinta superior | Comandos por categoría, contraíble y abierta al iniciar | Ribbon |
| Espacio central | Esquema/Variables/Lecciones/Inspector a la izquierda, editor y lector al centro | SidebarLeft, main |

Los componentes antiguos MenuBar, ToolBar y StatusBar no se renderizan. SidebarRight se reutiliza dentro de la pestaña Inspector de SidebarLeft, sin ocupar la columna derecha.

## Contratos de extensibilidad

- workspaceDocuments.ts: estado tipado por documento, con ID propio y funciones puras para editar, abrir, guardar y cerrar.
- DocumentTabs.tsx: pestañas independientes del contenido científico, identificadas por ID y nunca únicamente por nombre de archivo.
- DocumentSearch.tsx: búsqueda case-insensitive con posiciones, navegación anterior/siguiente y Ctrl+F. La paleta de comandos mantiene Ctrl+K.
- Ribbon.tsx: registro declarativo RIBBON_GROUPS, categorías, grupos y acciones tipadas RibbonAction.
- main.tsx: integra los servicios existentes, el despachador de acciones, MathMDCore, parser y renderizadores SVG/Plotly, sin duplicar cálculos.
- theme.css: estilos encapsulados por módulos y distribución responsive.

## Para agregar funciones

1. Registrar el ID de la herramienta en RibbonAction y la acción en un grupo de RIBBON_GROUPS.
2. Conectar el ID a una acción implementada mediante handleRibbonAction o un servicio reutilizable.
3. Si la herramienta requiere un bloque matemático nuevo, añadir su esquema al AST/parser, cálculo al motor y renderer correspondiente.
4. Añadir pruebas matemáticas, de parser y de interacción de documentos. No crear una segunda barra con botones duplicados.

## Comportamiento

- La cinta está abierta por defecto; se contrae con el botón o Ctrl+F1.
- El buscador de palabras ocupa la cabecera y tiene atajo Ctrl+F; la paleta de comandos sigue en Ctrl+K.
- Los documentos se conservan individualmente en memoria al alternar pestañas.
- Las lecciones reutilizan su pestaña, sin sobrescribir modificaciones locales previas.
- Una pestaña con ediciones pide confirmación para cerrar; si era la última, se crea una vacía.
- El Inspector presenta métricas y diagnósticos solo del documento activo.
- Guardar solicita una descarga local: no existe persistencia en nube, recuperación automática tras cerrar la sesión ni sincronización multiusuario.
- Vista editor/dividido/lector y tema son globales; el contenido del archivo es propio de cada pestaña.

## Verificación

- pnpm lint, pnpm typecheck, pnpm test, pnpm build.
- apps/playground/__tests__/workspaceDocuments.test.ts: aislamiento del contenido, recuperación de lecciones, cierre y guardado; registro no duplicado y búsqueda de texto.
- Prueba manual pendiente: importar dos archivos, alternar, cerrar con cambios, insertar gráficas y comprobar 3D, exportaciones, búsqueda y modo contraído.

## Riesgos conocidos

El motor científico actual conserva su lógica de renderizado existente y vuelve a construir la vista cuando cambia el documento activo. Un paso futuro será extraer el despachador de acciones de main.tsx sin cambiar sus IDs, añadir pruebas de navegador y mejorar la recuperación local de sesiones.