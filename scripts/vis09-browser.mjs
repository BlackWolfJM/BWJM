import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { readFile, readdir, mkdir } from "node:fs/promises";
import path from "node:path";

const require = createRequire("/tmp/bwjm-browser/runner.cjs");
const { chromium } = require("playwright");
const packages = await readdir("node_modules/.pnpm");
const katexDir = packages.find(name => name.startsWith("katex@0.16."));
assert(katexDir, "Missing locked KaTeX");
const dist = path.resolve("node_modules/.pnpm", katexDir, "node_modules/katex/dist");
const katexJs = await readFile(path.join(dist, "katex.min.js"));
const katexCss = await readFile(path.join(dist, "katex.min.css"));
const url = "http://127.0.0.1:3000/BWJM-WEB-/";
const server = spawn("pnpm", ["--dir", "apps/playground", "dev", "--host", "127.0.0.1", "--strictPort"], {
  env: { ...process.env, BWJM_BASE_PATH: "/BWJM-WEB-/" }, stdio: "inherit",
});
let browser;

async function visit(page, withKatex = true) {
  await page.route("**/cdn.jsdelivr.net/npm/katex@*/dist/katex.min.js", route =>
    withKatex ? route.fulfill({ status: 200, contentType: "application/javascript", body: katexJs }) : route.abort());
  await page.route("**/cdn.jsdelivr.net/npm/katex@*/dist/katex.min.css", route =>
    withKatex ? route.fulfill({ status: 200, contentType: "text/css", body: katexCss }) : route.abort());
  for (let attempt = 0; attempt < 40; attempt++) {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 4500 });
      await page.getByRole("tab", { name: "Insertar" }).waitFor({ timeout: 4000 });
      if (withKatex) await page.waitForFunction(() => !!window.katex, null, { timeout: 4000 });
      return;
    } catch {
      await new Promise(resolve => setTimeout(resolve, 850));
    }
  }
  throw new Error("Studio not ready");
}
async function openText(page, filename, content) {
  await page.locator('input[accept=".bwjm,.jm,.md,.txt"]').setInputFiles({
    name: filename, mimeType: "text/plain", buffer: Buffer.from(content),
  });
  await page.getByRole("tab", { name: filename }).waitFor({ timeout: 10000 });
  await page.waitForFunction(value =>
    document.querySelector(".bwjm-code-textarea")?.value.includes(value), content.slice(0, 12));
}
async function modal(page) {
  const latex = page.locator(".bwjm-modal-textarea");
  if (!(await latex.isVisible())) {
    await page.getByRole("tab", { name: "Insertar" }).click();
    await page.getByRole("button", { name: "Fórmula", exact: true }).click();
  }
  await latex.waitFor({ state: "visible" });
  return latex;
}
async function mode(page, value) {
  await page.locator('input[name="formula-mode"]').nth({
    inline: 0, block: 1, numbered: 2,
  }[value]).check();
}
async function screenshot(page, name) {
  await mkdir("/tmp/vis09-screens", { recursive: true });
  await page.screenshot({ path: "/tmp/vis09-screens/" + name + ".png", fullPage: true });
}

async function numberedButton() {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 850 } });
  const page = await ctx.newPage();
  page.on("console", msg => { if (msg.text().includes("VIS09 confirmation")) console.log(msg.text()); });
  page.on("pageerror", error => console.log("VIS09 page error", error.message));
  await visit(page);
  await openText(page, "numero-vis09.bwjm", "# Número VIS-09\n\nTexto previo.");
  const editor = page.locator(".bwjm-code-textarea");
  const latex = await modal(page);
  await mode(page, "numbered");
  await latex.fill("x^2");
  const label = page.locator(".bwjm-modal-tag-input");
  const preview = page.getByRole("region", { name: "Vista previa de la fórmula" });
  await label.fill("7");
  await preview.locator("annotation").filter({ hasText: "\\tag{7}" }).waitFor({ state: "attached" });
  assert((await preview.innerText()).includes("(7)"), "Preview missing (7)");
  await label.fill("8");
  await preview.locator("annotation").filter({ hasText: "\\tag{8}" }).waitFor({ state: "attached" });
  assert(!(await preview.innerText()).includes("(7)"), "Stale (7) preview");
  assert((await preview.innerText()).includes("(8)"), "Preview missing (8)");
  await screenshot(page, "preview-8");
  await page.getByRole("button", { name: "Insertar Fórmula" }).click();
  await page.waitForTimeout(500);
  console.log("VIS09 after button:", JSON.stringify({
    source: (await editor.inputValue()).slice(0, 380),
    modalVisible: await latex.isVisible(),
    activeTabs: await page.locator('[role="tab"][aria-selected="true"]').allTextContents(),
  }));
  assert((await editor.inputValue()).includes("\\tag{8}"),
    "Click did not insert numbered formula into editor");
  assert.equal((await editor.inputValue()).match(/\\tag\{8\}/g)?.length, 1);
  const tag = page.locator("#bwjm-reader-panel .math-display-box .tag").last();
  await tag.waitFor({ timeout: 12000 });
  assert((await tag.innerText()).includes("(8)"), "Reader missing (8)");
  await screenshot(page, "reader-8");

  const existing = await modal(page);
  await mode(page, "numbered");
  await existing.fill("y^2 \\tag{A.2}");
  await page.locator(".bwjm-modal-tag-input").fill("99");
  await preview.locator("annotation").filter({ hasText: "\\tag{A.2}" }).waitFor({ state: "attached" });
  await page.getByRole("button", { name: "Insertar Fórmula" }).click();
  await page.waitForFunction(() =>
    document.querySelector(".bwjm-code-textarea")?.value.includes("\\tag{A.2}"));
  const text = await editor.inputValue();
  assert.equal((text.match(/\\tag\{/g) ?? []).length, 2);
  assert(!text.includes("\\tag{99}"));
  await ctx.close();
  console.log("VIS-09 preview 7/8, reader (8), no duplicate tag: OK");
}

