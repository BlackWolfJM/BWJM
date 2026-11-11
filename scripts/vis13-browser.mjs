/**
 * VIS-13: product-cross identities, live preview, commit, keyboard focus.
 * Run with Playwright installed in /tmp/bwjm-browser (see vis06-browser.mjs).
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
const fence = "```";
const block = (id) => [
  fence + "crossproduct", "id: " + id,
  "u: [1, 2, 0]", "v: [0, 3, 1]", "w: [1, 0, 2]",
  "showPlane: true", "showNormal: true", "showSteps: true",
  "showIdentities: true", "showDistributive: true",
  fence,
].join("\n");
const firstId = "cross-vis13-a";
const secondId = "cross-vis13-b";
const source = ["# VIS-13", "", block(firstId), ""].join("\n");
const ids = ["anticommutativity", "selfCross", "scalarAssociativity", "distributivity"];

let browser;
try {
  browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  for (let attempt = 0; attempt < 45; attempt++) {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 4000 });
      await page.getByRole("tab", { name: "Insertar" }).waitFor({ timeout: 5000 });
      break;
    } catch (error) {
      if (attempt === 44) throw error;
      await new Promise(resolve => setTimeout(resolve, 900));
    }
  }
  const editor = page.locator(".bwjm-code-textarea");
  const file = page.locator('input[accept=".bwjm,.jm,.md,.txt"]');
  await file.setInputFiles({ name: "VIS13.bwjm", mimeType: "text/plain", buffer: Buffer.from(source) });
  await page.waitForFunction(id => !!document.querySelector("#node-" + id), firstId);
  const card = page.locator("#node-" + firstId);
  const report = card.locator(".bwjm-cross-report");
  const identity = id => card.locator('.bwjm-identity-item[data-identity-id="' + id + '"]');
  const disclosure = id => identity(id).locator("details.bwjm-identity-steps");
  await report.locator("details.bwjm-cross-steps > summary").click();
  for (const id of ["anticommutativity", "distributivity"]) {
    await disclosure(id).locator("summary").click();
  }
  async function checkOpen(open = ["anticommutativity", "distributivity"]) {
    for (const id of ids) {
      assert.equal(await disclosure(id).evaluate(el => el.open), open.includes(id), id + " no conservó su apertura");
    }
  }
  await checkOpen();
  const untouched = await editor.inputValue();
  await disclosure("selfCross").locator("summary").click();
  await disclosure("selfCross").locator("summary").click();
  assert.equal(await editor.inputValue(), untouched, "Abrir/cerrar mutó Markdown");
  const ux = card.locator('.bwjm-cross-editor input[aria-label="u x"]');
  await card.locator(".bwjm-graph-settings > summary").click();
  await ux.fill("2");
  await page.waitForFunction(id => document.querySelector("#node-" + id + " .bwjm-cross-result")?.textContent?.includes("2, -2, 6"), firstId);
  assert(await ux.evaluate(el => document.activeElement === el), "La vista previa perdió el foco numérico");
  await checkOpen();
  assert((await identity("anticommutativity").locator(".bwjm-identity-eval").innerText()).includes("2"), "Evaluación obsoleta");
  await ux.press("Tab");
  await page.waitForFunction(() => document.querySelector(".bwjm-code-textarea")?.value.includes("u: [2,2,0]"));
  await checkOpen();
  assert((await report.locator(".bwjm-cross-result").innerText()).includes("2, -2, 6"));
  const reverse = report.locator(".bwjm-order-indicator");
  await reverse.focus();
  await reverse.press("Enter");
  await page.waitForFunction(id => document.querySelector("#node-" + id + " .bwjm-cross-result")?.textContent?.includes("-2, 2, -6"), firstId);
  assert(await report.locator(".bwjm-order-indicator").evaluate(el => document.activeElement === el), "La inversión perdió el foco");
  await checkOpen();
  await disclosure("distributivity").locator("summary").focus();
  await disclosure("distributivity").locator("summary").press("Enter");
  await checkOpen(["anticommutativity"]);
  const projection = card.locator(".bwjm-cross-editor [data-cross-projection]");
  const handle = projection.locator("circle").last();
  const bounds = await handle.boundingBox();
  if (!bounds) throw new Error("No se encontró un extremo arrastrable");
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width / 2 + 12, bounds.y + bounds.height / 2 + 8, { steps: 5 });
  await checkOpen(["anticommutativity"]);
  await page.mouse.up();
  await checkOpen(["anticommutativity"]);
  const wx = card.locator('.bwjm-cross-editor input[aria-label="w x"]');
  const evalBeforeW = await identity("distributivity").locator(".bwjm-identity-eval").innerText();
  await wx.fill("3");
  await page.waitForFunction(({ id, before }) => {
    const evaluation = document.querySelector("#node-" + id +
      ' .bwjm-identity-item[data-identity-id="distributivity"] .bwjm-identity-eval');
    return !!evaluation && evaluation.textContent !== before;
  }, { id: firstId, before: evalBeforeW });
  assert(await wx.evaluate(el => document.activeElement === el), "El campo w perdió foco en vista previa");
  const evalPreviewW = await identity("distributivity").locator(".bwjm-identity-eval").innerText();
  await wx.press("Tab");
  await page.waitForFunction(() => document.querySelector(".bwjm-code-textarea")?.value.includes("w: [3,0,2]"));
  await checkOpen(["anticommutativity"]);
  assert.equal(await identity("distributivity").locator(".bwjm-identity-eval").innerText(), evalPreviewW,
    "La evaluación de w no sobrevivió al guardado");

  const updated = await editor.inputValue();
  await editor.fill(updated + "\n" + block(secondId) + "\n");
  const second = page.locator("#node-" + secondId);
  await second.waitFor();
  await second.locator(".bwjm-cross-steps > summary").click();
  const secondAnti = second.locator('.bwjm-identity-item[data-identity-id="anticommutativity"] details');
  assert.equal(await secondAnti.evaluate(el => el.open), false, "Se filtró estado a otro bloque");
  const sourceBeforeToggle = await editor.inputValue();
  await secondAnti.locator("summary").click();
  assert.equal(await secondAnti.evaluate(el => el.open), true);
  await disclosure("anticommutativity").locator("summary").click();
  assert.equal(await disclosure("anticommutativity").evaluate(el => el.open), false);
  assert.equal(await secondAnti.evaluate(el => el.open), true);
  assert.equal(await editor.inputValue(), sourceBeforeToggle, "Abrir/cerrar identidad modificó Markdown");
  console.log("VIS-13 navegador: OK (estado, evaluaciones, preview, guardar, invertir, foco, arrastre, w, bloques independientes).");
} finally {
  if (browser) await browser.close();
  server.kill("SIGTERM");
}
