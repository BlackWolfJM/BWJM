# MathMD for Visual Studio Code

Development preview of the official MathMD extension.

## Commands

- `MathMD: Abrir vista previa`
- `MathMD: Validar documento`
- `MathMD: Exportar recursos para GitHub`

Open a Markdown document containing MathMD fenced blocks and run the preview command. Diagnostics update as the document changes. The preview supports the currently implemented SVG and Plotly renderers, including reactive sliders and checkboxes.

## Local package

From the repository root:

```bash
pnpm --filter mathmd-vscode run package:vsix
```

Install the generated VSIX with **Extensions: Install from VSIX…** in Visual Studio Code.
