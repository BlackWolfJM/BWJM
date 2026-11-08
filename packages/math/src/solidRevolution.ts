import { compileExpression, evaluateExpression } from "./mathEngine.js";

export interface RevolutionVolumeResult {
  volume: number;
  effectiveAngularCoverage: number;
  angularSweepTraveled: number;
  exactFractionOfPi?: string;
  isFullTurn: boolean;
}

export interface CrossSectionResult {
  slicePos: number;
  outerRadius: number;
  innerRadius: number;
  washerArea: number;
}

export interface RevolutionMeshResult {
  x: number[][];
  y: number[][];
  z: number[][];
  sweepAngle: number;
}

function approximateFractionOfPi(integralValue: number): string | undefined {
  const knownFractions: Array<[number, string]> = [
    [2 / 15, "2/15"],
    [1 / 3, "1/3"],
    [2 / 3, "2/3"],
    [1 / 2, "1/2"],
    [1 / 4, "1/4"],
    [3 / 4, "3/4"],
    [1 / 5, "1/5"],
    [2 / 5, "2/5"],
    [3 / 5, "3/5"],
    [4 / 5, "4/5"],
    [1 / 6, "1/6"],
    [5 / 6, "5/6"],
    [1 / 7, "1/7"],
    [1 / 8, "1/8"],
    [3 / 8, "3/8"],
    [5 / 8, "5/8"],
    [7 / 8, "7/8"],
  ];

  for (const [numeric, fractionStr] of knownFractions) {
    if (Math.abs(integralValue - numeric) < 1e-4) {
      return fractionStr;
    }
  }
  return undefined;
}

export function computeRevolutionVolume(
  fExpr: string,
  gExpr: string,
  interval: [number, number],
  _axis: "x" | "y" = "x",
  angleAlpha = 2 * Math.PI,
  scope: Readonly<Record<string, number>> = {},
): RevolutionVolumeResult {
  const fCompiled = compileExpression(fExpr);
  const gCompiled = compileExpression(gExpr);

  const [a, b] = interval;
  const n = 600;
  const h = (b - a) / n;

  const integrandAt = (x: number) => {
    const yf = evaluateExpression(fCompiled, { ...scope, x });
    const yg = evaluateExpression(gCompiled, { ...scope, x });
    return Math.abs(yf * yf - yg * yg);
  };

  let sum = integrandAt(a) + integrandAt(b);
  for (let i = 1; i < n; i++) {
    const x = a + i * h;
    const factor = i % 2 === 0 ? 2 : 4;
    sum += factor * integrandAt(x);
  }

  const rawIntegral = (h / 3) * sum;
  const exactFraction = approximateFractionOfPi(rawIntegral);

  // Geometric Rule (Section 4): volume of union does not increase after 2*pi
  const effectiveAngle = Math.min(angleAlpha, 2 * Math.PI);
  const volume = (effectiveAngle / 2) * rawIntegral;

  return {
    volume: Number(volume.toFixed(8)),
    effectiveAngularCoverage: effectiveAngle,
    angularSweepTraveled: angleAlpha,
    exactFractionOfPi: exactFraction,
    isFullTurn: angleAlpha >= 2 * Math.PI,
  };
}

export function computeCrossSection(
  fExpr: string,
  gExpr: string,
  slicePos: number,
  scope: Readonly<Record<string, number>> = {},
): CrossSectionResult {
  const fCompiled = compileExpression(fExpr);
  const gCompiled = compileExpression(gExpr);

  const yf = Math.abs(evaluateExpression(fCompiled, { ...scope, x: slicePos }));
  const yg = Math.abs(evaluateExpression(gCompiled, { ...scope, x: slicePos }));

  const outerRadius = Math.max(yf, yg);
  const innerRadius = Math.min(yf, yg);
  const washerArea = Math.PI * (outerRadius * outerRadius - innerRadius * innerRadius);

  return {
    slicePos,
    outerRadius: Number(outerRadius.toFixed(6)),
    innerRadius: Number(innerRadius.toFixed(6)),
    washerArea: Number(washerArea.toFixed(6)),
  };
}

export function sampleRevolutionMesh(
  fExpr: string,
  gExpr: string,
  interval: [number, number],
  angleAlpha = 2 * Math.PI,
  axis: "x" | "y" = "x",
  samplesX = 25,
  samplesTheta = 25,
  scope: Readonly<Record<string, number>> = {},
): RevolutionMeshResult {
  const fCompiled = compileExpression(fExpr);
  const gCompiled = compileExpression(gExpr);

  const [xMin, xMax] = interval;
  const xValues: number[][] = [];
  const yValues: number[][] = [];
  const zValues: number[][] = [];

  for (let i = 0; i < samplesTheta; i++) {
    const theta = (i / (samplesTheta - 1)) * angleAlpha;
    const xRow: number[] = [];
    const yRow: number[] = [];
    const zRow: number[] = [];

    for (let j = 0; j < samplesX; j++) {
      const x = xMin + (j / (samplesX - 1)) * (xMax - xMin);
      const yf = Math.abs(evaluateExpression(fCompiled, { ...scope, x }));
      const yg = Math.abs(evaluateExpression(gCompiled, { ...scope, x }));
      const r = Math.max(yf, yg);

      if (axis === "x") {
        xRow.push(Number(x.toFixed(4)));
        yRow.push(Number((r * Math.cos(theta)).toFixed(4)));
        zRow.push(Number((r * Math.sin(theta)).toFixed(4)));
      } else {
        // axis y
        xRow.push(Number((r * Math.cos(theta)).toFixed(4)));
        yRow.push(Number(x.toFixed(4)));
        zRow.push(Number((r * Math.sin(theta)).toFixed(4)));
      }
    }

    xValues.push(xRow);
    yValues.push(yRow);
    zValues.push(zRow);
  }

  return {
    x: xValues,
    y: yValues,
    z: zValues,
    sweepAngle: angleAlpha,
  };
}
