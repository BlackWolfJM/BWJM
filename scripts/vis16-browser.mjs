/**
 * VIS-16 browser regression: tab-local globals, graph locals and timeline state.
 * Uses Playwright as in scripts/vis06-browser.mjs.
 */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";

const require = createRequire("/tmp/bwjm-browser/runner.cjs");
const { chromium } = require("playwright");
const URL = "http://127.0.0.1:3000/BWJM-WEB-/";
const server = spawn("pnpm", ["--dir", "apps/playground", "dev", "--host", "127.0.0.1", "--strictPort"], {
  env: { ...process.env, BWJM_BASE_PATH: "/BWJM-WEB-/" }, stdio: "inherit",
});
const fence = String.fromCharCode(96).repeat(3);
const source = (title, aDefault, bDefault, checkboxDefault = false) => [
  "# " + title, "",
  fence + "slider", "name: a", "min: 0", "max: 10", "step: 1", "default: " + aDefault, fence, "",
  fence + "checkbox", "name: enabled", "default: " + checkboxDefault, fence, "",
  fence + "plot2d", "id: misma", "equation: a*x+b", "x: [-1,1]",
  "paramControls: " + JSON.stringify({
    enabled: true, animate: false,
    parameters: [{ name: "b", min: -5, max: 5, step: 1, default: bDefault }],
  }), fence,
].join("\n");

const aSource = source("VIS-16-A", 1, 0, false);
const bSource = source("VIS-16-B", 2, -1, true);
const globalSlider = ".bwjm-slider-row .bwjm-range-input";
const localSlider = '#node-misma .bwjm-adaptive-range[aria-label="Valor del parámetro b"]';
const timelineSlider = "#node-particula-circular .bwjm-inline-playback-seek";
let browser;

async function openFile(page, name, contents) {
  const before = await page.locator(".bwjm-document-tab-list [role=tab]").count();
  await page.locator('input[accept=".bwjm,.jm,.md,.txt"]').setInputFiles({
    name, mimeType: "text/plain", buffer: Buffer.from(contents),
  });
  await page.waitForFunction(count => document.querySelectorAll(".bwjm-document-tab-list [role=tab]").length === count + 1, before);
  await page.waitForFunction(title => document.querySelector(".bwjm-code-textarea")?.value.includes(title),
    contents.split("\n")[0]);
}

/**
 * Infer the actual y(0) from the rendered SVG path and two labeled y-axis ticks.
 * This checks the plotted numerical data, not just the slider state.
 */
