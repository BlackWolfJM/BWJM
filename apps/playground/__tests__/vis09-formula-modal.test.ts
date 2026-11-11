import { describe, expect, it, vi } from "vitest";
import {
  buildFinalFormulaTex,
  evaluateFormula,
  insertFormulaSnippet,
  serializeFormula,
} from "../src/formulaDraft.js";
import type { FormulaDraft, FormulaRenderer } from "../src/formulaDraft.js";

const draft = (latex: string, mode: FormulaDraft["mode"] = "numbered", label = "7"): FormulaDraft =>
  ({ latex, mode, label });

function renderer() {
  const renderToString = vi.fn((tex: string, options: {
    displayMode: boolean; throwOnError: true; trust: false;
  }) => {
    // Mimic KaTeX's strict validation of the final assembled TeX.
    let depth = 0;
    for (const char of tex) {
      if (char === "{") depth++;
      if (char === "}" && --depth < 0) throw new Error("unexpected closing brace");
    }
    if (!tex || depth !== 0) throw new Error("unbalanced TeX");
    return '<span class="katex"><span class="katex-mathml">' +
      tex + "</span></span>";
  });
  return { renderToString } satisfies FormulaRenderer;
}

describe("VIS-09: exact preview and serialized formula", () => {
  it("previews the actual numbered TeX and updates tag 7 to 8 before insertion", () => {
    const katex = renderer();
    const seven = evaluateFormula(draft("x^2", "numbered", "7"), katex);
    expect(seven.valid).toBe(true);
    expect(seven.tex).toBe("x^2 \\tag{7}");
    expect(seven.previewHtml).toContain("\\tag{7}");
    expect(seven.source).toBe("\n$$\nx^2 \\tag{7}\n$$\n");
    expect(katex.renderToString).toHaveBeenCalledWith("x^2 \\tag{7}", {
      displayMode: true, throwOnError: true, trust: false,
    });

    const eight = evaluateFormula(draft("x^2", "numbered", "8"), katex);
    expect(eight.tex).toBe("x^2 \\tag{8}");
    expect(eight.previewHtml).toContain("\\tag{8}");
    expect(eight.source).not.toContain("\\tag{7}");
    expect(eight.source).toContain("\\tag{8}");
  });

  it("defaults a blank or spaces-only label to 1 and preserves A.2", () => {
    expect(buildFinalFormulaTex(draft("x^2", "numbered", "   ")).tex).toBe("x^2 \\tag{1}");
    expect(buildFinalFormulaTex(draft("x^2", "numbered", "A.2")).tex).toBe("x^2 \\tag{A.2}");
  });

  it("respects an existing \\tag instead of appending a second tag", () => {
    const katex = renderer();
    const evaluated = evaluateFormula(draft("x^2 \\tag{A.2}", "numbered", "9"), katex);
    expect(evaluated.valid).toBe(true);
    expect(evaluated.existingTag).toBe(true);
    expect(evaluated.tex).toBe("x^2 \\tag{A.2}");
    expect(evaluated.source.match(/\\tag\s*\{/g)).toHaveLength(1);
    expect(evaluated.previewHtml).toContain("\\tag{A.2}");
    expect(evaluated.source).not.toContain("\\tag{9}");
  });

  it("serializes inline and block modes without appending a tag", () => {
    expect(evaluateFormula(draft(" x^2 ", "inline"), renderer()).source).toBe("$x^2$");
    expect(evaluateFormula(draft(" x^2 ", "block"), renderer()).source).toBe("\n$$\nx^2\n$$\n");
    expect(serializeFormula("a+b", "numbered")).toBe("\n$$\na+b\n$$\n");
    expect(evaluateFormula(draft("x^2", "inline"), renderer()).previewHtml).toContain("x^2");
  });

  it("rejects empty input and absent renderer without claiming validity", () => {
    const katex = renderer();
    expect(evaluateFormula(draft("   "), katex).status).toBe("empty");
    expect(evaluateFormula(draft("   "), katex).valid).toBe(false);
    expect(evaluateFormula(draft("x^2"), null).status).toBe("unavailable");
    expect(evaluateFormula(draft("x^2"), null).valid).toBe(false);
    expect(katex.renderToString).not.toHaveBeenCalled();
  });

  it("revalidates invalid TeX and invalid final labels against the rendered TeX", () => {
    const katex = renderer();
    const incorrect = evaluateFormula(draft("\\frac{"), katex);
    expect(incorrect.valid).toBe(false);
    expect(incorrect.status).toBe("invalid");

    const invalidNumber = evaluateFormula(draft("x^2", "numbered", "{"), katex);
    expect(invalidNumber.tex).toBe("x^2 \\tag{{}");
    expect(invalidNumber.valid).toBe(false);
    expect(invalidNumber.status).toBe("invalid");

    const corrected = evaluateFormula(draft("x^2", "numbered", "8"), katex);
    expect(corrected.valid).toBe(true);
    expect(corrected.source).toContain("\\tag{8}");
  });
});

describe("VIS-09: palette placement and caret", () => {
  it("inserts a Greek control word between letters without creating \\pib", () => {
    const insertion = insertFormulaSnippet("ab", 1, 1, "\\pi");
    expect(insertion).toEqual({ latex: "a\\pi b", cursor: 5 });
    expect(insertion.latex).not.toContain("\\pib");
  });

  it("inserts at start, middle and end, preserving the surrounding text", () => {
    expect(insertFormulaSnippet("ab", 0, 0, "\\pi")).toEqual({
      latex: "\\pi ab", cursor: 4,
    });
    expect(insertFormulaSnippet("ab", 2, 2, "\\pi")).toEqual({
      latex: "ab\\pi", cursor: 5,
    });
    expect(insertFormulaSnippet("a+b", 1, 1, "\\sqrt{x}")).toEqual({
      latex: "a\\sqrt{x}+b", cursor: 9,
    });
  });

  it("replaces only the selected span and places the caret at the end", () => {
    expect(insertFormulaSnippet("antesMIDdespués", 5, 8, "\\alpha")).toEqual({
      latex: "antes\\alpha después", cursor: 12,
    });
    expect(insertFormulaSnippet("x+old+y", 2, 5, "\\frac{a}{b}")).toEqual({
      latex: "x+\\frac{a}{b}+y", cursor: 13,
    });
  });

  it("does not add an unnecessary separator before punctuation or spaces", () => {
    expect(insertFormulaSnippet("a+b", 1, 1, "\\pi").latex).toBe("a\\pi+b");
    expect(insertFormulaSnippet("a b", 1, 1, "\\pi").latex).toBe("a\\pi b");
    expect(insertFormulaSnippet("ab", 1, 1, "\\sqrt{x}").latex).toBe("a\\sqrt{x}b");
  });

  it("rejects invalid text selection ranges", () => {
    expect(() => insertFormulaSnippet("x", -1, 0, "\\pi")).toThrow();
    expect(() => insertFormulaSnippet("x", 1, 0, "\\pi")).toThrow();
    expect(() => insertFormulaSnippet("x", 0, 3, "\\pi")).toThrow();
  });
});
