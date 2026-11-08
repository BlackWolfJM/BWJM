import { compileExpression, evaluateExpression } from "./mathEngine.js";

export interface IntersectionPoint {
  x: number;
  y: number;
}

export interface RiemannRectangle {
  x0: number;
  x1: number;
  yBottom: number;
  yTop: number;
  height: number;
  area: number;
}

export interface RiemannPartitionResult {
  deltaX: number;
  rectangles: RiemannRectangle[];
  riemannSum: number;
  exactArea: number;
  error: number;
}

export interface ExactAreaResult {
  value: number;
  exactFraction?: string;
  isBounded: boolean;
}

function refineRoot(
  diffFn: (x: number) => number,
  xLeft: number,
  xRight: number,
  maxIterations = 50,
  tolerance = 1e-7,
): number {
  let a = xLeft;
  let b = xRight;
  let fa = diffFn(a);
  let fb = diffFn(b);

  if (Math.abs(fa) < tolerance) return a;
  if (Math.abs(fb) < tolerance) return b;

  for (let i = 0; i < maxIterations; i++) {
    const mid = (a + b) / 2;
    const fmid = diffFn(mid);

    if (Math.abs(fmid) < tolerance || (b - a) / 2 < tolerance) {
      return mid;
    }

    if (Math.sign(fmid) === Math.sign(fa)) {
      a = mid;
      fa = fmid;
    } else {
      b = mid;
      fb = fmid;
    }
  }

  return (a + b) / 2;
}

export function findIntersections(
  fExpr: string,
  gExpr: string,
  domain: [number, number],
  scope: Readonly<Record<string, number>> = {},
): IntersectionPoint[] {
  const fCompiled = compileExpression(fExpr);
  const gCompiled = compileExpression(gExpr);

  const diff = (x: number) => {
    const yf = evaluateExpression(fCompiled, { ...scope, x });
    const yg = evaluateExpression(gCompiled, { ...scope, x });
    return yf - yg;
  };

  const [xMin, xMax] = domain;
  const samples = 250;
  const step = (xMax - xMin) / samples;
  const roots: number[] = [];

  let prevX = xMin;
  let prevDiff = diff(prevX);

  if (Math.abs(prevDiff) < 1e-7) {
    roots.push(prevX);
  }

  for (let i = 1; i <= samples; i++) {
    const currX = xMin + i * step;
    const currDiff = diff(currX);

    if (Math.abs(currDiff) < 1e-7) {
      if (roots.length === 0 || Math.abs(roots[roots.length - 1] - currX) > 1e-4) {
        roots.push(currX);
      }
    } else if (Math.sign(prevDiff) !== Math.sign(currDiff)) {
      const refined = refineRoot(diff, prevX, currX);
      if (roots.length === 0 || Math.abs(roots[roots.length - 1] - refined) > 1e-4) {
        roots.push(refined);
      }
    }

    prevX = currX;
    prevDiff = currDiff;
  }

  return roots.map((rootX) => {
    const yVal = evaluateExpression(fCompiled, { ...scope, x: rootX });
    return {
      x: Number(rootX.toFixed(6)),
      y: Number(yVal.toFixed(6)),
    };
  });
}

function approximateFraction(val: number): string | undefined {
  const knownFractions: Array<[number, string]> = [
    [1 / 6, "1/6"],
    [1 / 3, "1/3"],
    [1 / 2, "1/2"],
    [2 / 3, "2/3"],
    [5 / 6, "5/6"],
    [1 / 4, "1/4"],
    [3 / 4, "3/4"],
    [1 / 5, "1/5"],
    [2 / 5, "2/5"],
    [3 / 5, "3/5"],
    [4 / 5, "4/5"],
    [1 / 12, "1/12"],
    [5 / 12, "5/12"],
    [7 / 12, "7/12"],
    [11 / 12, "11/12"],
    [2 / 15, "2/15"],
    [4 / 15, "4/15"],
  ];

  for (const [numeric, fractionStr] of knownFractions) {
    if (Math.abs(val - numeric) < 1e-5) {
      return fractionStr;
    }
  }
  return undefined;
}

export function computeExactArea(
  fExpr: string,
  gExpr: string,
  interval: [number, number],
  scope: Readonly<Record<string, number>> = {},
): ExactAreaResult {
  const fCompiled = compileExpression(fExpr);
  const gCompiled = compileExpression(gExpr);

  const [a, b] = interval;
  const n = 600; // Simpson's 1/3 rule with 600 intervals
  const h = (b - a) / n;

  const heightAt = (x: number) => {
    const yf = evaluateExpression(fCompiled, { ...scope, x });
    const yg = evaluateExpression(gCompiled, { ...scope, x });
    return Math.abs(yf - yg);
  };

  let sum = heightAt(a) + heightAt(b);

  for (let i = 1; i < n; i++) {
    const x = a + i * h;
    const factor = i % 2 === 0 ? 2 : 4;
    sum += factor * heightAt(x);
  }

  const areaValue = (h / 3) * sum;
  const exactFraction = approximateFraction(areaValue);

  return {
    value: Number(areaValue.toFixed(8)),
    exactFraction,
    isBounded: Number.isFinite(areaValue),
  };
}

export function computeRiemannPartition(
  fExpr: string,
  gExpr: string,
  interval: [number, number],
  n: number,
  method: "left" | "right" | "midpoint" = "midpoint",
  scope: Readonly<Record<string, number>> = {},
): RiemannPartitionResult {
  const [a, b] = interval;
  const deltaX = (b - a) / n;
  const rectangles: RiemannRectangle[] = [];
  let riemannSum = 0;

  const fCompiled = compileExpression(fExpr);
  const gCompiled = compileExpression(gExpr);

  for (let i = 0; i < n; i++) {
    const x0 = a + i * deltaX;
    const x1 = x0 + deltaX;

    let xSample = x0;
    if (method === "midpoint") {
      xSample = (x0 + x1) / 2;
    } else if (method === "right") {
      xSample = x1;
    }

    const yf = evaluateExpression(fCompiled, { ...scope, x: xSample });
    const yg = evaluateExpression(gCompiled, { ...scope, x: xSample });

    const yBottom = Math.min(yf, yg);
    const yTop = Math.max(yf, yg);
    const height = yTop - yBottom;
    const area = height * deltaX;

    rectangles.push({
      x0: Number(x0.toFixed(6)),
      x1: Number(x1.toFixed(6)),
      yBottom: Number(yBottom.toFixed(6)),
      yTop: Number(yTop.toFixed(6)),
      height: Number(height.toFixed(6)),
      area: Number(area.toFixed(6)),
    });

    riemannSum += area;
  }

  const exact = computeExactArea(fExpr, gExpr, interval, scope);
  const error = Math.abs(riemannSum - exact.value);

  return {
    deltaX: Number(deltaX.toFixed(6)),
    rectangles,
    riemannSum: Number(riemannSum.toFixed(6)),
    exactArea: exact.value,
    error: Number(error.toFixed(6)),
  };
}

