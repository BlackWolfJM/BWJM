/**
 * VIS-14 — navegador real: reproductor visible con ajustes cerrados, teclado,
 * cambio de pestaña, estado del tiempo y diseño a 390px.
 * Requiere el Playwright aislado de scripts/vis06-browser.mjs.
 */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { readFile, mkdir } from "node:fs/promises";

const require = createRequire("/tmp/bwjm-browser/runner.cjs");
const { chromium } = require("playwright");
const url = "http://127.0.0.1:3000/BWJM-WEB-/";
const server = spawn("pnpm", ["--dir", "apps/playground", "dev", "--host", "127.0.0.1", "--strictPort"], {
  env: { ...process.env, BWJM_BASE_PATH: "/BWJM-WEB-/" }, stdio: "inherit",
});
const filename = "lote-01-animacion.bwjm";
const playbackSelector = ".bwjm-inline-playback";
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
async function timeOf(transport) {
  const value = await transport.locator(".bwjm-inline-playback-value").textContent();
  const match = /\b=\s*(-?\d+(?:\.\d+)?)/.exec(value ?? "");
  if (!match) throw new Error("Instante ilegible: " + value);
  return Number(match[1]);
}
async function waitForTimeAfter(page, selector, previous, delta = 0.015) {
  await page.waitForFunction(({ selector, previous, delta }) => {
    const value = document.querySelector(selector + " .bwjm-inline-playback-value")?.textContent ?? "";
    const time = Number(value.split("=").pop()?.trim());
    return Number.isFinite(time) && time > previous + delta;
  }, { selector, previous, delta }, { timeout: 15000 });
}
async function checkOne(transport, page) {
  assert.equal(await page.locator(playbackSelector).count(), 1, "Hay reproductores duplicados");
  assert.equal(await transport.count(), 1);
  assert.equal(await transport.evaluate(el => el.closest("details")), null,
    "El reproductor quedó dentro de un panel plegable");
  for (const cls of [".bwjm-inline-playback-toggle", ".bwjm-inline-playback-seek", ".bwjm-inline-playback-value"]) {
    assert(await transport.locator(cls).isVisible(), cls + " oculto");
  }
}

const secondDocument = [
  "# Documento independiente VIS-14", "",
  "```timeline", "name: t", "domain: [0, 10]", "default: 4", "loop: true", "```", "",
  "```parametric2d", "id: vis14-segunda", "x: cos(t)", "y: sin(t)",
  "tDomain: [0, 10]", "samples: 80", "```", "",
].join("\n");

