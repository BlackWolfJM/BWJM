import { describe, expect, it } from "vitest";
import { renderMath } from "../src/mathRenderer.js";
import { assertOfflineKaTeXCss } from "../src/katexOfflineExport.js";

describe("VIS-08 local KaTeX rendering", () => {
  it("returns accessible HTML and MathML for inline root, fractions and matrix", () => {
    const root = renderMath("\\sqrt{x^2+1}", false);
    expect(root.valid).toBe(true);
    expect(root.html).toContain("katex-mathml");
    expect(root.html).toContain("<msqrt>");
    const fraction = renderMath("\\frac{1}{1+\\frac{1}{2}}", true);
    expect(fraction.valid).toBe(true);
    expect(fraction.html).toContain("<mfrac>");
    expect(fraction.html).toContain("katex-display");
    const matrix = renderMath("\\begin{bmatrix}1 & 2 \\\\ 3 & 4\\end{bmatrix}", true);
    expect(matrix.valid).toBe(true);
    expect(matrix.html).toContain("<mtable>");
  });

  it("preserves invalid TeX with all backslashes, escaping unsafe content", () => {
    const bad = renderMath("\\frac{1}{", true);
    expect(bad.valid).toBe(false);
    expect(bad.html).toContain("No se pudo interpretar la fórmula");
    expect(bad.html).toContain("\\frac{1}{");
    const malicious = renderMath("\\notACommand{<img src=x onerror=alert(1)>}", false);
    expect(malicious.valid).toBe(false);
    expect(malicious.html).not.toContain("<img");
    expect(malicious.html).toContain("&lt;img");
  });

  it("never permits executable links, including LaTeX href macros", () => {
    const output = renderMath("\\href{javascript:alert(1)}{no}", false);
    expect(output.html).not.toContain('href="javascript:');
  });

  it("checks offline CSS for font embeds and rejects remote or site paths", () => {
    const css = '@font-face{font-family:KaTeX_Main;src:url("data:font/woff2;base64,AAAA") format("woff2");}';
    expect(() => assertOfflineKaTeXCss(css)).not.toThrow();
    expect(() => assertOfflineKaTeXCss(
      css.replace("data:font/woff2;base64,AAAA", "/BWJM-WEB-/assets/KaTeX_Main.woff2"),
    )).toThrow();
    expect(() => assertOfflineKaTeXCss(css + "url(https://cdn.jsdelivr.net/font.woff2)")).toThrow();
    expect(() => assertOfflineKaTeXCss("body{color:red}")).toThrow();
  });
});
