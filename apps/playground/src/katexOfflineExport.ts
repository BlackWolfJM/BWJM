/**
 * Vite generates the CSS and matching WOFF2 assets from the same installed
 * KaTeX package at build time. Dynamic import keeps the export-only font data
 * out of the initial editor bundle.
 */
export function assertOfflineKaTeXCss(css: string): void {
  if (!css.includes("@font-face") || !css.includes("KaTeX_Main") ||
      !css.includes("data:font/woff2;base64,")) {
    throw new Error("No se pudieron integrar las fuentes matemáticas de KaTeX.");
  }
  for (const match of css.matchAll(/url\(\s*([^)]*?)\s*\)/gi)) {
    const target = match[1].trim().replace(/^["']|["']$/g, "");
    if (!target.startsWith("data:")) {
      throw new Error("El CSS matemático aún necesita recursos externos.");
    }
  }
}

export async function loadOfflineKaTeXCss(): Promise<string> {
  const { default: css } = await import("virtual:bwjm-katex-offline-css");
  assertOfflineKaTeXCss(css);
  return css;
}
