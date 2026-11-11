import { describe, expect, it } from "vitest";
import { parseMathMD, parseProseMarkdown } from "@mathmd/parser";
import { updateGraphOption } from "../src/graphOptionSource.js";
import {
  insertDisplayMath, insertInlineMath, DISPLAY_MATH_TEMPLATES,
} from "../src/formulaInsertion.js";

describe("VIS-07: botones matemáticos de la cinta", () => {
  it.each(["equation", "matrix", "integral"] as const)(
    "%s inserta un bloque $$ valido en un documento vacío", action => {
      const result = insertDisplayMath("", 0, 0, action);
      expect(result.text).toBe("$$\n" + DISPLAY_MATH_TEMPLATES[action] + "\n$$\n");
      expect(result.text).toMatch(/^\$\$\n[\s\S]+\n\$\$\n$/);
      const nodes = parseProseMarkdown(result.text);
      expect(nodes.children?.[0]?.type).toBe("math");
      expect(nodes.children?.[0]?.value).toBe(DISPLAY_MATH_TEMPLATES[action]);
    }
  );

  it("Matriz conserva exactamente dos barras invertidas reales entre filas", () => {
    const snippet = DISPLAY_MATH_TEMPLATES.matrix;
    expect(snippet).toBe("\\begin{bmatrix}\na & b \\\\\nc & d\n\\end{bmatrix}");
    expect(snippet.split("\n")[1]).toBe("a & b " + "\\".repeat(2));
    expect(snippet).toContain("\\end{bmatrix}");
  });

  it("Integral conserva limites superior/inferior, función y diferencial", () => {
    const snippet = DISPLAY_MATH_TEMPLATES.integral;
    expect(snippet).toBe("\\int_{a}^{b} f(x)\\,dx");
  });

  it.each(["equation", "matrix", "integral"] as const)(
    "%s al final de párrafo separa matemáticas sin transformar el párrafo en fórmula", action => {
      const source = "Párrafo previo";
      const result = insertDisplayMath(source, source.length, source.length, action);
      expect(result.text.startsWith(source + "\n\n$$\n")).toBe(true);
      expect(parseProseMarkdown(result.text).children?.map(node => node.type))
        .toEqual(["paragraph", "math"]);
      expect(result.text).toContain("\n$$\n");
      expect(result.selectionEnd).toBeGreaterThan(result.selectionStart);
    }
  );

  it.each(["equation", "matrix", "integral"] as const)(
    "%s conserva el texto anterior/posterior y la palabra seleccionada", action => {
      const source = "Antes palabra después";
      const start = source.indexOf("palabra");
      const result = insertDisplayMath(source, start, start + "palabra".length, action);
      expect(result.text).toBe("Antes \n\n$$\npalabra\n$$\n\n después");
      expect(result.text.slice(result.selectionStart, result.selectionEnd)).toBe("palabra");
      expect(parseProseMarkdown(result.text).children?.map(node => node.type))
        .toEqual(["paragraph", "math", "paragraph"]);
      expect(parseMathMD(result.text).source).toBe(result.text);
    }
  );

  it("Personalizar gráfica escribe solo en el bloque correcto tras $ al final del TeX", () => {
    const fence = String.fromCharCode(96).repeat(3);
    const source = [
      "# Antes", "", "$", "\\frac{1}{2} $", "",
      "Párrafo intacto.", "",
      fence + "parametric2d", "id: vis07-ajustes", "x: cos(t)",
      "y: sin(t)", "tDomain: [0, 6.28]", fence, "",
      "Texto final.",
    ].join("\n");
    const graph = parseMathMD(source).children[0];
    expect(graph?.type).toBe("parametric2d");
    const fenced = source.slice(graph.range.start.offset, graph.range.end.offset);
    expect(fenced.startsWith(fence + "parametric2d")).toBe(true);
    expect(fenced.endsWith(fence)).toBe(true);
    const updated = updateGraphOption(source, graph.range, "parametric2d", "showVelocity", true);
    expect(updated).toContain("showVelocity: true");
    expect(updated.startsWith("# Antes\n\n$\n\\frac{1}{2} $\n\nPárrafo intacto.")).toBe(true);
    expect(updated.endsWith("Texto final.")).toBe(true);
    expect(parseMathMD(updated).children).toHaveLength(1);
  });

  it("Fórmula en línea encierra la selección y mantiene lo que hay alrededor", () => {
    const source = "Antes x^2 después";
    const start = source.indexOf("x^2");
    const result = insertInlineMath(source, start, start + 3);
    expect(result.text).toBe("Antes $x^2$ después");
    expect(result.text.slice(result.selectionStart, result.selectionEnd)).toBe("x^2");
    expect(parseProseMarkdown(result.text).children?.[0]?.children?.some(node =>
      node.type === "inlineMath" && node.value === "x^2")).toBe(true);
  });
});
