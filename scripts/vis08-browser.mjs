/**
 * VIS-08 acceptance on production Vite build, then a standalone file:// HTML.
 * Uses the isolated Playwright install set up by .github/workflows/vis08-browser.yml.
 */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const require = createRequire("/tmp/bwjm-browser/runner.cjs");
const { chromium } = require("playwright");
const fence = String.fromCharCode(96).repeat(3);
const url = "http://127.0.0.1:4173/BWJM-WEB-/";
const source = [
  "Raíz en línea: $\\sqrt{x^2+1}$.", "",
  "$$", "\\frac{1}{1+\\frac{1}{2}}", "$$", "",
  "$$", "\\begin{bmatrix}", "1 & 2 \\\\", "3 & 4", "\\end{bmatrix}", "$$", "",
  "$$", "\\frac{1}{", "$$", "",
  "Este párrafo y la siguiente gráfica deben seguir visibles.", "",
  fence + "plot2d", "id: vis08-curva", "equation: x^2",
  "domain: [-2, 2]", fence,
].join("\n");
const server = spawn("pnpm", [
  "--dir", "apps/playground", "preview",
  "--host", "127.0.0.1", "--strictPort", "--port", "4173",
], { env: { ...process.env, BWJM_BASE_PATH: "/BWJM-WEB-/" }, stdio: "inherit" });
let browser;

async function openStudio(page) {
  for (let attempt = 0; attempt < 45; attempt++) {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 4500 });
      await page.getByRole("tab", { name: "Insertar" }).waitFor({ timeout: 4000 });
      return;
    } catch {
      await new Promise(resolve => setTimeout(resolve, 850));
    }
  }
  throw new Error("La compilación de Vite no inició con /BWJM-WEB-/");
}

async function checkFont(page, where) {
  const loaded = await page.evaluate(async () => {
    const faces = await document.fonts.load("16px KaTeX_Main");
    await document.fonts.ready;
    return faces.map(face => ({
      family: face.family, status: face.status,
    }));
  });
  assert(loaded.some(face => face.family.includes("KaTeX_Main") && face.status === "loaded"),
    where + ": KaTeX_Main no cargó: " + JSON.stringify(loaded));
  return loaded;
}

async function checkMathDOM(page, label) {
  const viewer = page.locator("#bwjm-reader-panel");
  await viewer.locator(".katex-mathml msqrt").first().waitFor({ timeout: 15000 });
  assert(await viewer.locator(".katex-mathml mfrac").count() >= 2,
    label + ": no aparecieron las fracciones MathML");
  assert(await viewer.locator(".katex-mathml mtable").count() >= 1,
    label + ": no apareció la matriz MathML");
  await viewer.locator("#node-vis08-curva svg").first().waitFor({ timeout: 20000 });
  assert((await viewer.innerText()).includes("Este párrafo y la siguiente gráfica"),
    label + ": fórmula inválida ocultó el texto siguiente");
  const invalid = viewer.locator(".bwjm-math-invalid");
  await invalid.waitFor({ timeout: 15000 });
  assert((await invalid.innerText()).includes("\\frac{1}{"),
    label + ": se eliminó la barra del TeX inválido");
  assert((await invalid.innerText()).includes("No se pudo interpretar la fórmula"),
    label + ": no se mostró mensaje español");
}

