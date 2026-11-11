import katex from "katex";

/**
 * One math renderer for the reader, scientific graph headers and the formula
 * dialog. The KaTeX module is bundled by Vite, never loaded from a CDN.
 */
export interface RenderedMath {
  html: string;
  valid: boolean;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderMath(tex: string, displayMode: boolean): RenderedMath {
  try {
    return {
      html: katex.renderToString(tex, {
        displayMode,
        throwOnError: true,
        trust: false,
        output: "htmlAndMathml",
      }),
      valid: true,
    };
  } catch {
    // Never "simplify" the TeX by deleting its backslashes. This is safe
    // text content; a syntax error must not hide the rest of the document.
    return {
      html: '<span class="bwjm-math-invalid" role="status">' +
        '<span class="bwjm-math-error">No se pudo interpretar la fórmula.</span> ' +
        '<code class="bwjm-math-source">' + escapeHtml(tex) + "</code></span>",
      valid: false,
    };
  }
}