try {
  await mkdir("/tmp/vis14-screens", { recursive: true });
  browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 850 } });
  await visit(page);
  const contents = await readFile("examples/" + filename, "utf8");
  await page.locator('input[accept=".bwjm,.jm,.md,.txt"]').setInputFiles({
    name: filename, mimeType: "text/plain", buffer: Buffer.from(contents),
  });
  const first = page.locator("#node-particula-circular");
  const transport = first.locator(playbackSelector);
  await transport.waitFor({ timeout: 15000 });
  const toggle = transport.locator(".bwjm-inline-playback-toggle");
  const seek = transport.locator(".bwjm-inline-playback-seek");
  const settings = first.locator(".bwjm-graph-settings > summary");
  const editor = page.locator(".bwjm-code-textarea");
  const sourceBefore = await editor.inputValue();
  await checkOne(transport, page);

  await settings.click();
  assert(await first.locator(".bwjm-graph-settings").evaluate(el => el.open));
  assert.equal(await toggle.getAttribute("aria-label"), "Reproducir animación");
  await toggle.click();
  assert.equal(await toggle.getAttribute("aria-label"), "Pausar animación");
  const runningTime = await timeOf(transport);
  await waitForTimeAfter(page, "#node-particula-circular " + playbackSelector, runningTime);
  await settings.click();
  assert.equal(await first.locator(".bwjm-graph-settings").evaluate(el => el.open), false);
  await checkOne(transport, page);
  const closedTime = await timeOf(transport);
  await waitForTimeAfter(page, "#node-particula-circular " + playbackSelector, closedTime);

  // Tab from the closed settings summary must still reach the native pause button.
  await settings.focus();
  let tabReachedPause = false;
  for (let i = 0; i < 18; i++) {
    await page.keyboard.press("Tab");
    tabReachedPause = await toggle.evaluate(el => document.activeElement === el);
    if (tabReachedPause) break;
  }
  assert(tabReachedPause, "Pausar no es accesible mediante Tab con ajustes cerrados");
  await page.keyboard.press("Space");
  assert.equal(await toggle.getAttribute("aria-label"), "Reproducir animación");
  const paused = await timeOf(transport);
  await page.waitForTimeout(300);
  assert.equal(await timeOf(transport), paused, "La reproducción no se pausó con Espacio");

  await toggle.focus();
  await page.keyboard.press("Enter");
  assert.equal(await toggle.getAttribute("aria-label"), "Pausar animación");
  await waitForTimeAfter(page, "#node-particula-circular " + playbackSelector, paused);
  await page.keyboard.press("Enter");
  assert.equal(await toggle.getAttribute("aria-label"), "Reproducir animación");
  const pausedEnter = await timeOf(transport);
  await page.waitForTimeout(250);
  assert.equal(await timeOf(transport), pausedEnter, "La reproducción no se pausó con Enter");

  await page.keyboard.press("Tab");
  assert(await seek.evaluate(el => document.activeElement === el),
    "El deslizador no es alcanzable con Tab");
  assert.equal(await seek.getAttribute("aria-label"), "Instante de la gráfica");
  await page.keyboard.press("Home");
  const seekStart = Number(await seek.inputValue());
  await page.keyboard.press("ArrowRight");
  const seekEnd = Number(await seek.inputValue());
  assert(seekEnd > seekStart, "Las flechas no modifican el instante");
  assert.equal(await toggle.getAttribute("aria-label"), "Reproducir animación");
  assert.equal(await editor.inputValue(), sourceBefore, "Los controles modificaron el Markdown");

  // Reanudar y cambiar de pestaña. El controlador previo debe dejar de
  // emitir cambios; el otro documento debe usar su propio valor inicial de t.
  await page.evaluate(() => {
    window.__vis14Events = [];
    window.addEventListener("bwjm-variable-change", () => {
      window.__vis14Events.push(performance.now());
    });
  });
  await toggle.click();
  const beforeSwitch = await timeOf(transport);
  await waitForTimeAfter(page, "#node-particula-circular " + playbackSelector, beforeSwitch);
  await page.getByRole("button", { name: "Nuevo documento" }).click();
  assert.equal(await page.locator(playbackSelector).count(), 0, "Documento estático mostró reproductor");
  const eventsAfterSwitch = await page.evaluate(() => window.__vis14Events.length);
  await page.waitForTimeout(300);
  assert.equal(await page.evaluate(() => window.__vis14Events.length), eventsAfterSwitch,
    "El bucle del documento anterior siguió actualizando variables");

  await editor.fill(secondDocument);
  const second = page.locator("#node-vis14-segunda " + playbackSelector);
  await second.waitFor();
  await checkOne(second, page);
  assert(Math.abs(await timeOf(second) - 4) < 0.01, "La segunda pestaña heredó el tiempo ajeno");
  const secondSeek = second.locator(".bwjm-inline-playback-seek");
  await secondSeek.fill("0.75");
  assert(Math.abs(await timeOf(second) - 7.5) < 0.01, "La segunda pestaña no conserva sus variables");

  await page.getByRole("tab", { name: filename }).click();
  await transport.waitFor();
  await checkOne(transport, page);
  assert.equal(await toggle.getAttribute("aria-label"), "Reproducir animación");
  assert(Math.abs(await timeOf(transport) - (await timeOf(transport))) < 0.001);
  assert(Math.abs(await timeOf(transport) - 7.5) > 0.5, "El tiempo de otra pestaña contaminó la primera");

  // A single transport advances the shared timeline at its original 1x speed.
  // Record update timestamps: there should not be multiple updates per frame.
  await page.evaluate(() => { window.__vis14Events = []; });
  const restartAt = await timeOf(transport);
  const startedAt = Date.now();
  await toggle.click();
  await waitForTimeAfter(page, "#node-particula-circular " + playbackSelector, restartAt, 0.1);
  const elapsedSeconds = (Date.now() - startedAt) / 1000;
  const progressed = (await timeOf(transport)) - restartAt;
  const frameTimes = await page.evaluate(() => [...window.__vis14Events]);
  assert(frameTimes.length >= 2, "No se observaron suficientes fotogramas");
  assert(frameTimes.every((now, i) => i === 0 || now - frameTimes[i - 1] >= 2),
    "Hay más de una actualización de variable por fotograma");
  assert(progressed > 0 && progressed <= elapsedSeconds * 1.65 + 0.04,
    "El reloj avanzó más rápido que el bucle 1×");
  await toggle.click();

  // No clipped controls or horizontal overlap at a 390px viewport with menu shut.
  await page.setViewportSize({ width: 390, height: 844 });
  await transport.scrollIntoViewIfNeeded();
  await checkOne(transport, page);
  assert.equal(await first.locator(".bwjm-graph-settings").evaluate(el => el.open), false);
  const boxes = await transport.evaluate(el => {
    const parent = el.parentElement;
    const rect = el.getBoundingClientRect();
    const outer = parent.getBoundingClientRect();
    const parts = [...el.children].map(child => child.getBoundingClientRect());
    return {
      transport: { left: rect.left, right: rect.right, width: rect.width },
      parent: { left: outer.left, right: outer.right, width: outer.width },
      parts: parts.map(part => ({ left: part.left, right: part.right })),
      viewport: window.innerWidth,
    };
  });
  assert(boxes.transport.width <= boxes.parent.width + 1, "El reproductor desborda la tarjeta");
  assert(boxes.transport.left >= -1 && boxes.transport.right <= boxes.viewport + 1,
    "El reproductor se recorta a 390px");
  for (const part of boxes.parts) {
    assert(part.left >= boxes.transport.left - 1 && part.right <= boxes.transport.right + 1,
      "Un control desborda el reproductor");
  }
  await page.screenshot({ path: "/tmp/vis14-screens/vis14-390.png", fullPage: true });
  console.log("VIS-14 OK: menú cerrado, foco Tab, Pausar con Espacio/Enter, flechas, pestañas, 1× y 390px.", boxes);
} finally {
  if (browser) await browser.close();
  server.kill("SIGTERM");
}
