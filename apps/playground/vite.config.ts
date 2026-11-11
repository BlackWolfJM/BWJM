import { defineConfig } from "vite";
import type { Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const virtualKatexId = "virtual:bwjm-katex-offline-css";
const resolvedKatexId = "\0" + virtualKatexId;

/**
 * Build an on-demand JS chunk containing KaTeX CSS and only its WOFF2 fonts.
 * Keeping this in a virtual module avoids writing binary/generated source into
 * Git; the chunk is loaded only when the user exports a standalone HTML file.
 */
function katexOfflineExportPlugin(): Plugin {
  return {
    name: "bwjm-local-katex-html",
    resolveId(id) {
      if (id === virtualKatexId) return resolvedKatexId;
      return null;
    },
    load(id) {
      if (id !== resolvedKatexId) return null;
      const cssFile = require.resolve("katex/dist/katex.min.css");
      let fontCount = 0;
      // The minified KaTeX CSS deliberately omits the final semicolon
      // inside each @font-face. Match each rule separately, never across
      // its closing brace (that would erase every font except the last).
      const css = readFileSync(cssFile, "utf8").replace(
        /@font-face\s*\{([^}]*)\}/g,
        (rule, declarations: string) => {
          const src = /src\s*:\s*([^;]+)(?=;|$)/.exec(declarations);
          if (!src) return rule;
          const woff2 = src[1].match(/url\(["']?([^)"']+\.woff2)["']?\)/);
          if (!woff2) return rule;
          const relative = woff2[1];
          if (!/^fonts\/[a-zA-Z0-9_-]+\.woff2$/.test(relative)) {
            throw new Error("Ruta de fuente KaTeX inesperada: " + relative);
          }
          const bytes = readFileSync(path.resolve(path.dirname(cssFile), relative));
          fontCount++;
          const embedded = 'src:url("data:font/woff2;base64,' +
            bytes.toString("base64") + '") format("woff2")';
          return "@font-face{" + declarations.replace(src[0], embedded) + "}";
        },
      );
      const faceCount = (css.match(/@font-face/g) ?? []).length;
      if (fontCount < 15 || faceCount !== fontCount ||
          /url\((?!["']?data:)/.test(css)) {
        throw new Error("CSS KaTeX exportado sin fuentes WOFF2 completamente embebidas");
      }
      return "export default " + JSON.stringify(css) + ";";
    },
  };
}

export default defineConfig({
  plugins: [react(), katexOfflineExportPlugin()],
  // GitHub Pages serves this repository at /BWJM-WEB/, not the domain root.
  base: process.env.BWJM_BASE_PATH || "/",
  server: { port: 3000 },
  resolve: {
    alias: {
      "@mathmd/ast": path.resolve(__dirname, "../../packages/ast/src/index.ts"),
      "@mathmd/parser": path.resolve(__dirname, "../../packages/parser/src/index.ts"),
      "@mathmd/math": path.resolve(__dirname, "../../packages/math/src/index.ts"),
      "@mathmd/core": path.resolve(__dirname, "../../packages/core/src/index.ts"),
      "@mathmd/renderer-plotly": path.resolve(__dirname, "../../packages/renderer-plotly/src/index.ts"),
      "@mathmd/renderer-svg": path.resolve(__dirname, "../../packages/renderer-svg/src/index.ts"),
    },
  },
});
