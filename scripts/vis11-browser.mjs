import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { mkdir, readFile } from "node:fs/promises";

const require = createRequire("/tmp/bwjm-browser/runner.cjs");
const { chromium } = require("playwright");
const source = await readFile("examples/lote-01-animacion.bwjm", "utf8");
const fence = String.fromCharCode(96).repeat(3);
const url = "http://127.0.0.1:3000/BWJM-WEB-/";
const server = spawn("pnpm", ["--dir", "apps/playground", "dev", "--host", "127.0.0.1", "--strictPort"], {
  env: { ...process.env, BWJM_BASE_PATH: "/BWJM-WEB-/" }, stdio: "inherit",
});
let browser;

async function visit(page) {
  for (let i = 0; i < 45; i++) {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 4500 });
      await page.getByRole("tab", { name: "Vista" }).waitFor({ timeout: 5000 });
      return;
    } catch {
      await new Promise(resolve => setTimeout(resolve, 850));
    }
  }
  throw new Error("Studio no inició");
}
async function openFile(page, filename, content) {
  await page.locator('input[accept=".bwjm,.jm,.md,.txt"]').setInputFiles({
    name: filename, mimeType: "text/plain", buffer: Buffer.from(content),
  });
  await page.waitForFunction(sample =>
    document.querySelector(".bwjm-code-textarea")?.value.includes(sample),
    content.slice(0, 26), { timeout: 15000 });
}
const card = (page, type) => page.locator(".bwjm-node-card").filter({
  has: page.locator(".bwjm-node-tag").filter({ hasText: type.toUpperCase() }),
}).first();
async function getClock(page) {
  const text = await page.locator(".bwjm-inline-playback-value").first().textContent();
  return Number(text.split("=").at(-1).trim());
}
async function capture(page) {
  return page.evaluate(() => {
    const find = type => [...document.querySelectorAll(".bwjm-node-card")].find(item =>
      item.querySelector(".bwjm-node-tag")?.textContent?.includes(type));
    const curve = find("CURVE3D");
    const param = find("PARAMETRIC2D");
    if (!curve || !param) throw new Error("Faltan tarjetas científicas");
    window.__vis11 = {
      curve, param,
      plot: curve.querySelector(".js-plotly-plot"),
      svg: param.querySelector(".bwjm-svg-plot"),
      key: curve.dataset.mountKey,
    };
    return !!window.__vis11.plot && !!window.__vis11.svg;
  });
}
async function refs(page, curveExpected = true) {
  const status = await page.evaluate(() => {
    const find = type => [...document.querySelectorAll(".bwjm-node-card")].find(item =>
      item.querySelector(".bwjm-node-tag")?.textContent?.includes(type));
    const old = window.__vis11;
    const curve = find("CURVE3D"), param = find("PARAMETRIC2D");
    return {
      curveConnected: old.curve.isConnected,
      curveSame: old.curve === curve,
      paramSame: old.param === param,
      plotSame: old.plot === curve?.querySelector(".js-plotly-plot"),
      svgSame: old.svg === param?.querySelector(".bwjm-svg-plot"),
      playbackCount: document.querySelectorAll(".bwjm-inline-playback").length,
    };
  });
  assert(status.paramSame && status.svgSame, "Una edición desmontó la gráfica paramétrica");
  if (curveExpected) {
    assert(status.curveConnected && status.curveSame && status.plotSame,
      "Una edición desmontó la misma curva 3D");
  }
  assert.equal(status.playbackCount, 1);
  return status;
}
async function camera(page) {
  return page.evaluate(() => {
    const c = window.__vis11?.plot?._fullLayout?.scene?.camera?.eye;
    return c ? { x: c.x, y: c.y, z: c.z } : null;
  });
}
async function sameCamera(page, before) {
  const current = await camera(page);
  assert(current);
  for (const axis of ["x", "y", "z"]) {
    assert(Math.abs(current[axis] - before[axis]) < 0.15,
      "El montaje reinició la cámara en " + axis);
  }
}
async function edit(page, content, curveExpected = true) {
  const editor = page.locator(".bwjm-code-textarea");
  await editor.fill(content);
  await page.waitForFunction(text => document.querySelector(".bwjm-code-textarea")?.value === text, content);
  if (curveExpected) await card(page, "curve3d").waitFor({ timeout: 12000 });
  return editor;
}

