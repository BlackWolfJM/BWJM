import { describe, expect, it } from "vitest";
import {
  analyzeMathMD,
  buildGithubExport,
  createPreviewUpdate,
  isAutoPreviewDocument,
  isBwjmDocument,
  isPreviewReadyMessage,
  isSupportedMathMDLanguage,
  segmentMathMDDocument,
} from "../src/services.js";

describe("VS Code extension services", () => {
  it("projects parser errors into editor-friendly diagnostics", () => {
    const analysis = analyzeMathMD("# Demo\n\n```plot2d\nequation: ''\n```\n");

    expect(analysis.hasMathMD).toBe(true);
    expect(analysis.diagnostics).toEqual([
      expect.objectContaining({
        severity: "error",
        code: "MATHMD_SCHEMA_INVALID",
        startLine: 3,
        startColumn: 1,
      }),
    ]);
  });

  it("creates a serializable preview update without interpreting HTML", () => {
    const source = "# <img src=x onerror=alert(1)>\n\n```plot2d\nequation: x^2\n```\n";

    const update = createPreviewUpdate(source, "file:///article.md");

    expect(update).toEqual({ type: "update", source, documentUri: "file:///article.md" });
    expect(() => JSON.stringify(update)).not.toThrow();
  });

  it("accepts only the expected webview readiness message", () => {
    expect(isPreviewReadyMessage({ type: "ready" })).toBe(true);
    expect(isPreviewReadyMessage({ type: "ready", source: "untrusted" })).toBe(true);
    expect(isPreviewReadyMessage({ type: "update" })).toBe(false);
    expect(isPreviewReadyMessage(null)).toBe(false);
  });

  it("creates deterministic GitHub assets through the existing exporter", () => {
    const source = "```plot2d\nequation: x^2\nx: [-2, 2]\n```\n";

    const first = buildGithubExport(source, "article.md");
    const second = buildGithubExport(source, "article.md");

    expect(first).toEqual(second);
    expect(first.assets.map((asset) => asset.path)).toEqual(["mathmd-2d.svg"]);
    expect(first.assets[0]?.content).toContain("<polyline");
  });

  it("identifies supported MathMD languages and auto-preview .bwjm/.jm files", () => {
    expect(isSupportedMathMDLanguage("bwjm")).toBe(true);
    expect(isSupportedMathMDLanguage("markdown")).toBe(true);
    expect(isSupportedMathMDLanguage("plaintext", "clase.bwjm")).toBe(true);
    expect(isSupportedMathMDLanguage("plaintext", "apuntes.JM")).toBe(true);
    expect(isSupportedMathMDLanguage("plaintext", "readme.md")).toBe(true);
    expect(isSupportedMathMDLanguage("typescript", "index.ts")).toBe(false);

    expect(isAutoPreviewDocument("bwjm")).toBe(true);
    expect(isAutoPreviewDocument("markdown", "calculo.bwjm")).toBe(true);
    expect(isAutoPreviewDocument("markdown", "calculo.jm")).toBe(true);
    expect(isAutoPreviewDocument("markdown", "README.md")).toBe(false);

    expect(isBwjmDocument("bwjm")).toBe(true);
    expect(isBwjmDocument(undefined, "demo.bwjm")).toBe(true);
    expect(isBwjmDocument(undefined, "calculo.JM")).toBe(true);
    expect(isBwjmDocument(undefined, "documento.pdf")).toBe(false);
    expect(isBwjmDocument("markdown", "README.md")).toBe(false);
  });

  it("segments a mixed .bwjm document preserving prose, LaTeX, and MathMD block order", () => {
    const source = [
      "# Superficie Interactiva",
      "",
      "Sea la función:",
      "",
      "$$",
      "z = a x^2 + y^2",
      "$$",
      "",
      "```slider",
      "name: a",
      "min: 0",
      "max: 4",
      "step: 0.1",
      "default: 1",
      "```",
      "",
      "Gráfica 2D asociada con `$f(x) = a x^2$`: ",
      "",
      "```plot2d",
      "equation: a*x^2",
      "x: [-5, 5]",
      "```",
      "",
    ].join("\n");

    const { segments, document } = segmentMathMDDocument(source);

    expect(document.diagnostics).toHaveLength(0);
    expect(segments.map((segment) => segment.kind)).toEqual([
      "prose",
      "mathmd",
      "prose",
      "mathmd",
    ]);
    expect(segments[0]).toEqual({
      kind: "prose",
      content: "# Superficie Interactiva\n\nSea la función:\n\n$$\nz = a x^2 + y^2\n$$",
    });
    expect(segments[1]?.kind === "mathmd" && segments[1].node.type).toBe("slider");
    expect(segments[2]).toEqual({
      kind: "prose",
      content: "Gráfica 2D asociada con `$f(x) = a x^2$`:",
    });
    expect(segments[3]?.kind === "mathmd" && segments[3].node.type).toBe("plot2d");
  });

  it("excludes invalid MathMD blocks from prose without breaking valid blocks", () => {
    const source = [
      "# Documento con error aislado",
      "",
      "```plot2d",
      "equation: ''",
      "```",
      "",
      "Texto intermedio.",
      "",
      "```plot2d",
      "equation: x^2",
      "x: [-2, 2]",
      "```",
      "",
    ].join("\n");

    const { segments, document } = segmentMathMDDocument(source);

    expect(document.diagnostics).toHaveLength(1);
    expect(segments.map((segment) => segment.kind)).toEqual(["prose", "prose", "mathmd"]);
    expect(segments[0]).toEqual({ kind: "prose", content: "# Documento con error aislado" });
    expect(segments[1]).toEqual({ kind: "prose", content: "Texto intermedio." });
    expect(segments[2]?.kind === "mathmd" && segments[2].node.type).toBe("plot2d");
  });

  it("preserves untrusted HTML literally inside prose segments", () => {
    const source = "# Título\n\n<script>alert(1)</script>\n\n```plot2d\nequation: x\n```\n";

    const { segments } = segmentMathMDDocument(source);

    expect(segments[0]).toEqual({
      kind: "prose",
      content: "# Título\n\n<script>alert(1)</script>",
    });
  });
});
