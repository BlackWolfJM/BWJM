/** VIS-07 browser regressions. Playwright is installed under /tmp by CI. */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { readFile, mkdir } from "node:fs/promises";

const require = createRequire("/tmp/bwjm-browser/runner.cjs");
const { chromium } = require("playwright");
const fence = String.fromCharCode(96).repeat(3);
const url = "http://127.0.0.1:3000/BWJM-WEB-/";
const plot = [fence + "plot2d", "id: vis07-curva", "equation: x^2",
  "domain: [-2, 2]", fence].join("\n");
const acceptance = [
  "# Prueba VIS-07", "",
  "Antes $x^2$ después.", "",
  "$$x^2+1$$", "",
  "$$", "\\begin{bmatrix}", "a & b \\\\", "c & d", "\\end{bmatrix}", "$$", "",
  "$$", "\\frac{1}{2} $$", "",
  "Este párrafo debe aparecer después de la fórmula.", "",
  plot, "", "Texto posterior a la gráfica.",
].join("\n");
const server = spawn("pnpm", ["--dir", "apps/playground", "dev", "--host",
  "127.0.0.1", "--strictPort"], {
  env: { ...process.env, BWJM_BASE_PATH: "/BWJM-WEB-/" }, stdio: "inherit",
});
let browser;

async function visit(page) {
  for (let attempt = 0; attempt < 40; attempt++) {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 3500 });
      await page.getByRole("tab", { name: "Matemáticas" }).waitFor({ timeout: 3500 });
      return;
    } catch {
      await new Promise(resolve => setTimeout(resolve, 950));
    }
  }
  throw new Error("No inició Studio");
}
async function openText(page, filename, source) {
  await page.locator('input[accept=".bwjm,.jm,.md,.txt"]').setInputFiles({
    name: filename, mimeType: "text/plain", buffer: Buffer.from(source),
  });
  await page.getByRole("tab", { name: filename }).waitFor({ timeout: 15000 });
  if (source.length) await page.waitForFunction(expected => {
    return document.querySelector(".bwjm-code-textarea")?.value.includes(expected);
  }, source.slice(0, Math.min(14, source.length)), { timeout: 10000 });
}
async function download(page, label) {
  await page.getByRole("tab", { name: "Archivo" }).click();
  const [file] = await Promise.all([
    page.waitForEvent("download", { timeout: 15000 }),
    page.getByRole("button", { name: label, exact: true }).click(),
  ]);
  return readFile(await file.path());
}
async function ensureGraph(page, id) {
  await page.locator("#node-" + id + " svg").first().waitFor({ timeout: 20000 });
}
async function acceptanceTest() {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 850 },
    acceptDownloads: true });
  const page = await ctx.newPage();
  await visit(page);
  await openText(page, "vis07-aceptacion.bwjm", acceptance);
  await ensureGraph(page, "vis07-curva");
  await page.waitForFunction(() => document.querySelectorAll(".math-display-box").length >= 3);
  assert.equal(await page.locator(".math-display-box").count(), 3, "Tres bloques matemáticos");
  assert(await page.locator(".bwjm-inline-math").count() >= 1, "Fórmula en línea");
  const positioning = await page.evaluate(() => {
    const elements = [
      document.querySelector(".bwjm-inline-math"),
      ...document.querySelectorAll(".math-display-box"),
      [...document.querySelectorAll(".bwjm-prose-block p")]
        .find(node => node.textContent?.includes("Este párrafo debe aparecer")),
      document.querySelector("#node-vis07-curva"),
      [...document.querySelectorAll(".bwjm-prose-block p")]
        .find(node => node.textContent?.includes("Texto posterior a la gráfica")),
    ];
    if (elements.some(node => !node)) return null;
    return elements.map(node => node.getBoundingClientRect().top +
      window.scrollY + document.querySelector(".bwjm-scroll-container").scrollTop);
  });
  assert(positioning, "Faltan los párrafos, la gráfica o las fórmulas");
  assert(positioning.every((position, i) => i === 0 || position > positioning[i - 1]),
    "El orden de fórmulas, párrafos y gráfico cambió: " + positioning.join(","));
  await mkdir("/tmp/vis07-screens", { recursive: true });
  await page.screenshot({ path: "/tmp/vis07-screens/aceptacion-1280.png", fullPage: true });

  const exported = await download(page, "Guardar");
  assert(exported.includes(Buffer.from("\\frac{1}{2} $$")));
  assert(exported.includes(Buffer.from("Texto posterior a la gráfica")));
  const html = (await download(page, "Exportar HTML")).toString("utf8");
  assert(html.includes("Este párrafo debe aparecer"), "Exportar HTML perdió prosa");
  assert(html.includes("Texto posterior a la gráfica"), "Exportar HTML perdió texto posterior");
  assert(html.includes("math-display-box"), "Exportar HTML perdió las fórmulas en bloque");
  assert(html.includes("vis07-curva"), "Exportar HTML perdió la gráfica");

  await ctx.close();
  const session = await browser.newContext({ viewport: { width: 1280, height: 850 },
    acceptDownloads: true });
  const reopened = await session.newPage();
  await visit(reopened);
  await openText(reopened, "copia-vis07.bwjm", exported.toString("utf8"));
  await ensureGraph(reopened, "vis07-curva");
  assert.equal(await reopened.locator(".math-display-box").count(), 3);
  await session.close();

  const unclosed = acceptance.replace("\\frac{1}{2} $$", "\\frac{1}{2}");
  const second = await browser.newContext({ viewport: { width: 1280, height: 850 } });
  const editing = await second.newPage();
  await visit(editing);
  await openText(editing, "sin-cierre.bwjm", unclosed);
  await ensureGraph(editing, "vis07-curva");
  assert((await editing.locator("#bwjm-reader-panel").innerText())
    .includes("Este párrafo debe aparecer"), "Una fórmula sin cierre ocultó prosa");
  await editing.screenshot({ path: "/tmp/vis07-screens/sin-cierre-1280.png", fullPage: true });
  await second.close();
  console.log("VIS-07 aceptación, incompleto, guardado/reapertura y HTML: OK");
}

