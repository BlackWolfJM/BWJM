import { parse } from "mathjs";
import { compileExpression } from "./mathEngine.js";

/** Convert validated mathjs notation to TeX for KaTeX/MathJax. */
export function expressionToLatex(expression: string): string {
  try {
    compileExpression(expression); // reuse the safe mathematical expression allow-list
    return parse(expression).toTex();
  } catch {
    // Return conservative escaped text if a mathematical expression cannot be parsed.
    return String.raw`\\text{${expression.replace(/\\/g, "").replace(/[{}%&#_$]/g, " ").slice(0, 100)}}`;
  }
}
