import { describe, expect, it } from "vitest";
import { collectMarkdownDefinitions, parseMathMD, parseProseMarkdown } from "@mathmd/parser";

const fence = String.fromCharCode(96).repeat(3);
const mixed = [
  "# Prueba VIS-06",
  "",
  "Texto anterior con **negrita**, $x^2$ y [un enlace](https://github.com/BlackWolfJM/BWJM-WEB-).",
  "",
  "![Diagrama de prueba](./prueba-vis06.png)",
  "",
  "*Figura 1. Diagrama junto a una fórmula y una gráfica.*",
  "",
  "$$x^2+1$$",
  "",
  "| Variable | Valor |",
  "| --- | ---: |",
  "| x | 2 |",
  "| y | 4 |",
  "",
  "- Primer elemento",
  "  - Elemento anidado",
  "",
  "1. Primer paso",
  "2. Segundo paso",
  "",
  "---",
  "",
  "![Diagrama ausente](./imagen-ausente-vis06.png)",
  "",
  "$$",
  "\\frac{1}{2}",
  "$$",
  "",
  fence + "plot2d",
  "id: vis06-curva",
  "equation: x^2",
  "domain: [-2, 2]",
  fence,
  "",
  "Texto posterior a la gráfica.",
  "",
  fence + "text",
  "![Esto es código literal](./prueba-vis06.png)",
  "$$x^2$$",
  "---",
  fence,
].join("\n");

interface TreeNode {
  type: string;
  value?: string;
  url?: string;
  alt?: string;
  children?: TreeNode[];
}
const nodes = (root: TreeNode): TreeNode[] =>
  [root, ...(root.children ?? []).flatMap(nodes)];

describe("VIS-06: Markdown reader parse regressions", () => {
  it("recognizes GFM images, tables, nested and ordered lists, separators, links and math", () => {
    const doc = parseMathMD(mixed);
    expect(doc.children.filter(node => node.type === "plot2d")).toHaveLength(1);
    const tree = parseProseMarkdown(mixed);
    const all = nodes(tree);
    expect(all.some(node => node.type === "image" && node.alt === "Diagrama de prueba")).toBe(true);
    expect(all.some(node => node.type === "image" && node.alt === "Diagrama ausente")).toBe(true);
    expect(all.some(node => node.type === "table")).toBe(true);
    expect(all.filter(node => node.type === "list")).toHaveLength(3);
    expect(all.some(node => node.type === "thematicBreak")).toBe(true);
    expect(all.some(node => node.type === "link" && node.url?.startsWith("https://github.com/"))).toBe(true);
    expect(all.some(node => node.type === "inlineMath" && node.value === "x^2")).toBe(true);
    expect(all.some(node => node.type === "math" && node.value?.includes("\\frac{1}{2}"))).toBe(true);
  });

  it("keeps fenced code literal instead of turning its image, math and rule into nodes", () => {
    const all = nodes(parseProseMarkdown(mixed));
    const code = all.find(node => node.type === "code" && node.value?.includes("Esto es código literal"));
    expect(code?.value).toContain("![Esto es código literal]");
    expect(code?.value).toContain("$$x^2$$");
    expect(code?.value).toContain("---");
    expect(all.filter(node => node.type === "image")).toHaveLength(2);
    expect(all.filter(node => node.type === "thematicBreak")).toHaveLength(1);
  });

  it("resolves references when a scientific block separates usage from definition", () => {
    const source = [
      "![Figura][diagrama] y [documentación][doc]",
      "",
      fence + "plot2d",
      "id: entre-referencias",
      "equation: x^2",
      fence,
      "",
      "[diagrama]: ./prueba-vis06.png",
      "[doc]: https://example.com/docs",
    ].join("\n");
    const definitions = collectMarkdownDefinitions(source);
    const prose = parseProseMarkdown("![Figura][diagrama] y [documentación][doc]", definitions);
    expect(nodes(prose).some(node => node.type === "image" && node.url === "./prueba-vis06.png")).toBe(true);
    expect(nodes(prose).some(node => node.type === "link" && node.url === "https://example.com/docs")).toBe(true);
    expect(parseMathMD(source).children).toHaveLength(1);
  });

  it("isolates a ribbon separator from the previous paragraph (not Setext heading)", () => {
    const tree = parseProseMarkdown("Párrafo anterior\n\n---\n\nPárrafo posterior");
    expect(tree.children?.map(child => child.type)).toEqual([
      "paragraph", "thematicBreak", "paragraph",
    ]);
  });

  it("keeps ribbon image and table blocks separate from surrounding paragraphs", () => {
    const tree = parseProseMarkdown(
      "Texto anterior\n\n![Descripción](./prueba-vis06.png)\n\n" +
      "| A | B |\n|---|---|\n| 1 | 2 |\n\nTexto posterior"
    );
    expect(tree.children?.map(child => child.type)).toEqual([
      "paragraph", "paragraph", "table", "paragraph",
    ]);
  });

  it("retains malformed scientific node diagnostics next to its source", () => {
    const source = "Antes\n\n" + fence + "plot2d\nid: roto\nequation: [\n" + fence + "\n\nDespués";
    const parsed = parseMathMD(source);
    expect(parsed.diagnostics.some(diag => diag.blockType === "plot2d")).toBe(true);
    expect(parsed.diagnostics.some(diag => diag.range?.start.offset === source.indexOf(fence))).toBe(true);
  });
});