try {
  await mkdir("/tmp/vis11-screens", { recursive: true });
  browser = await chromium.launch({ headless: true,
    args: ["--no-sandbox", "--enable-webgl", "--use-gl=angle"] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 850 } });
  const page = await ctx.newPage();
  await visit(page);
  await openFile(page, "lote-01-animacion.bwjm", source);
  await page.getByRole("tab", { name: "Vista" }).click();
  await page.getByRole("button", { name: "Dividido" }).click();
  await card(page, "curve3d").locator(".js-plotly-plot").waitFor({ timeout: 50000 });
  assert(await capture(page), "Falta un montaje de prueba");

  const canvas = card(page, "curve3d").locator(".gl-container canvas").first();
  const box = await canvas.boundingBox();
  assert(box, "La curva carece de WebGL");
  const initialCamera = await camera(page);
  assert(initialCamera, "No se pudo leer la cámara inicial");
  await page.mouse.move(box.x + box.width * 0.54, box.y + box.height * 0.57);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.72, box.y + box.height * 0.44, { steps: 12 });
  await page.mouse.up();
  await page.mouse.wheel(0, -160);
  await page.waitForTimeout(350);
  const rotated = await camera(page);
  assert(rotated && Object.values(rotated).every(Number.isFinite));
  assert(["x", "y", "z"].some(axis =>
    Math.abs(rotated[axis] - initialCamera[axis]) > 0.03),
    "El arrastre no modificó realmente la cámara 3D");

  const transportDebug = await page.evaluate(() => ({
    transports: document.querySelectorAll(".bwjm-inline-playback").length,
    cards: [...document.querySelectorAll(".bwjm-node-tag")].map(x => x.textContent?.trim()),
    diagnostics: [...document.querySelectorAll(".bwjm-diagnostic-box")].map(x => x.textContent?.slice(0, 210)),
  }));
  console.log("VIS11 transport diagnostics:", JSON.stringify(transportDebug));
  assert.equal(transportDebug.transports, 1, "No se montó el transporte de la línea temporal");
  // The compact transport intentionally lives inside Personalizar gráfica.
  // Open its existing details so the accessible play button can be clicked.
  await card(page, "parametric2d").locator(".bwjm-graph-settings > summary").click();
  await page.getByRole("button", { name: "Reproducir animación" }).click();
  await page.waitForTimeout(380);
  const tBefore = await getClock(page);
  const prefix = "Prueba VIS-11: el párrafo cambia sin reiniciar las gráficas.\n\n";
  let editor = await edit(page, prefix + source);
  await refs(page);
  await sameCamera(page, rotated);
  await page.waitForTimeout(320);
  assert((await getClock(page)) > tBefore, "La reproducción volvió a cero o se detuvo");
  assert(await page.getByRole("button", { name: "Pausar animación" }).isVisible());

  await page.getByRole("button", { name: "Pausar animación" }).click();
  const paused = await getClock(page);
  editor = await edit(page, prefix + "Otro párrafo sin modificar las curvas.\n\n" + source);
  await refs(page);
  await sameCamera(page, rotated);
  assert(Math.abs((await getClock(page)) - paused) < 0.01,
    "La edición de prosa reinició el instante pausado");
  await page.screenshot({ path: "/tmp/vis11-screens/dividido-1280-preservado.png", fullPage: true });
  console.log("VIS-11 preserve prose, camera and play/pause: OK");

  // An implicit curve ID can change twice; its checkbox handlers must keep
  // writing the correct current block and preserve the focus of the keyboard.
  const curve = card(page, "curve3d");
  const key = await curve.getAttribute("data-mount-key");
  await curve.locator(".bwjm-graph-settings > summary").click();
  const checkbox = curve.getByRole("checkbox", { name: "Mostrar leyenda" });
  await checkbox.focus();
  await checkbox.press("Space");
  await page.waitForFunction(() =>
    document.querySelector(".bwjm-code-textarea")?.value.includes("showLegend: true"));
  assert(await checkbox.evaluate(input => document.activeElement === input), "El cambio por teclado eliminó el foco");
  await refs(page);
  assert.equal(await card(page, "curve3d").getAttribute("data-mount-key"), key);
  const vectors = curve.getByRole("checkbox", { name: "Vectores velocidad y aceleración" });
  await vectors.check();
  await page.waitForFunction(() =>
    document.querySelector(".bwjm-code-textarea")?.value.includes("showVectors: true"));
  await refs(page);
  await sameCamera(page, rotated);
  let persisted = await editor.inputValue();
  const curveFence = persisted.split(fence + "curve3d")[1]?.split(fence)[0];
  const paramFence = persisted.split(fence + "parametric2d")[1]?.split(fence)[0];
  assert(curveFence?.includes("showLegend: true") && curveFence.includes("showVectors: true"));
  assert(!paramFence?.includes("showLegend: true") && !paramFence?.includes("showVectors: true"));
  console.log("VIS-11 two consecutive implicit-ID edits and focus: OK");

  // A multi-trace curve is needed to test Plotly legend visibility (the base
  // example contains a static single-trace curve).
  await curve.getByRole("checkbox", { name: "Animar partícula" }).check();
  await page.waitForFunction(() => {
    const curve = [...document.querySelectorAll(".bwjm-node-card")]
      .find(card => card.querySelector(".bwjm-node-tag")?.textContent?.includes("CURVE3D"));
    const plot = curve?.querySelector(".js-plotly-plot");
    return (plot?._fullData?.length ?? 0) >= 3;
  });
  const legendEntry = curve.locator(".js-plotly-plot g.legend g.traces").first();
  await legendEntry.waitFor({ timeout: 15000 });
  await legendEntry.click();
  await page.waitForFunction(() => {
    const curve = [...document.querySelectorAll(".bwjm-node-card")]
      .find(card => card.querySelector(".bwjm-node-tag")?.textContent?.includes("CURVE3D"));
    return curve?.querySelector(".js-plotly-plot")?._fullData?.[0]?.visible === "legendonly";
  });
  persisted = "Más prosa tras ocultar una traza.\n\n" + await editor.inputValue();
  editor = await edit(page, persisted);
  await refs(page);
  await sameCamera(page, rotated);
  const traceHidden = await curve.locator(".js-plotly-plot").evaluate(gd =>
    gd._fullData?.[0]?.visible === "legendonly");
  assert(traceHidden, "Editar prosa restableció la visibilidad de una traza de la leyenda");
  await page.screenshot({ path: "/tmp/vis11-screens/leyenda-oculta-1280.png", fullPage: true });
  console.log("VIS-11 legend visibility survives prose edits: OK");

  // Remove and restore only the curve; the original parametric mount survives.
  const withoutCurve = persisted.replace(new RegExp(fence + "curve3d[\\s\\S]*?" + fence), "");
  editor = await edit(page, withoutCurve, false);
  const deleted = await refs(page, false);
  assert(!deleted.curveConnected && !deleted.curveSame, "La curva no se liberó");
  assert.equal(await card(page, "curve3d").count(), 0);
  editor = await edit(page, persisted);
  await card(page, "curve3d").locator(".js-plotly-plot").waitFor({ timeout: 45000 });
  assert.notEqual(await card(page, "curve3d").getAttribute("data-mount-key"), key);
  assert.equal(await page.locator(".bwjm-inline-playback").count(), 1);
  await page.evaluate(() => {
    window.__vis11Events = 0;
    window.addEventListener("bwjm-variable-change", () => { window.__vis11Events++; });
  });
  const seek = page.getByRole("slider", { name: "Instante de la gráfica" });
  await seek.evaluate(input => {
    input.value = "0.42";
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await page.waitForTimeout(75);
  assert.equal(await page.evaluate(() => window.__vis11Events), 1,
    "Se duplicaron los eventos del transporte tras reinsertar una curva");

  // Two document tabs using the same explicit ID must have separate resources.
  const second = [
    "# Segundo documento", "",
    fence + "timeline", "name: t", "domain: [0, 6.28]", "default: 0", fence, "",
    fence + "parametric2d", "id: particula-circular",
    "x: sin(t)", "y: cos(t)", "tDomain: [0, 6.28]", fence,
  ].join("\n");
  const oldParam = await card(page, "parametric2d").elementHandle();
  await openFile(page, "segundo.bwjm", second);
  await card(page, "parametric2d").waitFor();
  assert(!(await oldParam.evaluate(node => node.isConnected)),
    "No se liberó el montaje del documento anterior");
  assert.equal(await page.locator(".bwjm-inline-playback").count(), 1);
  assert.equal(await getClock(page), 0, "El tiempo del documento anterior se filtró");
  await page.screenshot({ path: "/tmp/vis11-screens/segundo-documento-1280.png", fullPage: true });
  console.log("VIS-11 deletion, reinsertion, single clock event, tab isolation: OK");
  await ctx.close();
} finally {
  if (browser) await browser.close();
  server.kill("SIGTERM");
}