async function shortcuts() {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 850 } });
  const page = await ctx.newPage();
  await visit(page);
  await openText(page, "atajos-vis09.bwjm", "# Sin cambios\n\nTexto original.");
  const editor = page.locator(".bwjm-code-textarea");
  const original = await editor.inputValue();
  const latex = await modal(page);
  const insert = page.getByRole("button", { name: "Insertar Fórmula" });
  await latex.fill("");
  assert(await insert.isDisabled());
  await latex.press("Control+Enter");
  assert(await latex.isVisible());
  assert.equal(await editor.inputValue(), original);

  await latex.fill("\\frac{");
  assert(await insert.isDisabled());
  await latex.press("Control+Enter");
  assert.equal(await editor.inputValue(), original);
  assert.equal(await latex.inputValue(), "\\frac{");

  await mode(page, "numbered");
  await latex.fill("x^2");
  const label = page.locator(".bwjm-modal-tag-input");
  await label.fill("{");
  assert(await insert.isDisabled(), "Malformed tag should disable insertion");
  await label.press("Meta+Enter");
  assert(await latex.isVisible());
  assert.equal(await editor.inputValue(), original);

  await label.fill("A.2");
  await label.press("Control+Enter");
  await page.waitForFunction(() =>
    document.querySelector(".bwjm-code-textarea")?.value.includes("\\tag{A.2}"));
  assert(!(await latex.isVisible()));
  assert.equal((await editor.inputValue()).match(/\\tag\{A\.2\}/g)?.length, 1);

  const next = await modal(page);
  await mode(page, "block");
  await next.fill("\\sqrt{x}");
  await next.press("Meta+Enter");
  await page.waitForFunction(() =>
    document.querySelector(".bwjm-code-textarea")?.value.includes("\\sqrt{x}"));
  assert.equal((await editor.inputValue()).match(/\\sqrt\{x\}/g)?.length, 1);

  const ordinary = await modal(page);
  await ordinary.fill("a");
  await ordinary.press("Enter");
  assert((await ordinary.inputValue()).includes("\n"));
  const beforeEscape = await editor.inputValue();
  await ordinary.press("Escape");
  assert(!(await ordinary.isVisible()));
  assert.equal(await editor.inputValue(), beforeEscape);
  await ctx.close();
  console.log("VIS-09 empty/invalid, Ctrl/Meta+Enter, Enter and Escape: OK");
}

async function palette() {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 850 } });
  const page = await ctx.newPage();
  await visit(page);
  const latex = await modal(page);
  const pi = page.getByRole("button", { name: "π", exact: true });

  await latex.fill("ab");
  await latex.evaluate(input => { input.focus(); input.setSelectionRange(1, 1); });
  await pi.click();
  assert.equal(await latex.inputValue(), "a\\pi b");
  assert(await latex.evaluate(input => document.activeElement === input));
  assert.equal(await latex.evaluate(input => input.selectionStart), 5);

  await latex.fill("ab");
  await latex.evaluate(input => { input.focus(); input.setSelectionRange(0, 0); });
  await pi.focus();
  await pi.press("Enter");
  assert.equal(await latex.inputValue(), "\\pi ab");
  assert.equal(await latex.evaluate(input => input.selectionStart), 4);

  await latex.fill("ab");
  await latex.evaluate(input => { input.focus(); input.setSelectionRange(2, 2); });
  await pi.click();
  assert.equal(await latex.inputValue(), "ab\\pi");
  assert.equal(await latex.evaluate(input => input.selectionStart), 5);

  await latex.fill("preOLDpost");
  await latex.evaluate(input => { input.focus(); input.setSelectionRange(3, 6); });
  await page.getByRole("button", { name: "√x", exact: true }).click();
  assert.equal(await latex.inputValue(), "pre\\sqrt{x}post");
  assert.equal(await latex.evaluate(input => input.selectionStart), 11);
  assert.equal(await latex.evaluate(input => input.selectionEnd), 11);
  await screenshot(page, "palette-cursor");
  await ctx.close();
  console.log("VIS-09 palette mouse and keyboard, caret and selection: OK");
}

async function withoutKatex() {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 850 } });
  const page = await ctx.newPage();
  await visit(page, false);
  const latex = await modal(page);
  await latex.fill("x^2");
  assert(await page.getByRole("button", { name: "Insertar Fórmula" }).isDisabled());
  assert((await page.locator(".bwjm-modal-preview-box").innerText()).includes("KaTeX aún no está disponible"));
  await latex.press("Control+Enter");
  assert(await latex.isVisible());
  await ctx.close();
  console.log("VIS-09 unavailable renderer cannot validate: OK");
}

try {
  browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  await numberedButton();
  await shortcuts();
  await palette();
  await withoutKatex();
  console.log("VIS-09 Chromium: OK");
} finally {
  if (browser) await browser.close();
  server.kill("SIGTERM");
}
