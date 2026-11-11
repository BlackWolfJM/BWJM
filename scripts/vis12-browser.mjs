import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { mkdir, readFile } from "node:fs/promises";

const require = createRequire("/tmp/bwjm-browser/runner.cjs");
const { chromium } = require("playwright");
const sample = await readFile("examples/lote-01-animacion.bwjm", "utf8");
const fence = String.fromCharCode(96).repeat(3);
const url = "http://127.0.0.1:3000/BWJM-WEB-/";
const server = spawn("pnpm", ["--dir", "apps/playground", "dev",
  "--host", "127.0.0.1", "--strictPort"], {
  env: { ...process.env, BWJM_BASE_PATH: "/BWJM-WEB-/" }, stdio: "inherit",
});
let browser;

async function visit(page) {
  for (let i = 0; i < 45; i++) {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 4500 });
      await page.getByRole("tab", { name: "Vista" }).waitFor({ timeout: 4500 });
      return;
    } catch {
      await new Promise(resolve => setTimeout(resolve, 850));
    }
  }
  throw new Error("Studio no inició");
}
async function openFile(page, name, source) {
  const before = await page.locator(".bwjm-document-tab [role=tab]").count();
  await page.locator('input[accept=".bwjm,.jm,.md,.txt"]').setInputFiles({
    name, mimeType: "text/plain", buffer: Buffer.from(source),
  });
  await page.waitForFunction(expected =>
    document.querySelectorAll(".bwjm-document-tab [role=tab]").length === expected,
    before + 1);
  return page.locator(".bwjm-document-tab [role=tab]").last().getAttribute("id");
}
const graph = (page, type) => page.locator(".bwjm-node-card").filter({
  has: page.locator(".bwjm-node-tag").filter({ hasText: type.toUpperCase() }),
}).first();
const panel = (page, type) => graph(page, type).locator("details.bwjm-graph-settings");
async function opened(page, type) {
  await panel(page, type).waitFor({ timeout: 30000 });
  return panel(page, type).evaluate(element => element.open);
}
async function setOpen(page, type, desired) {
  if ((await opened(page, type)) !== desired) {
    await panel(page, type).locator("summary").first().click();
  }
  await page.waitForFunction(({ type, desired }) => {
    const card = [...document.querySelectorAll(".bwjm-node-card")].find(item =>
      item.querySelector(".bwjm-node-tag")?.textContent?.includes(type.toUpperCase()));
    return card?.querySelector("details.bwjm-graph-settings")?.open === desired;
  }, { type, desired });
}
async function verify(page, parametric, curve, context) {
  assert.equal(await opened(page, "parametric2d"), parametric,
    context + ": estado parametric2d incorrecto");
  assert.equal(await opened(page, "curve3d"), curve, context + ": estado curve3d incorrecto");
}
async function choose(page, tabId) {
  await page.locator('[id="' + tabId + '"]').click();
  await page.waitForFunction(id =>
    document.getElementById(id)?.getAttribute("aria-selected") === "true", tabId);
}
async function edit(page, source) {
  await page.locator(".bwjm-code-textarea").fill(source);
  await page.waitForFunction(text =>
    document.querySelector(".bwjm-code-textarea")?.value === text, source);
}
const text = page => page.locator(".bwjm-code-textarea").inputValue();
const segment = (source, type) => source.split(fence + type)[1]?.split(fence)[0] ?? "";