async function graphIntercept(page) {
  return page.locator("#node-misma .bwjm-svg-plot svg").evaluate(svg => {
    const path = svg.querySelector("path.plot-line")?.getAttribute("d");
    if (!path) throw Error("No rendered plot path");
    const vertices = path.slice(1).trim().split(/\s+/).map(value => value.split(",").map(Number));
    const height = Number(svg.getAttribute("height"));
    const axis = [...svg.querySelectorAll("line.axis")].find(el => {
      const x1 = Number(el.getAttribute("x1")), x2 = Number(el.getAttribute("x2"));
      const y1 = Number(el.getAttribute("y1")), y2 = Number(el.getAttribute("y2"));
      return Math.abs(x1 - x2) < 0.01 && Math.abs(y1 - y2) > height / 2;
    });
    if (!axis) throw Error("Missing plot y axis");
    const axisX = Number(axis.getAttribute("x1"));
    const tickX = axisX + (axisX < 60 ? 10 : -10);
    const ticks = [...svg.querySelectorAll("text.label")].map(el => ({
      x: Number(el.getAttribute("x")),
      y: Number(el.getAttribute("y")),
      value: Number(el.textContent),
    })).filter(t => Math.abs(t.x - tickX) < 0.01 && Number.isFinite(t.value));
    if (ticks.length < 2) throw Error("Insufficient labeled y-axis ticks");
    const right = vertices.findIndex(([x]) => x >= axisX);
    if (right < 1) throw Error("SVG plot does not bracket x=0");
    const [x0, y0] = vertices[right - 1], [x1, y1] = vertices[right];
    const interceptPixel = y0 + (axisX - x0) * (y1 - y0) / (x1 - x0);
    const first = ticks[0], second = ticks[1];
    return first.value + (interceptPixel - first.y) * (second.value - first.value) / (second.y - first.y);
  });
}
async function checkGraph(page, a, b, enabled) {
  const aSlider = page.locator(globalSlider);
  const bSlider = page.locator(localSlider);
  await aSlider.waitFor();
  await bSlider.waitFor();
  assert.equal(Number(await aSlider.inputValue()), a, "Global slider was not restored");
  assert.equal(Number(await bSlider.inputValue()), b, "Local slider was not restored");
  assert.equal(await page.locator(".bwjm-slider-val").innerText(), a.toFixed(2),
    "Global slider badge differs from core");
  assert.equal(await page.locator("#node-misma .bwjm-adaptive-parameter output").innerText(), String(b),
    "Local slider output differs from core");
  const checked = await page.locator(".bwjm-node-body input[type=checkbox]").first().isChecked();
  assert.equal(checked, enabled, "Checkbox leaked between tabs");
  const intercept = await graphIntercept(page);
  assert(Math.abs(intercept - b) < 0.06, "Plotted y(0)=" + intercept + " expected " + b);
}
async function changeValue(page, selector, next) {
  await page.locator(selector).evaluate((el, value) => {
    el.value = String(value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }, next);
}
async function editValues(page, a, b, checkbox) {
  const before = await page.locator(".bwjm-code-textarea").inputValue();
  await changeValue(page, globalSlider, a);
  await changeValue(page, localSlider, b);
  const control = page.locator(".bwjm-node-body input[type=checkbox]").first();
  await control.setChecked(checkbox);
  await page.waitForFunction(val => document.querySelector(".bwjm-slider-val")?.textContent === val.toFixed(2), a);
  await checkGraph(page, a, b, checkbox);
  assert.equal(await page.locator(".bwjm-code-textarea").inputValue(), before,
    "Changing runtime values modified the Markdown source");
}
async function showParameters(page) {
  const details = page.locator("#node-misma details.bwjm-graph-settings");
  if (!await details.evaluate(el => el.open)) await details.locator("summary").click();
  await page.locator(localSlider).waitFor();
}
async function clickTab(page, name) {
  await page.getByRole("tab", { name, exact: false }).click();
  await page.waitForFunction(name => {
    const heading = document.querySelector(".bwjm-studio-active-name");
    return heading?.textContent?.includes(name);
  }, name);
  await showParameters(page);
}
async function setTime(page, fraction) {
  await showTimeline(page);
  await changeValue(page, timelineSlider, fraction);
  const expectT = Math.round(6.28 * fraction * 1000) / 1000;
  await page.waitForFunction(value => {
    const label = document.querySelector(".bwjm-inline-playback-value")?.textContent;
    const n = Number(label?.split("=").pop()?.trim());
    return Number.isFinite(n) && Math.abs(n - value) < .007;
  }, expectT);
  assert(Math.abs(Number(await page.locator(timelineSlider).inputValue()) - fraction) < .0002);
  return expectT;
}
async function showTimeline(page) {
  const details = page.locator("#node-particula-circular details.bwjm-graph-settings");
  await details.waitFor();
  if (!await details.evaluate(el => el.open)) await details.locator("summary").click();
  await page.locator(timelineSlider).waitFor();
}
async function timeValue(page) {
  await showTimeline(page);
  return Number((await page.locator(".bwjm-inline-playback-value").innerText()).split("=").pop().trim());
}

try {
  browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  for (let i = 0; i < 45; i++) {
    try {
      await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 4000 });
      await page.getByRole("tab", { name: "Insertar" }).waitFor({ timeout: 5000 });
      break;
    } catch (err) {
      if (i === 44) throw err;
      await new Promise(resolve => setTimeout(resolve, 900));
    }
  }

  await openFile(page, "A-vis16.bwjm", aSource);
  await showParameters(page);
  await checkGraph(page, 1, 0, false);
  await editValues(page, 4, 5, true);

  await openFile(page, "B-vis16.bwjm", bSource);
  await showParameters(page);
  await checkGraph(page, 2, -1, true);
  await editValues(page, 6, -2, false);
  await clickTab(page, "A-vis16.bwjm");
  await checkGraph(page, 4, 5, true);
  await clickTab(page, "B-vis16.bwjm");
  await checkGraph(page, 6, -2, false);
  await clickTab(page, "A-vis16.bwjm");
  await checkGraph(page, 4, 5, true);

  const sourceBeforeParagraph = await page.locator(".bwjm-code-textarea").inputValue();
  await page.locator(".bwjm-code-textarea").fill(sourceBeforeParagraph.replace(
    "# VIS-16-A", "# VIS-16-A\n\nPárrafo modificado sin tocar las gráficas."));
  await showParameters(page);
  await checkGraph(page, 4, 5, true);

  await page.getByRole("tab", { name: "A-vis16.bwjm" }).dblclick();
  const rename = page.getByRole("textbox", { name: "Nuevo nombre del documento A-vis16.bwjm" });
  await rename.fill("A-renombrado.bwjm");
  await rename.press("Enter");
  await clickTab(page, "A-renombrado.bwjm");
  await checkGraph(page, 4, 5, true);

  const beforeNarrowing = await page.locator(".bwjm-code-textarea").inputValue();
  await page.locator(".bwjm-code-textarea").fill(beforeNarrowing.replace("max: 10", "max: 3"));
  await showParameters(page);
  await checkGraph(page, 1, 5, true);
  await clickTab(page, "B-vis16.bwjm");
  await checkGraph(page, 6, -2, false);

  page.once("dialog", dialog => dialog.accept());
  await page.getByRole("button", { name: "Cerrar A-renombrado.bwjm" }).click();
  await page.waitForFunction(() => ![...document.querySelectorAll(".bwjm-document-tab-name")]
    .some(el => el.textContent === "A-renombrado.bwjm"));
  await openFile(page, "A-vis16.bwjm", aSource);
  await showParameters(page);
  await checkGraph(page, 1, 0, false);

  const timelineSource = await readFile("examples/lote-01-animacion.bwjm", "utf8");
  await openFile(page, "lote-01-animacion.bwjm", timelineSource);
  const firstTimelineTab = (await page.locator(".bwjm-document-tab-list [role=tab]").count()) - 1;
  const tFirst = await setTime(page, .24);
  await openFile(page, "lote-01-animacion.bwjm", timelineSource);
  const secondTimelineTab = (await page.locator(".bwjm-document-tab-list [role=tab]").count()) - 1;
  assert(Math.abs(await timeValue(page)) < .005, "Second copy inherited the first timeline");
  const tSecond = await setTime(page, .78);
  await page.locator(".bwjm-document-tab-list [role=tab]").nth(firstTimelineTab).click();
  assert(Math.abs(await timeValue(page) - tFirst) < .008, "First copy lost its timeline");
  await page.locator(".bwjm-document-tab-list [role=tab]").nth(secondTimelineTab).click();
  assert(Math.abs(await timeValue(page) - tSecond) < .008, "Second copy lost its timeline");

  console.log("VIS-16 browser OK: independent slider/checkbox/local b and actual SVG y(0), edit, rename, range, close/reopen, 2 independent timelines.");
} finally {
  if (browser) await browser.close();
  server.kill("SIGTERM");
}