try {
  browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  const context = await browser.newContext({
    acceptDownloads: true,
    viewport: { width: 1280, height: 850 },
    serviceWorkers: "block",
  });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
  const external = [];
  const localFonts = [];
  page.on("request", request => {
    if (request.url().includes("cdn.jsdelivr.net")) external.push(request.url());
    if (request.url().endsWith(".woff2") && request.url().includes("/BWJM-WEB-/"))
      localFonts.push(request.url());
  });
  await page.route("**/cdn.jsdelivr.net/**", route => route.abort());
  await page.route("**/fonts.googleapis.com/**", route => route.abort());
  await page.route("**/fonts.gstatic.com/**", route => route.abort());
  await openStudio(page);
  await page.locator('input[accept=".bwjm,.jm,.md,.txt"]').setInputFiles({
    name: "vis08-caso.bwjm", mimeType: "text/plain", buffer: Buffer.from(source),
  });
  await checkMathDOM(page, "Studio primera carga sin CDN");
  await checkFont(page, "Studio");
  assert.equal(external.length, 0, "El HTML inicial todavía solicita jsDelivr");
  assert(localFonts.length >= 1, "Studio no solicitó fuentes KaTeX al mismo sitio");

  await page.getByRole("tab", { name: "Insertar" }).click();
  await page.getByRole("button", { name: "Fórmula", exact: true }).click();
  const input = page.locator(".bwjm-modal-textarea");
  await input.fill("\\sqrt{x^2+1}");
  await page.locator(".bwjm-modal-preview-box .katex-mathml msqrt").waitFor();
  await input.fill("\\frac{1}{");
  const insert = page.getByRole("button", { name: "Insertar Fórmula", exact: true });
  await insert.waitFor();
  await page.waitForFunction(() => {
    const button = [...document.querySelectorAll("button")]
      .find(el => el.textContent?.includes("Insertar Fórmula"));
    return button?.disabled === true;
  });
  assert.equal(await input.inputValue(), "\\frac{1}{", "El diálogo perdió el TeX inválido");
  assert((await page.locator(".bwjm-modal-preview-box").innerText())
    .includes("No se pudo interpretar la fórmula"));
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await mkdir("/tmp/vis08-screens", { recursive: true });
  await page.screenshot({ path: "/tmp/vis08-screens/studio-offline-cdn-1280.png", fullPage: true });

  await page.getByRole("tab", { name: "Archivo" }).click();
  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 15000 }),
    page.getByRole("button", { name: "Exportar HTML", exact: true }).click(),
  ]);
  const html = await readFile(await download.path(), "utf8");
  const target = "/tmp/vis08-screens/vis08-standalone.html";
  await writeFile(target, html, "utf8");
  const style = html.match(/<style id="bwjm-katex-offline">([\s\S]*?)<\/style>/)?.[1];
  assert(style, "HTML exportado no incluye el CSS KaTeX");
  assert(style.includes("data:font/woff2;base64,"), "Las fuentes no se embebieron");
  assert(style.includes("KaTeX_Main"), "Falta KaTeX_Main");
  assert(!style.includes("/BWJM-WEB-/assets/"), "HTML exportado conserva rutas de Pages");
  assert(!style.includes("cdn.jsdelivr.net"), "HTML exportado conserva CDN");
  const urls = [...style.matchAll(/url\(([^)]+)\)/g)].map(match => match[1].replace(/^["']|["']$/g, ""));
  assert(urls.length >= 15, "No se encontraron suficientes fuentes WOFF2");
  assert(urls.every(value => value.startsWith("data:font/woff2;base64,")),
    "Alguna fuente sigue dependiendo de URL externa");
  assert(html.includes("<msqrt>") && html.includes("<mfrac>") && html.includes("<mtable "),
    "El archivo descargado no preserva el MathML y las estructuras");
  await context.close();

  // A different browser session reads only the HTML file (no server, no network).
  server.kill("SIGTERM");
  await new Promise(resolve => setTimeout(resolve, 800));
  const standalone = await browser.newContext({ viewport: { width: 1280, height: 850 }, offline: true });
  const local = await standalone.newPage();
  const remoteRequests = [];
  local.on("request", request => {
    if (/^https?:/.test(request.url())) remoteRequests.push(request.url());
  });
  await local.goto(pathToFileURL(target).href, { waitUntil: "load" });
  await local.locator(".katex-mathml msqrt").first().waitFor();
  assert(await local.locator(".katex-mathml mfrac").count() >= 2);
  assert(await local.locator(".katex-mathml mtable").count() >= 1);
  assert((await local.locator(".bwjm-sheet").innerText()).includes("Este párrafo y la siguiente gráfica"));
  await checkFont(local, "HTML file:// sin red");
  assert.equal(remoteRequests.length, 0, "El HTML descargado solicitó archivos externos");
  await local.screenshot({ path: "/tmp/vis08-screens/html-sin-red-1280.png", fullPage: true });
  await standalone.close();
  console.log("VIS-08: Studio con jsDelivr bloqueado y HTML file:// sin red, MathML y KaTeX_Main: OK");
} finally {
  if (browser) await browser.close();
  server.kill("SIGTERM");
}
