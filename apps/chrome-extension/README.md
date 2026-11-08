# BWJM Document Viewer para Google Chrome

Esta extensión permite que **Google Chrome** abra y renderice directamente tus archivos `.bwjm` y `.jm` como documentos interactivos vivos (con gráficas 2D/3D interactivas, ecuaciones LaTeX y controles animados de reproducción), **sin generar ningún archivo `.html`**.

## ¿Cómo funciona?

1. Al abrir o arrastrar un archivo `.bwjm` a Google Chrome (`file:///.../mi_archivo.bwjm`), Chrome detecta la extensión.
2. El visor sustituye la vista de texto plano por la hoja interactiva de documento (`.bwjm-sheet`).
3. La URL en la barra de navegación se mantiene idéntica (`file:///.../mi_archivo.bwjm`), preservando el formato nativo puro sin intermediarios HTML.

## Cómo instalar en Google Chrome (Modo Desarrollador)

1. Abre Google Chrome y escribe en la barra de direcciones:
   ```
   chrome://extensions
   ```
2. Activa el interruptor **Modo de desarrollador** en la esquina superior derecha.
3. Haz clic en el botón **Cargar descomprimida** (Load unpacked).
4. Selecciona la carpeta:
   ```
   E:\mathmd\apps\chrome-extension
   ```
5. En la ficha de la extensión instalada, haz clic en **Detalles** y activa la opción:
   - **Permitir acceso a las URL de archivo** (Allow access to file URLs).
6. ¡Listo! Ahora simplemente arrastra cualquier archivo `.bwjm` (como `examples/demo.bwjm`) a una pestaña de Chrome o haz doble clic / abrir con Chrome.

