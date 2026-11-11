/**
 * VIS-06: real-browser portability smoke tests. Run from the repository root.
 * CI installs Playwright into /tmp so pnpm-lock.yaml and Pages config stay intact.
 */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { readFile, mkdir } from "node:fs/promises";
import path from "node:path";

const require = createRequire("/tmp/bwjm-browser/runner.cjs");
const { chromium } = require("playwright");
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+IpocAAAAASUVORK5CYII=", "base64"
);
const fence = String.fromCharCode(96).repeat(3);
const markdown = [
  "# Portable VIS-06", "",
  "Texto con **negrita** y $x^2$ antes de la foto.", "",
  "$$x^2+1$$", "",
  "| Variable larga para scroll horizontal | Columna muy larga para desplazamiento | Valor |",
  "| --- | --- | ---: |",
  "| x | Una descripción larga que hace más ancha la tabla en pantalla pequeña | 2 |", "",
  "- Primer elemento", "  - Anidado", "",
  "---", "",
  fence + "plot2d", "id: vis06-portable", "equation: x^2", fence, "",
  "Texto posterior a la gráfica.", "",
  fence + "text", "![Esto es código](./nunca.png)", "---", fence, "",
].join("\n");
const url = "http://127.0.0.1:3000/BWJM-WEB-/";
const server = spawn("pnpm", ["--dir", "apps/playground", "dev", "--host", "127.0.0.1", "--strictPort"], {
  env: { ...process.env, BWJM_BASE_PATH: "/BWJM-WEB-/" },
  stdio: "inherit",
});
let browser;

async function visit(page) {
  for (let i = 0; i < 45; i++) {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 4000 });
      await page.getByRole("tab", { name: "Insertar" }).waitFor({ timeout: 5000 });
      return;
    } catch {
      await new Promise(resolve => setTimeout(resolve, 900));
    }
  }
  throw new Error("El servidor de Studio no quedó disponible.");
}

async function openText(page, filename, contents) {
  await page.locator('input[accept=".bwjm,.jm,.md,.txt"]').setInputFiles({
    name: filename, mimeType: "text/plain", buffer: Buffer.from(contents),
  });
  await page.waitForFunction(value =>
    document.querySelector(".bwjm-code-textarea")?.value.includes(value),
    contents.slice(0, 18)
  );
}

async function picker(page) {
  await page.getByRole("tab", { name: "Insertar" }).click();
  const [fileChooser] = await Promise.all([
    page.waitForEvent("filechooser"),
    page.getByRole("button", { name: "Imagen", exact: true }).click(),
  ]);
  return fileChooser;
}

async function insertPng(page, filename = "foto-vis06.png") {
  const choice = await picker(page);
  await choice.setFiles({ name: filename, mimeType: "image/png", buffer: png });
  await page.waitForFunction(name => {
    const input = document.querySelector(".bwjm-code-textarea");
    return input?.value.includes("![" + name + "](data:image/png;base64,");
  }, filename.replace(/\.png$/, ""));
  const img = page.locator('#bwjm-reader-panel img[alt="' + filename.replace(/\.png$/, "") + '"]');
  await img.waitFor();
  await page.waitForFunction(alt => {
    const element = [...document.images].find(img => img.alt === alt);
    return element?.complete && element.naturalWidth > 0;
  }, filename.replace(/\.png$/, ""));
  assert((await img.getAttribute("src")).startsWith("data:image/png;base64,"));
}

async function downloadSource(page) {
  await page.getByRole("tab", { name: "Archivo" }).click();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Guardar" }).click(),
  ]);
  return readFile(await download.path());
}

async function checkResponsive(page, extension) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Lector", exact: true }).last().click();
  await page.waitForTimeout(350);
  const mobile = await page.evaluate(() => {
    const sheet = document.querySelector(".bwjm-sheet");
    const img = document.querySelector('#bwjm-reader-panel img[alt="foto-vis06"]');
    const table = document.querySelector(".bwjm-markdown-table-scroll");
    if (!sheet || !img || !table) throw new Error("Falta un elemento Markdown en el lector.");
    return {
      sheet: sheet.getBoundingClientRect().width,
      image: img.getBoundingClientRect().width,
      table: table.getBoundingClientRect().width,
      tableScroll: table.scrollWidth,
      tableClient: table.clientWidth,
      viewport: window.innerWidth,
      hasGraph: !!document.querySelector("#node-vis06-portable svg"),
    };
  });
  assert(mobile.sheet <= mobile.viewport + 1, "La hoja desborda los 390px");
  assert(mobile.image <= mobile.sheet, "La imagen desborda la hoja");
  assert(mobile.tableScroll > mobile.tableClient, "La tabla ancha no tiene desplazamiento interno");
  assert(mobile.hasGraph, "Falta el SVG de la gráfica");
  await page.screenshot({ path: "/tmp/vis06-screens/" + extension + "-390.png", fullPage: true });

  await page.setViewportSize({ width: 1280, height: 850 });
  await page.getByRole("tab", { name: "Vista" }).click();
  await page.getByRole("button", { name: "Dividido" }).click();
  assert(await page.locator(".bwjm-code-textarea").isVisible(), "Falta el editor en Dividido");
  assert(await page.locator('#bwjm-reader-panel img[alt="foto-vis06"]').isVisible(), "Falta imagen en Dividido");
  await page.screenshot({ path: "/tmp/vis06-screens/" + extension + "-1280.png", fullPage: true });
  console.log("VIS-06 responsive", extension, mobile);
}

