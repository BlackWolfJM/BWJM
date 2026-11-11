# BWJM Document Viewer para Google Chrome

Esta extensión abre archivos `.bwjm` y `.jm` en **Google Chrome** y muestra una vista previa del documento con los bloques científicos compatibles.

## ¿Cómo funciona?

1. Al abrir o arrastrar un archivo `.bwjm` a Google Chrome (`file:///.../mi_archivo.bwjm`), Chrome detecta la extensión.
2. El visor sustituye la vista de texto plano por la hoja interactiva de documento (`.bwjm-sheet`).
3. La URL en la barra de navegación se mantiene idéntica (`file:///.../mi_archivo.bwjm`), preservando el formato nativo puro sin intermediarios HTML.

## Cómo instalar en Google Chrome (Modo Desarrollador)

1. Desde la raíz del repositorio, ejecuta `pnpm install --frozen-lockfile` y `pnpm build`.
2. Abre Google Chrome y visita `chrome://extensions`.
3. Activa **Modo de desarrollador** y elige **Cargar descomprimida**.
4. Selecciona `apps/chrome-extension` dentro del repositorio clonado.
5. Abre **Detalles** y activa **Permitir acceso a las URL de archivo**.
6. Arrastra un [archivo de ejemplo](../../examples/) a una pestaña de Chrome.