try {
  await mkdir("/tmp/vis12-screens", { recursive: true });
  browser = await chromium.launch({ headless: true,
    args: ["--no-sandbox", "--enable-webgl", "--use-gl=angle"] });
  const context = await browser.newContext({ viewport: { width: 1280, height: 850 } });
  const page = await context.newPage();
  page.on("pageerror", err => console.log("VIS12 ERROR:", err.message));
  await visit(page);
  await page.getByRole("tab", { name: "Vista" }).click();
  await page.getByRole("button", { name: "Dividido" }).click();
  const a = await openFile(page, "lote-01-animacion.bwjm", sample);
  const b = await openFile(page, "lote-01-animacion.bwjm", sample);
  assert(a && b && a !== b);
  await choose(page, a);
  await verify(page, false, false, "A recién abierta");
  const original = await text(page);
  const originalDirty = await page.locator('[id="' + a + '"] .bwjm-document-unsaved').count();
  await setOpen(page, "curve3d", true);
  assert.equal(await text(page), original, "Abrir panel cambió el contenido");
  assert.equal(await page.locator('[id="' + a + '"] .bwjm-document-unsaved').count(),
    originalDirty, "Abrir panel marcó cambios");
  await choose(page, b);
  await verify(page, false, false, "B no hereda estado");
  await setOpen(page, "parametric2d", true);
  await verify(page, true, false, "B solo paramétrica");
  assert.equal(await text(page), sample, "Abrir en B cambió Markdown");
  await choose(page, a);
  await verify(page, false, true, "A restaurada");
  await choose(page, b);
  await verify(page, true, false, "B restaurada");
  await choose(page, a);
  await page.screenshot({ path: "/tmp/vis12-screens/tabs-1280.png", fullPage: true });
  console.log("VIS-12 two identical tabs isolated: OK");

  let markdown = "Prólogo VIS-12 antes de la curva.\n\n" + original;
  await edit(page, markdown);
  await verify(page, false, true, "insertar prosa");
  await page.evaluate(() => {
    const card = [...document.querySelectorAll(".bwjm-node-card")].find(item =>
      item.querySelector(".bwjm-node-tag")?.textContent?.includes("CURVE3D"));
    window.__oldVis12Details = card.querySelector("details.bwjm-graph-settings");
  });
  await panel(page, "curve3d").getByRole("checkbox", { name: "Mostrar leyenda" }).check();
  await page.waitForFunction(() => {
    const value = document.querySelector(".bwjm-code-textarea")?.value ?? "";
    const fence = String.fromCharCode(96).repeat(3);
    return value.split(fence + "curve3d")[1]?.includes("showLegend: true");
  });
  markdown = await text(page);
  assert(segment(markdown, "curve3d").includes("showLegend: true"));
  assert(!segment(markdown, "parametric2d").includes("showLegend"));
  await verify(page, false, true, "primer cambio de curva implícita");
  await page.evaluate(() => {
    window.__oldVis12Details.open = false;
    window.__oldVis12Details.dispatchEvent(new Event("toggle"));
  });
  await verify(page, false, true, "evento obsoleto rechazado");
  await panel(page, "curve3d").getByRole("checkbox", { name: "Mostrar leyenda" }).uncheck();
  await page.waitForFunction(() => {
    const value = document.querySelector(".bwjm-code-textarea")?.value ?? "";
    const fence = String.fromCharCode(96).repeat(3);
    return value.split(fence + "curve3d")[1]?.includes("showLegend: false");
  });
  markdown = await text(page);
  await verify(page, false, true, "segundo cambio de curva implícita");
  assert(segment(markdown, "curve3d").includes("showLegend: false"));
  assert(!segment(markdown, "parametric2d").includes("showLegend"));
  console.log("VIS-12 implicit option edits and stale toggle: OK");

  const summary = panel(page, "curve3d").locator("summary");
  await summary.focus();
  await summary.press("Enter");
  await page.waitForFunction(() => {
    const card = [...document.querySelectorAll(".bwjm-node-card")].find(item =>
      item.querySelector(".bwjm-node-tag")?.textContent?.includes("CURVE3D"));
    return card?.querySelector("details.bwjm-graph-settings")?.open === false;
  });
  assert.equal(await text(page), markdown, "Teclado cerró panel y cambió el documento");
  markdown = markdown.replace("Prólogo VIS-12", "Prólogo actualizado VIS-12");
  await edit(page, markdown);
  await verify(page, false, false, "cerrado tras prosa");
  await setOpen(page, "curve3d", true);

  const extra = [
    fence + "plot2d", "id: vis12-extra",
    "equation: x^2", "domain: [-2, 2]", fence,
  ].join("\n");
  markdown = (await text(page)).replace(fence + "curve3d",
    extra + "\n\n" + fence + "curve3d");
  await edit(page, markdown);
  await verify(page, false, true, "ordinal cambiado");
  assert.equal(await opened(page, "plot2d"), false, "Bloque nuevo no inicia cerrado");
  await page.screenshot({ path: "/tmp/vis12-screens/ordinal-1280.png", fullPage: true });

  const otherCurve = [
    fence + "curve3d", "x: t", "y: t^2", "z: t/2",
    "tDomain: [0, 6.28]", fence,
  ].join("\n");
  markdown = markdown.replace(new RegExp(fence + "curve3d[\\s\\S]*?" + fence), otherCurve);
  await edit(page, markdown);
  await verify(page, false, false, "reemplazo de curva en mismo lugar");
  await setOpen(page, "curve3d", true);
  const current = await text(page);
  await page.locator(".bwjm-document-tab").filter({
    has: page.locator('[id="' + a + '"]'),
  }).locator(".bwjm-tab-rename").click();
  const rename = page.getByRole("textbox", { name: /Nuevo nombre del documento/ });
  await rename.fill("renombrado-vis12.bwjm");
  await rename.press("Enter");
  await page.locator('[id="' + a + '"]').waitFor();
  await verify(page, false, true, "renombrar conserva estado");
  assert.equal(await text(page), current, "Renombrar modificó Markdown");

  page.once("dialog", dialog => dialog.accept());
  await page.locator(".bwjm-document-tab").filter({
    has: page.locator('[id="' + a + '"]'),
  }).locator(".bwjm-tab-close").click();
  await page.waitForFunction(id => !document.getElementById(id), a);
  const c = await openFile(page, "lote-01-animacion.bwjm", sample);
  assert(c !== a, "La pestaña reabierta no tiene nuevo ID");
  await verify(page, false, false, "reabrir archivo inicia cerrado");
  await choose(page, b);
  await verify(page, true, false, "B conserva su propio estado tras cerrar A");
  await page.screenshot({ path: "/tmp/vis12-screens/reabrir-1280.png", fullPage: true });
  console.log("VIS-12 keyboard, ordinal, replace, rename, close/reopen: OK");
  await context.close();
} finally {
  if (browser) await browser.close();
  server.kill("SIGTERM");
}