async function portableRun(extension) {
  const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 1280, height: 850 } });
  const page = await context.newPage();
  await visit(page);
  await openText(page, "portatil." + extension, markdown);
  await insertPng(page);
  const exported = await downloadSource(page);
  assert(exported.includes(Buffer.from("data:image/png;base64,")), "El archivo guardado no contiene la foto");
  await context.close(); // Reopen in a new browser session with no original image file.

  const restored = await browser.newContext({ acceptDownloads: true, viewport: { width: 1280, height: 850 } });
  const reopened = await restored.newPage();
  const networkImages = [];
  reopened.on("request", request => {
    if (request.resourceType() === "image") networkImages.push(request.url());
  });
  await visit(reopened);
  await openText(reopened, "copia." + extension, exported.toString("utf8"));
  const image = reopened.locator('#bwjm-reader-panel img[alt="foto-vis06"]');
  await image.waitFor();
  await reopened.waitForFunction(() => {
    const img = [...document.images].find(image => image.alt === "foto-vis06");
    return img?.complete && img.naturalWidth > 0;
  });
  assert.equal(networkImages.length, 0, "La foto requirió recuperar recursos externos");
  assert(await reopened.locator("#node-vis06-portable").count(), "Falta la gráfica al reabrir");
  assert(await reopened.locator(".bwjm-prose-block .bwjm-inline-math").count(), "Falta fórmula en línea");
  assert(await reopened.locator(".bwjm-prose-block pre code").count(), "Falta el código literal");
  await checkResponsive(reopened, extension);
  await restored.close();
  console.log("VIS-06 portabilidad verificada para ." + extension);
}

async function pickerErrors() {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 850 } });
  const page = await ctx.newPage();
  await visit(page);
  await openText(page, "errores.bwjm", "# Sin imagen");
  const before = await page.locator(".bwjm-code-textarea").inputValue();
  let choice = await picker(page);
  await choice.setFiles([]);
  assert.equal(await page.locator(".bwjm-code-textarea").inputValue(), before, "Cancelar modificó el documento");

  choice = await picker(page);
  await choice.setFiles({ name: "mal.png", mimeType: "image/png", buffer: Buffer.from("<svg/>") });
  await page.getByRole("status").filter({ hasText: /formato real|dañado|corrupta/ }).waitFor();
  assert.equal(await page.locator(".bwjm-code-textarea").inputValue(), before);

  choice = await picker(page);
  await choice.setFiles({ name: "grande.png", mimeType: "image/png", buffer: Buffer.alloc(3 * 1024 * 1024 + 1) });
  await page.getByRole("status").filter({ hasText: "3 MiB" }).waitFor();
  assert.equal(await page.locator(".bwjm-code-textarea").inputValue(), before);

  // Capture the first tab before opening a picker, then switch tabs while it is open.
  const firstTab = page.getByRole("tab", { name: "errores.bwjm" });
  choice = await picker(page);
  await page.getByRole("button", { name: "Nuevo documento" }).click();
  await choice.setFiles({ name: "otro.png", mimeType: "image/png", buffer: png });
  await page.waitForTimeout(900);
  assert(!(await page.locator(".bwjm-code-textarea").inputValue()).includes("data:image/"),
    "Imagen apareció en la pestaña equivocada");
  await firstTab.click();
  assert((await page.locator(".bwjm-code-textarea").inputValue()).includes("data:image/"),
    "Imagen no volvió a su pestaña original");
  await ctx.close();
}

try {
  await mkdir("/tmp/vis06-screens", { recursive: true });
  browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  await portableRun("bwjm");
  await portableRun("jm");
  await pickerErrors();
  console.log("VIS-06 navegador: OK (390px y 1280px, cancelación, corrupto, tamaño, pestaña, guardado/reapertura).");
} finally {
  if (browser) await browser.close();
  server.kill("SIGTERM");
}
