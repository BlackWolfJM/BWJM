import { parse, compile, EvalFunction, MathNode } from "mathjs";

const MAX_EXPRESSION_LENGTH = 4096;

const ALLOWED_FUNCTIONS = new Set([
  "sin", "cos", "tan", "asin", "acos", "atan", "atan2",
  "sinh", "cosh", "tanh", "asinh", "acosh", "atanh",
  "sec", "csc", "cot", "asec", "acsc", "acot",
  "sqrt", "cbrt", "exp", "log", "log2", "log10", "ln",
  "abs", "sign", "round", "floor", "ceil", "fix",
  "min", "max", "mod", "pow", "norm", "hypot"
]);

const FORBIDDEN_SYMBOLS = new Set([
  "window", "document", "global", "globalThis", "process",
  "Function", "eval", "require", "module", "exports",
  "constructor", "prototype", "__proto__", "import"
]);

function assertExpressionIsSafe(expression: string): void {
  if (expression.length > MAX_EXPRESSION_LENGTH) {
    throw new Error(`Expression exceeds the maximum length of ${MAX_EXPRESSION_LENGTH} characters`);
  }
  let parsed: MathNode;
  try {
    parsed = parse(expression);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Syntax error in expression "${expression}": ${message}`);
  }

  parsed.traverse((node: any) => {
    if (node.type === "FunctionNode" || node.isFunctionNode) {
      const name = node.name;
      if (!ALLOWED_FUNCTIONS.has(name)) {
        throw new Error(`Function "${name}" is not permitted in MathMD documents`);
      }
    }
    if (node.type === "SymbolNode" || node.isSymbolNode) {
      const name = node.name;
      if (FORBIDDEN_SYMBOLS.has(name)) {
        throw new Error(`Symbol "${name}" is not permitted in MathMD documents`);
      }
    }
    if (node.type === "AccessorNode" || node.isAccessorNode) {
      throw new Error("Property accessor is not permitted in MathMD documents");
    }
  });
}

function assertSampleCount(name: string, value: number, maximum: number): void {
  if (!Number.isInteger(value) || value < 2 || value > maximum) {
    throw new Error(`${name} must be an integer between 2 and ${maximum}`);
  }
}

export function compileExpression(exprStr: string): EvalFunction {
  assertExpressionIsSafe(exprStr);
  try {
    return compile(exprStr);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to compile expression "${exprStr}": ${message}`);
  }
}

export function evaluateExpression(compiledExpr: EvalFunction, scope: Readonly<Record<string, number>> = {}): number {
  try {
    const result = compiledExpr.evaluate(scope);
    return Number(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to evaluate expression: ${message}`);
  }
}

/** Secure, AST-based free-parameter detection (never count function names as variables). */
export function extractFreeParameters(
  expressions: readonly string[], independent: readonly string[] = [],
): string[] {
  const excluded=new Set(
    ["x","y","z","t","r","theta","phi","pi","e","tau","i","infinity",
      "true","false",...independent]);
  const symbols=new Set<string>();
  for(const expr of expressions){
    if(!expr?.trim())continue;
    compileExpression(expr); // apply the same safety restrictions as the evaluator
    const tree=parse(expr);
    const functions=new Set<string>();
    tree.traverse((node:any)=>{
      if(node.isFunctionNode&&node.fn?.isSymbolNode) functions.add(node.fn.name);
    });
    tree.traverse((node:any)=>{
      if(!node.isSymbolNode)return;
      const name=String(node.name);
      if(!functions.has(name)&&!excluded.has(name)&&
        /^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) symbols.add(name);
    });
  }
  return [...symbols].sort().slice(0,8);
}

export function sample1D(
  exprStr: string, 
  xDomain: [number, number], 
  count: number = 100,
  scope: Readonly<Record<string, number>> = {}
): { x: number[]; y: number[] } {
  assertSampleCount("count", count, 10_000);
  const compiled = compileExpression(exprStr);
  const [xMin, xMax] = xDomain;
  const xValues: number[] = [];
  const yValues: number[] = [];
   
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const x = xMin + t * (xMax - xMin);
    const y = evaluateExpression(compiled, { ...scope, x });
    xValues.push(x);
    yValues.push(y);
  }
   
  return { x: xValues, y: yValues };
}

export function sampleSurface(
  exprStr: string, 
  xDomain: [number, number], 
  yDomain: [number, number], 
  xSamples: number = 50,
  ySamples: number = 50,
  scope: Readonly<Record<string, number>> = {}
): { 
  x: number[][]; 
  y: number[][]; 
  z: number[][] 
} {
  assertSampleCount("xSamples", xSamples, 200);
  assertSampleCount("ySamples", ySamples, 200);
  const compiled = compileExpression(exprStr);
  const [xMin, xMax] = xDomain;
  const [yMin, yMax] = yDomain;
   
  const xValues: number[][] = [];
  const yValues: number[][] = [];
  const zValues: number[][] = [];
   
  for (let i = 0; i < ySamples; i++) {
    const y = yMin + (i / (ySamples - 1)) * (yMax - yMin);
    const xRow: number[] = [];
    const yRow: number[] = [];
    const zRow: number[] = [];
    
    for (let j = 0; j < xSamples; j++) {
      const x = xMin + (j / (xSamples - 1)) * (xMax - xMin);
      const z = evaluateExpression(compiled, { ...scope, x, y });
      xRow.push(x);
      yRow.push(y);
      zRow.push(z);
    }
    
    xValues.push(xRow);
    yValues.push(yRow);
    zValues.push(zRow);
  }
   
  return { x: xValues, y: yValues, z: zValues };
}
