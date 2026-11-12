/**
 * VIS-17: real-browser slider keyboard/precision/animation regression.
 * Follows scripts/vis06-browser.mjs, with Playwright installed in /tmp.
 */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire("/tmp/bwjm-browser/runner.cjs");
const { chromium } = require("playwright");
const url = "http://127.0.0.1:3000/BWJM-WEB-/";
const server = spawn("pnpm", ["--dir", "apps/playground", "dev", "--host", "127.0.0.1", "--strictPort"], {
  env: { ...process.env, BWJM_BASE_PATH: "/BWJM-WEB-/" }, stdio: "inherit",
});
const fence = String.fromCharCode(96).repeat(3);
const source = (min, max, step, initial) => [
  "# VIS-17", "",
  fence + "slider",
  "name: a", "min: " + min, "max: " + max, "step: " + step,
  "default: " + initial, fence, "",
  fence + "plot2d", "id: vis17-plot", "equation: a*x", "x: [-1,1]", fence,
].join("\n");
let browser;

async function visit(page) {
  for (let attempt = 0; attempt < 45; attempt++) {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 4000 });
      await page.getByRole("tab", { name: "Insertar" }).waitFor({ timeout: 5000 });
      return;
    } catch (error) {
      if (attempt === 44) throw error;
      await new Promise(resolve => setTimeout(resolve, 900));
    }
  }
}

async function start(page, min, max, step, initial) {
  await visit(page);
  const content = source(min, max, step, initial);
  await page.locator('input[accept=".bwjm,.jm,.md,.txt"]').setInputFiles({
    name: "VIS17.bwjm", mimeType: "text/plain", buffer: Buffer.from(content),
  });
  await page.getByRole("slider", { name: "a", exact: true }).waitFor({ timeout: 15000 });
  // Capture the actual samples passed from MathMDCore to SVGRenderer.render.
  // Import the module URL already loaded by Vite, so the prototype is shared.
  await page.evaluate(async () => {
    const path = performance.getEntriesByType("resource")
      .map(resource => resource.name)
      .find(name => name.includes("/packages/renderer-svg/src/svgRenderer.ts"));
    if (!path) throw new Error("Cannot find the active SVGRenderer module");
    const { SVGRenderer } = await import(path);
    const original = SVGRenderer.prototype.render;
    window.__vis17Frames = [];
    SVGRenderer.prototype.render = function(node) {
      if (node.type === "plot2d" && node.id === "vis17-plot") {
        const control = document.querySelector('.bwjm-slider-row input[type="range"]');
        const badge = document.querySelector(".bwjm-slider-val");
        window.__vis17Frames.push({
          yAtOne: node.points.at(-1)[1],
          xAtOne: node.points.at(-1)[0],
          input: control?.valueAsNumber,
          display: badge?.textContent,
          accessible: control?.getAttribute("aria-valuetext"),
        });
      }
      return original.call(this, node);
    };
  });
  return {
    input: page.getByRole("slider", { name: "a", exact: true }),
    play: page.locator(".bwjm-slider-row .bwjm-play-btn"),
    badge: page.locator(".bwjm-slider-val"),
    source: content,
  };
}

async function inspect(page, state, numeric, text) {
  assert(Math.abs(Number(await state.input.inputValue()) - numeric) < 1e-12,
    "Native range value differs from expected " + numeric);
  assert.equal(await state.badge.innerText(), text, "Visible precision incorrect");
  assert.equal(await state.input.getAttribute("aria-valuetext"), text, "Accessible value is stale");
  const frame = await page.evaluate(() => window.__vis17Frames.at(-1));
  assert(frame, "The chart was not redrawn when the slider changed");
  assert(Math.abs(frame.xAtOne - 1) < 1e-9);
  assert(Math.abs(frame.yAtOne - numeric) < 1e-11,
    "The plotted a*x value does not match the slider");
  assert(Math.abs(frame.input - numeric) < 1e-12);
  assert.equal(frame.display, text);
  assert.equal(frame.accessible, text);
}

async function keyboard(page, config, values) {
  const state = await start(page, ...config);
  assert.equal(await state.input.count(), 1, "Slider has no accessible name");
  const before = await page.locator(".bwjm-code-textarea").inputValue();
  // Tab from the native playback button to the labeled native range control.
  await state.play.focus();
  await page.keyboard.press("Tab");
  assert(await state.input.evaluate(element => document.activeElement === element),
    "Tab did not focus the native slider");
  for (const [numeric, text] of values) {
    await page.keyboard.press("ArrowRight");
    await inspect(page, state, numeric, text);
  }
  assert.equal(await page.locator(".bwjm-code-textarea").inputValue(), before,
    "Runtime changes must not modify Markdown");
  return state;
}

try {
  browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });

  const page = await browser.newPage({ viewport: { width: 1280, height: 850 } });
  const state = await keyboard(page, ["0", "0.01", "0.001", "0"], [
    [.001, "0.001"], [.002, "0.002"],
  ]);
  await page.evaluate(() => { window.__vis17Frames = []; });
  await state.play.click();
  await page.waitForFunction(() => window.__vis17Frames.length >= 5, null, { timeout: 15000 });
  await state.play.click();
  const animationFrames = await page.evaluate(() => [...window.__vis17Frames]);
  assert(animationFrames.length >= 5, "Not enough animation frames captured");
  for (let index = 0; index < animationFrames.length; index++) {
    const frame = animationFrames[index];
    const current = frame.input;
    const prior = index ? animationFrames[index - 1].input : .002;
    const expected = prior >= .01 - 1e-12 ? 0 : prior + .001;
    assert(Math.abs(current - expected) < 1e-12,
      "The animation skipped or rounded a step: " + current + " vs " + expected);
    assert(Math.abs(frame.yAtOne - current) < 1e-12, "The graph lagged behind animation");
    assert.equal(frame.display, current.toFixed(3), "The animated label was rounded incorrectly");
    assert.equal(frame.accessible, frame.display);
  }
  await page.close();

  const offset = await browser.newPage();
  await keyboard(offset, ["0.0005", "0.0095", "0.001", "0.0005"], [
    [.0015, "0.0015"], [.0025, "0.0025"],
  ]);
  await offset.close();

  const exponent = await browser.newPage();
  await keyboard(exponent, ["0", "0.000001", "1e-7", "0"], [
    [1e-7, "0.0000001"], [2e-7, "0.0000002"],
  ]);
  await exponent.close();

  const whole = await browser.newPage();
  await keyboard(whole, ["0", "10", "1", "1"], [
    [2, "2"], [3, "3"],
  ]);
  await whole.close();

  console.log("VIS-17 browser OK: native accessible label, Tab+arrows, offset and exponential steps, integer range, animation chart/badge/value synchronization.");
} finally {
  if (browser) await browser.close();
  server.kill("SIGTERM");
}