async function buttonTest() {
  const actions = [
    ["Ecuación", "\\int_0^1 f(x)\\,dx"],
    ["Matriz", "\\begin{bmatrix}\na & b \\\\\nc & d\n\\end{bmatrix}"],
    ["Integral", "\\int_{a}^{b} f(x)\\,dx"],
  ];
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 850 },
    acceptDownloads: true });
  const page = await ctx.newPage();
  await visit(page);
  let num = 1;
  for (const [label, tex] of actions) {
    for (const source of ["", "Antes", "Antes palabra después"]) {
      const filename = "accion-" + num++ + ".bwjm";
      await openText(page, filename, source);
      const editor = page.locator(".bwjm-code-textarea");
      await editor.evaluate((textarea, selected) => {
        textarea.focus();
        const at = selected
          ? textarea.value.indexOf("palabra")
          : textarea.value.length;
        textarea.setSelectionRange(at, selected ? at + 7 : at);
      }, source.includes("palabra"));
      await page.getByRole("tab", { name: "Matemáticas" }).click();
      const action = page.getByRole("button", { name: label, exact: true });
      if (!(await action.count())) {
        const available = await page.locator(".bwjm-ribbon-content .bwjm-ribbon-action").allTextContents();
        const ribbon = await page.locator(".bwjm-ribbon").innerText();
        throw new Error("No se mostró " + label + " (documento: " + filename +
          ", cinta: " + ribbon.slice(0, 250) + ", acciones: " + JSON.stringify(available) + ")");
      }
      await action.click({ timeout: 6000 });
      await page.waitForTimeout(250);
      const actual = await editor.inputValue();
      assert(actual.includes("$$\n"), label + " sin apertura $$");
      assert(actual.includes("\n$$"), label + " sin cierre $$");
      assert(actual.includes(source.includes("palabra") ? "palabra" : tex),
        label + " perdió el cuerpo");
      if (source.includes("palabra")) {
        assert(actual.startsWith("Antes "), label + " perdió texto previo");
        assert(actual.endsWith(" después"), label + " perdió texto posterior");
        assert(actual.includes("palabra\n$$\n\n después"), label + " fusionó el cierre con la palabra");
      }
      if (label === "Matriz" && !source.includes("palabra")) {
        assert(actual.includes("a & b " + "\\".repeat(2) + "\nc & d"),
          "Matriz perdió las dos barras invertidas");
      }
      if (label === "Integral" && !source.includes("palabra")) {
        assert(actual.includes("\\int_{a}^{b} f(x)\\,dx"));
      }
      assert((await download(page, "Guardar")).toString("utf8") === actual,
        label + " no guardó el código exacto");
      await page.getByRole("tab", { name: "Matemáticas" }).click();
    }
  }

  await openText(page, "inline-vis07.bwjm", "Antes x^2 después");
  await page.locator(".bwjm-code-textarea").evaluate(textarea => {
    textarea.focus();
    const at = textarea.value.indexOf("x^2");
    textarea.setSelectionRange(at, at + 3);
  });
  await page.getByRole("tab", { name: "Matemáticas" }).click();
  await page.getByRole("button", { name: "Fórmula en línea" }).click();
  assert.equal(await page.locator(".bwjm-code-textarea").inputValue(), "Antes $x^2$ después");
  assert(await page.locator(".bwjm-inline-math").count() > 0);

  for (const [modeIndex, expected] of [[0, "$x^2$"], [1, "$$\nx^2\n$$"], [2, "\\tag{7}"]]) {
    await openText(page, "modal-vis07-" + modeIndex + ".bwjm", "# Modal\n\n");
    await page.getByRole("tab", { name: "Insertar" }).click();
    await page.getByRole("button", { name: "Fórmula", exact: true }).click();
    await page.locator(".bwjm-modal-textarea").fill("x^2");
    await page.locator('input[name="formula-mode"]').nth(modeIndex).check();
    if (modeIndex === 2) await page.locator(".bwjm-modal-tag-input").fill("7");
    await page.getByRole("button", { name: "Insertar Fórmula", exact: true }).click();
    const contents = await page.locator(".bwjm-code-textarea").inputValue();
    assert(contents.includes(expected), "FormulaModal no conservó " + expected);
  }
  await ctx.close();
  console.log("VIS-07 botones reales y FormulaModal (3 modos): OK");
}

