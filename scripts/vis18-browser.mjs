/**
 * VIS-18: n/a update the same Riemann scene and result panel.
 * Run as in scripts/vis06-browser.mjs (isolated Playwright under /tmp).
 */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";

const require = createRequire("/tmp/bwjm-browser/runner.cjs");
const { chromium } = require("playwright");
const url = "http://127.0.0.1:3000/BWJM-WEB-/";
const server = spawn("pnpm", ["--dir", "apps/playground", "dev", "--host", "127.0.0.1", "--strictPort"], {
  env: { ...process.env, BWJM_BASE_PATH: "/BWJM-WEB-/" }, stdio: "inherit",
});
const sceneSelector = "#node-riemann-interactive";
let browser;

async function visit(page) {
  for (let tries = 0; tries < 45; tries++) {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 4000 });
      await page.getByRole("tab", { name: "Insertar" }).waitFor({ timeout: 5000 });
      await page.locator(sceneSelector + " .bwjm-riemann-rectangle").first().waitFor({ timeout: 10000 });
      return;
    } catch (error) {
      if (tries === 44) throw error;
      await new Promise(resolve => setTimeout(resolve, 900));
    }
  }
}
async function variable(page, name, value) {
  const row = page.locator(".bwjm-slider-row").filter({ has: page.locator("span").filter({ hasText: new RegExp("^" + name + ":$") }) });
  assert.equal(await row.count(), 1, "Missing native slider for " + name);
  const slider = row.locator('input[type="range"]');
  await slider.evaluate((el, next) => {
    el.value = String(next);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }, value);
  assert(Math.abs(Number(await slider.inputValue()) - value) < 1e-9, "Invalid slider value " + name);
}
async function verify(page, { a, n, sum, exact, crosses, maxError }) {
  await page.waitForFunction(({ n, sum }) => {
    const scene = document.querySelector("#node-riemann-interactive");
    const current = scene?.querySelectorAll(".bwjm-riemann-rectangle").length;
    const output = scene?.querySelector('[data-riemann-metric="sum"]');
    return current === n && output && Math.abs(Number(output.getAttribute("data-value")) - sum) < 1e-8;
  }, { n, sum }, { timeout: 12000 });
  const scene = page.locator(sceneSelector);
  assert.equal(await page.locator(".bwjm-node-card").filter({has: scene}).count() >= 1, true);
  const polygons = scene.locator(".bwjm-svg-plot svg polygon.bwjm-riemann-rectangle");
  assert.equal(await polygons.count(), n, "Incorrect rectangle count");
  assert.equal(await scene.locator("svg polyline[data-curve]").count(), 2, "Two curves must share an SVG");

  const corners = await scene.locator("svg circle.bwjm-riemann-intersection").evaluateAll(elements =>
    elements.map(el => [Number(el.getAttribute("data-x")), Number(el.getAttribute("data-y"))]));
  assert.deepEqual(corners, crosses, "Intersection coordinates stale");

  const numbers = await scene.locator(".bwjm-riemann-report output[data-riemann-metric]").evaluateAll(outputs =>
    Object.fromEntries(outputs.map(el => [el.getAttribute("data-riemann-metric"), Number(el.getAttribute("data-value"))])));
  assert(Math.abs(numbers.reference - exact) < 1e-10, "Analytical area is incorrect");
  assert(Math.abs(numbers.sum - sum) < 1e-10, "Wrong midpoint sum");
  assert(Math.abs(numbers.error - Math.abs(sum - exact)) < 1e-9, "Wrong absolute error");
  if (maxError !== undefined) assert(numbers.error < maxError, "Absolute error did not decrease");

  const rectangleLimits = await polygons.evaluateAll(elements => elements.map(el => [
    Number(el.getAttribute("data-x0")), Number(el.getAttribute("data-x1")),
  ]));
  assert(Math.abs(rectangleLimits[0][0]) < 1e-9, "Rectangles do not begin at x=0");
  assert(Math.abs(rectangleLimits.at(-1)[1] - a) < 1e-9, "Rectangles do not cover [0,a]");

  // The curves must render over the fill rather than being obscured by it.
  const layers = await scene.locator("svg").evaluate(svg => {
    const children = [...svg.children];
    return {
      lastPolygon: children.findLastIndex(el => el.matches("polygon.bwjm-riemann-rectangle")),
      firstCurve: children.findIndex(el => el.matches("polyline[data-curve]")),
      lastCurve: children.findLastIndex(el => el.matches("polyline[data-curve]")),
      firstMarker: children.findIndex(el => el.matches("circle.bwjm-riemann-intersection")),
    };
  });
  assert(layers.lastPolygon < layers.firstCurve && layers.lastCurve < layers.firstMarker,
    "SVG layering incorrect: rectangles must be below curves and crosses");

  const geometry = await scene.locator("svg").evaluate(svg => {
    const vb = svg.viewBox.baseVal;
    return [...svg.querySelectorAll("circle.bwjm-riemann-intersection")].map(el => ({
      cx: Number(el.getAttribute("cx")), cy: Number(el.getAttribute("cy")),
      width: vb.width, height: vb.height,
    }));
  });
  assert(geometry.every(point => point.cx >= 0 && point.cx <= point.width &&
    point.cy >= 0 && point.cy <= point.height), "Intersection was clipped by axes");

  return numbers.error;
}
try {
  browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  await visit(page);
  const original = await page.locator(".bwjm-code-textarea").inputValue();
  assert(original.includes("id: riemann-interactive"), "Lesson lacks its portable scene ID");
  assert(original.includes("samples: 160"), "Curve sampling should be independent of n");
  assert(!original.includes("```plot2d"), "The two old separate plots are still present");

  await variable(page, "n", 2);
  const error2 = await verify(page, {
    a: 1, n: 2, sum: .1875, exact: 1/6, crosses: [[0,0],[1,1]],
  });
  await variable(page, "n", 10);
  await verify(page, { a: 1, n: 10, sum: .1675, exact: 1/6, crosses: [[0,0],[1,1]], maxError: error2 });
  await variable(page, "a", 2);
  await verify(page, { a: 2, n: 10, sum: 1.34, exact: 4/3, crosses: [[0,0],[2,4]] });
  assert.equal(await page.locator(".bwjm-code-textarea").inputValue(), original,
    "Changing runtime sliders altered the Markdown");

  // Rename and save the lesson. Then reopen the actual downloaded .bwjm,
  // not another in-memory sample tab, to establish filename portability.
  await page.getByRole("button", { name: "Renombrar area_riemann.bwjm" }).click();
  const rename = page.getByRole("textbox", { name: "Nuevo nombre del documento area_riemann.bwjm" });
  await rename.fill("riemann-guardada.bwjm");
  await rename.press("Enter");
  const downloadReady = page.waitForEvent("download");
  await page.keyboard.press("Control+s");
  const downloaded = await downloadReady;
  assert.equal(downloaded.suggestedFilename(), "riemann-guardada.bwjm");
  const savedContent = await readFile(await downloaded.path(), "utf8");
  assert.equal(savedContent, original, "Saving wrote runtime values into Markdown");

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.locator('input[accept=".bwjm,.jm,.md,.txt"]').setInputFiles({
    name: "riemann-guardada.bwjm", mimeType: "text/plain", buffer: Buffer.from(savedContent),
  });
  await page.locator(sceneSelector + " .bwjm-riemann-rectangle").first().waitFor({ timeout: 12000 });
  await verify(page, { a: 1, n: 10, sum: .1675, exact: 1/6, crosses: [[0,0],[1,1]] });
  await variable(page, "n", 2);
  await verify(page, { a: 1, n: 2, sum: .1875, exact: 1/6, crosses: [[0,0],[1,1]] });
  await variable(page, "a", 2);
  await verify(page, { a: 2, n: 2, sum: 1.5, exact: 4/3, crosses: [[0,0],[2,4]] });
  console.log("VIS-18 browser OK: midpoint n2/n10, a1/a2, rectangle geometry, intersections, area/error, SVG layering/viewport, rename/save/reopen.");
} finally {
  if (browser) await browser.close();
  server.kill("SIGTERM");
}
