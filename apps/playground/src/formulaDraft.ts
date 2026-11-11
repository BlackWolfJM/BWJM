/**
 * VIS-09: pure formula-modal editing, preview and serialization.
 * No React, DOM or KaTeX import: uses the renderer already available on the
 * branch (VIS-08 will supply it locally without changing this contract).
 */
export type FormulaMode = "inline" | "block" | "numbered";

export interface FormulaDraft {
  latex: string;
  mode: FormulaMode;
  label: string;
}

export interface FormulaRenderer {
  renderToString(
    tex: string,
    options: { displayMode: boolean; throwOnError: true; trust: false },
  ): string;
}

export interface FormulaEvaluation {
  tex: string;
  source: string;
  previewHtml: string;
  valid: boolean;
  status: "valid" | "empty" | "unavailable" | "invalid";
  existingTag: boolean;
}

/** Respect a \tag already entered in the TeX rather than creating two tags. */
export function buildFinalFormulaTex(draft: FormulaDraft): { tex: string; existingTag: boolean } {
  const expression = draft.latex.trim();
  const existingTag = /\\tag\s*\{/.test(expression);
  if (draft.mode !== "numbered" || !expression || existingTag) {
    return { tex: expression, existingTag };
  }
  const label = draft.label.trim() || "1";
  return { tex: expression + " \\tag{" + label + "}", existingTag: false };
}

export function serializeFormula(tex: string, mode: FormulaMode): string {
  return mode === "inline" ? "$" + tex + "$" : "\n$$\n" + tex + "\n$$\n";
}

/**
 * Validation and preview are based on exactly the same TeX that is inserted.
 * The boolean is recomputed synchronously on every confirmation or shortcut;
 * no previously scheduled hasError/effect state is ever authoritative.
 */
export function evaluateFormula(
  draft: FormulaDraft,
  renderer: FormulaRenderer | null | undefined,
): FormulaEvaluation {
  const { tex, existingTag } = buildFinalFormulaTex(draft);
  const source = serializeFormula(tex, draft.mode);
  const base = { tex, source, existingTag };
  if (!draft.latex.trim()) {
    return { ...base, previewHtml: "", valid: false, status: "empty" };
  }
  if (!renderer) {
    return { ...base, previewHtml: "", valid: false, status: "unavailable" };
  }
  try {
    const html = renderer.renderToString(tex, {
      displayMode: draft.mode !== "inline",
      throwOnError: true,
      trust: false,
    });
    return { ...base, previewHtml: html, valid: true, status: "valid" };
  } catch {
    return { ...base, previewHtml: "", valid: false, status: "invalid" };
  }
}

export interface FormulaSnippetInsertion {
  latex: string;
  cursor: number;
}

/**
 * Insert a palette snippet at the caret or replace only the current selection.
 * Terminate a TeX control word when immediately followed by an ASCII letter:
 * inserting \pi into "ab" at position 1 must yield "a\pi b", not "\pib".
 */
export function insertFormulaSnippet(
  latex: string,
  start: number,
  end: number,
  snippet: string,
): FormulaSnippetInsertion {
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) ||
      start < 0 || end < start || end > latex.length) {
    throw new Error("La selección de la fórmula no es válida.");
  }
  const before = latex.slice(0, start);
  const after = latex.slice(end);
  const separator = /\\[A-Za-z]+$/.test(snippet) && /^[A-Za-z]/.test(after) ? " " : "";
  return {
    latex: before + snippet + separator + after,
    cursor: start + snippet.length + separator.length,
  };
}