async function graphCustomizationTest() {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 850 } });
  const page = await ctx.newPage();
  const raw = [
    "# Rangos VIS-07", "", "$$", "\\frac{1}{2} $$", "",
    "Este párrafo permanece.", "",
    fence + "parametric2d", "id: vis07-ajustes", "x: cos(t)", "y: sin(t)",
    "tDomain: [0, 6.28]", fence, "", "Después.",
  ].join("\n");
  await visit(page);
  await openText(page, "vis07-grafica.bwjm", raw);
  const card = page.locator("#node-vis07-ajustes");
  await card.waitFor({ timeout: 16000 });
  await card.locator(".bwjm-graph-settings summary").click();
  const checkbox = card.getByRole("checkbox", { name: "Velocidad" });
  await checkbox.check();
  await page.waitForTimeout(850);
  const edited = await page.locator(".bwjm-code-textarea").inputValue();
  console.log("VIS-07 Personalizar gráfica source:", edited.slice(0, 570));
  assert(edited.includes("showVelocity: true"),
    "Personalizar gráfica no escribió en el bloque parametric2d");
  assert(edited.startsWith("# Rangos VIS-07\n\n$$\n\\frac{1}{2} $$\n\nEste párrafo permanece."));
  assert(edited.includes("showVelocity: true"));
  assert(edited.trim().endsWith("Después."));
  await ctx.close();
  console.log("VIS-07 Personalizar gráfica después de $$: OK");
}

try {
  browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  await acceptanceTest();
  await buttonTest();
  await graphCustomizationTest();
  console.log("VIS-07 Chromium completo: OK");
} finally {
  if (browser) await browser.close();
  server.kill("SIGTERM");
}
