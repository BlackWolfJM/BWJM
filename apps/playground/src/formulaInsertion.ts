/** VIS-07: tested source-level snippets for the three math ribbon buttons. */
export type DisplayMathAction = "equation" | "matrix" | "integral";

export const DISPLAY_MATH_TEMPLATES: Record<DisplayMathAction, string> = {
  equation: "\\int_0^1 f(x)\\,dx",
  matrix: "\\begin{bmatrix}\na & b \\\\\nc & d\n\\end{bmatrix}",
  integral: "\\int_{a}^{b} f(x)\\,dx",
};

export interface MathRibbonInsertion {
  text: string;
  selectionStart: number;
  selectionEnd: number;
}

export function insertDisplayMath(
  source: string,
  start: number,
  end: number,
  action: DisplayMathAction,
): MathRibbonInsertion {
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) ||
      start < 0 || end < start || end > source.length) {
    throw new Error("Rango de selección matemático inválido");
  }
  const before = source.slice(0, start);
  const selected = source.slice(start, end);
  const after = source.slice(end);
  const math = selected || DISPLAY_MATH_TEMPLATES[action];

  const leading = !before ? "" : before.endsWith("\n\n") ? "" : before.endsWith("\n") ? "\n" : "\n\n";
  const trailing = !after ? "\n" : after.startsWith("\n\n") ? "" : after.startsWith("\n") ? "\n" : "\n\n";
  const opening = leading + "$$\n";
  const closing = "\n$$" + trailing;
  const inserted = opening + math + closing;
  const selectionStart = before.length + opening.length;
  return {
    text: before + inserted + after,
    selectionStart,
    selectionEnd: selectionStart + math.length,
  };
}

export function insertInlineMath(source: string, start: number, end: number): MathRibbonInsertion {
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) ||
      start < 0 || end < start || end > source.length) {
    throw new Error("Rango de selección matemático inválido");
  }
  const selected = source.slice(start, end);
  return {
    text: source.slice(0, start) + "$" + selected + "$" + source.slice(end),
    selectionStart: start + 1,
    selectionEnd: start + 1 + selected.length,
  };
}
