import { parse } from "mathjs";
import { compileExpression } from "./mathEngine.js";

/** Converts a validated mathjs expression to KaTeX-friendly TeX. */
export function expressionToLatex(expression: string): string {
  try {
    compileExpression(expression);
    return parse(expression).toTex();
  } catch {
    const safe = expression.replace(/\\/g, "").replace(/[{}%&#_$]/g, " ").slice(0, 100);
    return "\\text{" + safe + "}";
  }
}
