/**
 * VIS-10 real-browser acceptance. Uses the existing isolated Chromium runner,
 * a real Plotly canvas and two responsive Studio layouts.
 */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";

const require = createRequire("/tmp/bwjm-browser/runner.cjs");
const { chromium } = require("playwright");
const fence = String.fromCharCode(96).repeat(3);
const source = [
  fence + "crossproduct", "id: vis10-escena",
  "u: [2, 0, 0]", "v: [0, 3, 0]", "w: [0, 0, 4]",
  "showPlane: true", "showNormal: true", "showArea: true",
  "showTriangle: true", "showVolume: true", "showCollapse: true",
  "collapseFactor: 0", "collapseTarget: coplanar", fence,
].join("\n");
const address = "http://127.0.0.1:3000/BWJM-WEB-/";
const server = spawn("pnpm", [
  "--dir", "apps/playground", "dev", "--host", "127.0.0.1", "--strictPort",
], { env: { ...process.env, BWJM_BASE_PATH: "/BWJM-WEB-/" }, stdio: "inherit" });
let browser;

async function openStudio(page) {
  for (let attempt = 0; attempt < 45; attempt++) {
    try {
      await page.goto(address, { waitUntil: "domcontentloaded", timeout: 4500 });
      await page.getByRole("tab", { name: "Vista" }).waitFor({ timeout: 4000 });
      return;
    } catch {
      await new Promise(resolve => setTimeout(resolve, 850));
    }
  }
  throw new Error("El servidor BWJM Studio no inició.");
}

async function summaryValues(page) {
  return page.locator("#node-vis10-escena .bwjm-cross-summary").evaluate(section =>
    Object.fromEntries([...section.querySelectorAll(".bwjm-cross-summary-metric")].map(item => [
      item.querySelector("dt")?.textContent?.trim(),
      item.querySelector("dd")?.firstChild?.textContent?.trim(),
    ])),
  );
}
async function waitForMetric(page, key, expected) {
  await page.waitForFunction(({ key, expected }) => {
    const section = document.querySelector("#node-vis10-escena .bwjm-cross-summary");
    const metric = [...(section?.querySelectorAll(".bwjm-cross-summary-metric") ?? [])]
      .find(row => row.querySelector("dt")?.textContent?.trim() === key);
    return metric?.querySelector("dd")?.firstChild?.textContent?.trim() === expected;
  }, { key, expected }, { timeout: 15000 });
}

async function inspectPlot(page) {
  return page.locator("#mount-vis10-escena .js-plotly-plot").evaluate(gd => {
    const traces = gd._fullData ?? [];
    const faces = traces.filter(trace => trace.legendgroup === "parallelepiped");
    const separate = traces.filter(trace => ["u", "v", "Plano generado", "Triángulo sustentado"].includes(trace.name));
    const camera = gd._fullLayout?.scene?.camera?.eye;
    return {
      faces: faces.map(trace => ({ name: trace.name, showlegend: trace.showlegend,
        visible: trace.visible, hovertemplate: trace.hovertemplate })),
      separate: separate.map(trace => ({ name: trace.name, visible: trace.visible,
        legendgroup: trace.legendgroup })),
      camera,
      legendGroupClick: gd._fullLayout?.legend?.groupclick,
    };
  });
}

