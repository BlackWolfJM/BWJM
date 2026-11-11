import { describe, expect, it } from "vitest";
import { parseMathMD, parseProseMarkdown } from "@mathmd/parser";
import { prepareRemarkMath } from "../src/mathSource.js";

const fence = String.fromCharCode(96).repeat(3);
const plot = [
  fence + "plot2d",
  "id: vis07-curva",
  "equation: x^2",
  "domain: [-2, 2]",
  fence,
].join("\n");

interface TreeNode { type: string; value?: string; children?: TreeNode[] }
function collect(root: TreeNode): Array<{ type: string; value?: string }> {
  const flattened: Array<{ type: string; value?: string }> = [];
  const visit = (node: TreeNode): void => {
    flattened.push({ type: node.type, value: node.value });
    for (const child of node.children ?? []) visit(child);
  };
  visit(root);
  return flattened;
}

const acceptance = [
  "# Prueba VIS-07", "",
  "Antes $x^2$ después.", "",
  "$$x^2+1$$", "",
  "$$", "\\begin{bmatrix}", "a & b \\\\", "c & d", "\\end{bmatrix}", "$$", "",
  "$$", "\\frac{1}{2} $$", "",
  "Este párrafo debe aparecer después de la fórmula.", "",
  plot, "", "Texto posterior a la gráfica.",
].join("\n");

describe("VIS-07: parser matemático y bloques científicos", () => {
  it("reconoce fórmula inline, fórmula de una línea y dos bloques con cierre alternativo", () => {
    const root = parseProseMarkdown(acceptance);
    const nodes = collect(root);
    expect(nodes.some(node => node.type === "inlineMath" && node.value === "x^2")).toBe(true);
    expect(nodes.some(node => node.type === "inlineMath" && node.value === "x^2+1")).toBe(true);
    expect(nodes.filter(node => node.type === "math")).toHaveLength(2);
    expect(nodes.some(node => node.type === "paragraph")).toBe(true);
    expect(parseMathMD(acceptance).children.map(node => node.id)).toContain("vis07-curva");
  });

  it.each(["\n", "\r\n"])("conserva rangos originales LF/CRLF (%j) y la gráfica posterior", newline => {
    const original = [
      "Antes", "",
      "$$", "\\frac{1}{2} $$", "",
      "Párrafo posterior", "", plot, "", "Después de la gráfica",
    ].join("\n").replace(/\n/g, newline);
    const parsed = parseMathMD(original);
    expect(parsed.children).toHaveLength(1);
    const node = parsed.children[0];
    const originalPlot = plot.replace(/\n/g, newline);
    expect(original.slice(node.range.start.offset, node.range.end.offset)).toBe(originalPlot);
    const expectedOffset = original.indexOf(fence + "plot2d");
    expect(node.range.start.offset).toBe(expectedOffset);
    const expectedLine = original.slice(0, expectedOffset).split(newline).length;
    expect(node.range.start.line).toBe(expectedLine);
    expect(node.range.start.column).toBe(1);
    // Graph-customization replacement must target only the actual fenced block.
    const replacement = original.slice(0, node.range.start.offset)
      + originalPlot.replace("x^2", "sin(x)")
      + original.slice(node.range.end.offset);
    expect(replacement).toContain("Párrafo posterior");
    expect(parseMathMD(replacement).children).toHaveLength(1);
    expect(replacement).toContain("equation: sin(x)");
    expect(replacement).toContain("Después de la gráfica");
  });

  it("el cierre $$ unido a TeX sin espacios tampoco arrastra la gráfica", () => {
    const original = ["$$", "x^2$$", "", "Prosa después", "", plot].join("\n");
    expect(collect(parseProseMarkdown(original)).filter(node => node.type === "math")).toHaveLength(1);
    expect(parseMathMD(original).children).toHaveLength(1);
  });

  it.each(["\n", "\r\n"])("al escribir una fórmula abierta (%j), no desaparecen prosa ni gráfica", newline => {
    const original = [
      "Texto anterior", "", "$$", "\\frac{1}{2}", "",
      "El párrafo no debe desaparecer.", "", plot, "",
      "Después del gráfico",
    ].join("\n").replace(/\n/g, newline);
    const result = parseMathMD(original);
    expect(result.children.map(node => node.id)).toEqual(["vis07-curva"]);
    const nodes = collect(parseProseMarkdown(original));
    expect(nodes.some(node => node.type === "code" && node.value?.includes("id: vis07-curva"))).toBe(true);
    expect(nodes.some(node => node.type === "text" && node.value?.includes("El párrafo no debe desaparecer."))).toBe(true);
    const block = result.children[0];
    expect(original.slice(block.range.start.offset, block.range.end.offset)).toBe(plot.replace(/\n/g, newline));
  });

  it("protege dólares literales en código cercado y en código en línea", () => {
    const original = [
      "Texto con `$$` y `$x^2$` literales.", "",
      fence + "text", "$$", "\\frac{1}{2} $$",
      "$x^2$", fence, "", plot,
    ].join("\n");
    const nodes = collect(parseProseMarkdown(original));
    expect(nodes.filter(node => node.type === "math")).toHaveLength(0);
    expect(nodes.filter(node => node.type === "inlineMath")).toHaveLength(0);
    expect(nodes.some(node => node.type === "inlineCode" && node.value === "$$")).toBe(true);
    expect(nodes.some(node => node.type === "code" && node.value?.includes("\\frac{1}{2} $$"))).toBe(true);
    expect(parseMathMD(original).children).toHaveLength(1);
  });

  it("solo normaliza la cadena para Remark; el source de .bwjm queda intacto", () => {
    const original = ["$$", "\\frac{1}{2} $$", "", plot].join("\n");
    const normalized = prepareRemarkMath(original);
    expect(normalized.text).toContain("\\frac{1}{2} \n$$");
    expect(normalized.text).not.toBe(original);
    const originalPlotOffset = original.indexOf(plot);
    const normalizedPlotOffset = normalized.text.indexOf(plot);
    expect(normalized.toOriginalOffset(normalizedPlotOffset)).toBe(originalPlotOffset);
    expect(parseMathMD(original).source).toBe(original);
  });
});
