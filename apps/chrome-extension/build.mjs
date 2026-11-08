import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "../..");

const srcWebview = resolve(rootDir, "apps/vscode-extension/dist/webview.js");
const srcCss = resolve(rootDir, "apps/vscode-extension/media/preview.css");

const destDist = resolve(__dirname, "dist");
const destMedia = resolve(__dirname, "media");
const destBundle = resolve(destDist, "viewer.bundle.js");
const destCss = resolve(destMedia, "preview.css");

if (!existsSync(destDist)) {
  mkdirSync(destDist, { recursive: true });
}
if (!existsSync(destMedia)) {
  mkdirSync(destMedia, { recursive: true });
}

if (existsSync(srcWebview)) {
  copyFileSync(srcWebview, destBundle);
  console.log(`Copiado bundle a ${destBundle}`);
} else {
  console.error(`Error: No se encontró ${srcWebview}. Ejecuta antes el build de vscode-extension.`);
  process.exit(1);
}

if (existsSync(srcCss)) {
  copyFileSync(srcCss, destCss);
  console.log(`Copiado estilos a ${destCss}`);
} else {
  console.error(`Error: No se encontró ${srcCss}.`);
  process.exit(1);
}

console.log("Build de extensión Chrome completado.");