try {
  await mkdir("/tmp/vis10-screens", { recursive: true });
  browser = await chromium.launch({
    headless: true, args: ["--no-sandbox", "--enable-webgl", "--use-gl=angle"],
  });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 850 } });
  const page = await ctx.newPage();
  await openStudio(page);
  await page.locator('input[accept=".bwjm,.jm,.md,.txt"]').setInputFiles({
    name: "vis10-escena.bwjm", mimeType: "text/plain", buffer: Buffer.from(source),
  });
  await page.locator("#node-vis10-escena .bwjm-cross-summary").waitFor({ timeout: 20000 });
  await page.locator("#mount-vis10-escena .js-plotly-plot").waitFor({ timeout: 45000 });
  await waitForMetric(page, "Área del paralelogramo", "6");
  let values = await summaryValues(page);
  assert.equal(values["Área del triángulo"], "3");
  assert.equal(values["Volumen firmado"], "24");
  assert.equal(values["Volumen geométrico"], "24");
  assert.equal(values["Ángulo entre u y v"], "90°");
  assert.equal(values.Colapso, "0%");

  const viewer = page.locator("#bwjm-reader-panel");
  const summary = page.locator("#node-vis10-escena .bwjm-cross-summary");
  const plot = page.locator("#mount-vis10-escena .js-plotly-plot");
  const seen = await inspectPlot(page);
  assert.equal(seen.faces.length, 6, "El volumen debe conservar seis mallas");
  assert.equal(seen.faces.filter(face => face.showlegend === true).length, 1,
    "Solo una cara puede crear una entrada visible de leyenda");
  assert(seen.faces.every(face => face.name === "Paralelepípedo"));
  assert.equal(seen.legendGroupClick, "togglegroup");
  assert.equal(seen.separate.length, 4);
  assert(seen.separate.every(layer => layer.legendgroup !== "parallelepiped"));
  assert.equal(await viewer.locator(".legendtext").filter({ hasText: "Paralelepípedo" }).count(), 1);
  const plotText = await plot.locator(".legendtext").allTextContents();
  assert(!plotText.some(line => /área|volumen|colapso.*%/i.test(line)), "La leyenda contiene cálculos largos");

  // Lector 390px: numeric HTML stays in the page and does not require hover.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Lector", exact: true }).last().click();
  const mobile = await page.evaluate(() => {
    const sheet = document.querySelector(".bwjm-sheet");
    const result = document.querySelector("#node-vis10-escena .bwjm-cross-summary");
    const mount = document.getElementById("mount-vis10-escena");
    if (!sheet || !result || !mount) throw new Error("Falta la hoja o su resumen");
    return {
      width: innerWidth,
      sheet: sheet.getBoundingClientRect().width,
      summary: result.getBoundingClientRect().width,
      mount: mount.getBoundingClientRect().width,
      resultText: result.textContent,
    };
  });
  assert(mobile.sheet <= mobile.width + 1, "La hoja supera el viewport móvil");
  assert(mobile.summary <= mobile.sheet + 1, "El resumen desborda la hoja");
  assert(mobile.mount <= mobile.sheet + 1, "El gráfico desborda la hoja");
  assert(mobile.resultText.includes("Volumen geométrico"));
  await summary.scrollIntoViewIfNeeded();
  await page.screenshot({ path: "/tmp/vis10-screens/lector-390.png", fullPage: true });

  await page.setViewportSize({ width: 1280, height: 850 });
  await page.getByRole("tab", { name: "Vista" }).click();
  await page.getByRole("button", { name: "Dividido" }).click();
  assert(await page.locator(".bwjm-code-textarea").isVisible(), "Falta el código en Dividido");
  assert(await summary.isVisible(), "Falta el resumen en Dividido");
  await summary.scrollIntoViewIfNeeded();
  await page.screenshot({ path: "/tmp/vis10-screens/dividido-1280.png", fullPage: true });

  // Real legend click should toggle all six faces only; u/v, plane and
  // triangle remain available as separate traces.
  const legend = plot.locator("g.legend g.traces")
    .filter({ has: page.locator("text.legendtext").filter({ hasText: "Paralelepípedo" }) });
  await legend.waitFor({ timeout: 15000 });
  await legend.click();
  await page.waitForFunction(() => {
    const gd = document.querySelector("#mount-vis10-escena .js-plotly-plot");
    const faces = (gd?._fullData ?? []).filter(trace => trace.legendgroup === "parallelepiped");
    return faces.length === 6 && faces.every(trace => trace.visible === "legendonly");
  }, null, { timeout: 15000 });
  let toggled = await inspectPlot(page);
  assert(toggled.separate.every(trace => trace.visible !== "legendonly"),
    "La leyenda ocultó vectores, plano o triángulo");
  await legend.click();
  await page.waitForFunction(() => {
    const gd = document.querySelector("#mount-vis10-escena .js-plotly-plot");
    const faces = (gd?._fullData ?? []).filter(trace => trace.legendgroup === "parallelepiped");
    return faces.length === 6 && faces.every(trace => trace.visible === true);
  }, null, { timeout: 15000 });

  // Rotate the actual 3D canvas and verify the camera remains interactive.
  const beforeCamera = (await inspectPlot(page)).camera;
  const canvas = plot.locator(".gl-container canvas").first();
  const box = await canvas.boundingBox();
  assert(box, "El canvas WebGL no está disponible para rotar");
  await page.mouse.move(box.x + box.width * 0.55, box.y + box.height * 0.6);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.73, box.y + box.height * 0.47, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(500);
  const rotated = (await inspectPlot(page)).camera;
  assert(rotated && beforeCamera && JSON.stringify(rotated) !== JSON.stringify(beforeCamera),
    "La cámara no cambió tras arrastrar la escena");

  // Editing vectors updates the preview summary immediately and persists on blur.
  const settings = page.locator("#node-vis10-escena .bwjm-graph-settings");
  await settings.locator("summary").click();
  const ux = settings.locator('input[aria-label="u x"]');
  await ux.fill("4");
  await waitForMetric(page, "Área del paralelogramo", "12");
  await ux.press("Tab");
  await waitForMetric(page, "Área del paralelogramo", "12");
  // Restore the original area for the signed-volume acceptance case.
  const uxRestored = settings.locator('input[aria-label="u x"]');
  await uxRestored.fill("2");
  await uxRestored.press("Tab");
  await waitForMetric(page, "Área del paralelogramo", "6");

  const wz = settings.locator('input[aria-label="w z"]');
  await wz.fill("-4");
  await wz.press("Tab");
  await waitForMetric(page, "Volumen firmado", "-24");
  values = await summaryValues(page);
  assert.equal(values["Volumen geométrico"], "24");

  const slider = settings.getByRole("slider", { name: "Factor de colapso del paralelepípedo" });
  await slider.evaluate(input => {
    input.value = "1";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await waitForMetric(page, "Colapso", "100%");
  await waitForMetric(page, "Volumen firmado", "0");
  values = await summaryValues(page);
  assert.equal(values["Volumen geométrico"], "0");
  assert((await summary.innerText()).includes("colapsado"),
    "El aviso de colapso completo no aparece junto al volumen");
  await summary.scrollIntoViewIfNeeded();
  await page.screenshot({ path: "/tmp/vis10-screens/colapso-1280.png", fullPage: true });

  console.log("VIS-10 Lector 390px:", mobile);
  console.log("VIS-10 Dividido 1280px, 6 caras, una leyenda, giro y colapso: OK");
  await ctx.close();
} finally {
  if (browser) await browser.close();
  server.kill("SIGTERM");
}
