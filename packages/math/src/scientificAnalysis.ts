import { compileExpression, evaluateExpression } from "./mathEngine.js";

export interface ScientificSummary {
  count: number;
  min: number;
  max: number;
  sum: number;
  mean: number;
  median: number;
  variance: number;
  standardDeviation: number;
  q1: number;
  q3: number;
}

export interface RegressionResult {
  slope: number;
  intercept: number;
  r2: number;
  correlation: number;
}

export function generateFunctionTable(
  spec: { variable: string; domain: [number, number]; samples: number; expressions: string[]; columns: string[] },
  scope: Readonly<Record<string, number>> = {},
): { columns: string[]; rows: Array<Array<number | null>> } {
  const { variable, domain, samples, expressions, columns } = spec;
  if (samples < 2 || samples > 500 || columns.length !== expressions.length + 1) {
    throw new Error("Invalid function table specification");
  }
  const compiled = expressions.map(compileExpression);
  const rows: Array<Array<number | null>> = [];
  for (let i = 0; i < samples; i++) {
    const t = domain[0] + (i / (samples - 1)) * (domain[1] - domain[0]);
    const row: Array<number | null> = [t];
    compiled.forEach(expr => {
      let value = NaN;
      try { value = evaluateExpression(expr, { ...scope, [variable]: t }); } catch { value = NaN; }
      row.push(Number.isFinite(value) ? value : null);
    });
    rows.push(row);
  }
  return { columns: [...columns], rows };
}

function quantile(sorted: readonly number[], portion: number): number {
  const position = (sorted.length - 1) * portion;
  const lower = Math.floor(position);
  const upper = Math.min(lower + 1, sorted.length - 1);
  return sorted[lower] + (position - lower) * (sorted[upper] - sorted[lower]);
}

export function summarizeColumn(values: readonly number[]): ScientificSummary | null {
  const filtered = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (filtered.length === 0) return null;
  const n = filtered.length;
  const sum = filtered.reduce((total, value) => total + value, 0);
  const mean = sum / n;
  const variance = n === 1 ? 0 : filtered.reduce((acc, value) => acc + (value - mean) ** 2, 0) / (n - 1);
  return { count: n, min: filtered[0], max: filtered[n - 1], sum, mean,
    median: quantile(filtered, 0.5), variance, standardDeviation: Math.sqrt(variance),
    q1: quantile(filtered, 0.25), q3: quantile(filtered, 0.75) };
}

export function fitLinearRegression(x: readonly number[], y: readonly number[]): RegressionResult | null {
  if (x.length !== y.length || x.length < 2 || x.some(v => !Number.isFinite(v)) || y.some(v => !Number.isFinite(v))) return null;
  const n = x.length;
  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;
  let sxx = 0, syy = 0, sxy = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    sxx += dx * dx;
    syy += dy * dy;
    sxy += dx * dy;
  }
  if (sxx === 0) return null;
  const slope = sxy / sxx;
  const intercept = meanY - slope * meanX;
  const correlation = syy === 0 ? 0 : sxy / Math.sqrt(sxx * syy);
  return { slope, intercept, correlation, r2: syy === 0 ? 1 : correlation * correlation };
}
