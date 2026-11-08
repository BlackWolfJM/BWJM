import { compileExpression, evaluateExpression } from "./mathEngine.js";

export type RevolutionAxis =
  | "x"
  | "y"
  | `y = ${number}`
  | `y=${number}`
  | `x = ${number}`
  | `x=${number}`
  | { orientation: "x" | "y"; offset: number };

export interface RevolutionVolumeResult {
  volume: number;
  effectiveAngularCoverage: number;
  angularSweepTraveled: number;
  rationalGuessOfPi?: string;
  method: "simpson" | "shells";
  numericVolume: number;
  isFullTurn: boolean;
  crossesAxis?: boolean;
  warning?: string;
}

export interface CrossSectionResult {
  slicePos: number;
  outerRadius: number;
  innerRadius: number;
  washerArea: number;
  crossesAxis?: boolean;
}

export interface RevolutionMeshResult {
  x: number[][];
  y: number[][];
  z: number[][];
  sweepAngle: number;
}

interface ParsedAxis {
  orientation: "x" | "y";
  offset: number;
}

function parseAxis(axis: RevolutionAxis): ParsedAxis {
  if (axis === "x") return { orientation: "x", offset: 0 };
  if (axis === "y") return { orientation: "y", offset: 0 };
  if (typeof axis === "object" && axis !== null) {
    return { orientation: axis.orientation, offset: axis.offset };
  }
  const str = String(axis).trim().replace(/\s+/g, "");
  if (str.startsWith("y=")) {
    const num = parseFloat(str.slice(2));
    return { orientation: "x", offset: isNaN(num) ? 0 : num };
  }
  if (str.startsWith("x=")) {
    const num = parseFloat(str.slice(2));
    return { orientation: "y", offset: isNaN(num) ? 0 : num };
  }
  return { orientation: "x", offset: 0 };
}

function approximateFractionOfPi(volumeValue: number): string | undefined {
  const ratio = volumeValue / Math.PI;
  if (!Number.isFinite(ratio) || ratio <= 0) return undefined;

  for (let q = 1; q <= 60; q++) {
    const p = Math.round(ratio * q);
    if (Math.abs(ratio - p / q) < 1e-4) {
      return q === 1 ? String(p) : `${p}/${q}`;
    }
  }
  return undefined;
}

export function computeRevolutionVolume(
  fExpr: string,
  gExpr: string,
  interval: [number, number],
  axis: RevolutionAxis = "x",
  angleAlpha = 2 * Math.PI,
  scope: Readonly<Record<string, number>> = {},
): RevolutionVolumeResult {
  const parsedAxis = parseAxis(axis);
  const fCompiled = compileExpression(fExpr);
  const gCompiled = compileExpression(gExpr);

  const [a, b] = interval;
  const n = 600;
  const h = (b - a) / n;
  let crossesAxis = false;

  const isVertical = parsedAxis.orientation === "y";
  const effectiveAngle = Math.min(angleAlpha, 2 * Math.PI);

  const integrandAt = (x: number) => {
    const yf = evaluateExpression(fCompiled, { ...scope, x });
    const yg = evaluateExpression(gCompiled, { ...scope, x });

    if (isVertical) {
      // Método de cascarones para eje vertical x = offset
      const radius = Math.abs(x - parsedAxis.offset);
      const height = Math.abs(yf - yg);
      return radius * height;
    }

    const distF = Math.abs(yf - parsedAxis.offset);
    const distG = Math.abs(yg - parsedAxis.offset);

    const minVal = Math.min(yf, yg);
    const maxVal = Math.max(yf, yg);
    const axisBetween = parsedAxis.offset > minVal && parsedAxis.offset < maxVal;
    if (axisBetween) {
      crossesAxis = true;
    }

    if (axisBetween) {
      // Región contiene el eje: disco sólido, radio interior 0
      return Math.max(distF * distF, distG * distG);
    }
    return Math.abs(distF * distF - distG * distG);
  };

  let sum = integrandAt(a) + integrandAt(b);
  for (let i = 1; i < n; i++) {
    const x = a + i * h;
    const factor = i % 2 === 0 ? 2 : 4;
    sum += factor * integrandAt(x);
  }

  const rawIntegral = (h / 3) * sum;
  const volume = isVertical
    ? effectiveAngle * rawIntegral
    : (effectiveAngle / 2) * rawIntegral;

  const rationalGuess = approximateFractionOfPi(volume);

  const warnings: string[] = [];
  if (crossesAxis) {
    warnings.push("La región cruza el eje de revolución. El radio interior se fija a 0 y se usa disco sólido.");
  }
  if (angleAlpha > 2 * Math.PI) {
    warnings.push(`Ángulo solicitado ${angleAlpha} rad > 2π. Se limita la cobertura efectiva a 2π para evitar solapamiento de volumen.`);
  }
  if (angleAlpha > 0 && angleAlpha < 2 * Math.PI && crossesAxis) {
    warnings.push("Giro parcial con región que cruza el eje puede generar solapamiento; resultados interpretados bajo supuesto de barrido sin solapamiento.");
  }

  return {
    volume: Number(volume.toFixed(8)),
    numericVolume: Number(volume.toFixed(8)),
    effectiveAngularCoverage: effectiveAngle,
    angularSweepTraveled: angleAlpha,
    rationalGuessOfPi: rationalGuess,
    method: isVertical ? "shells" : "simpson",
    isFullTurn: angleAlpha >= 2 * Math.PI,
    crossesAxis,
    warning: warnings.length ? warnings.join(" ") : undefined,
  };
}

export function computeCrossSection(
  fExpr: string,
  gExpr: string,
  slicePos: number,
  axis: RevolutionAxis = "x",
  scope: Readonly<Record<string, number>> = {},
): CrossSectionResult {
  const parsedAxis = parseAxis(axis);
  const fCompiled = compileExpression(fExpr);
  const gCompiled = compileExpression(gExpr);

  const yf = evaluateExpression(fCompiled, { ...scope, x: slicePos });
  const yg = evaluateExpression(gCompiled, { ...scope, x: slicePos });

  const distF = Math.abs(yf - parsedAxis.offset);
  const distG = Math.abs(yg - parsedAxis.offset);

  const minVal = Math.min(yf, yg);
  const maxVal = Math.max(yf, yg);
  const crossesAxis = parsedAxis.offset > minVal && parsedAxis.offset < maxVal;

  const outerRadius = Math.max(distF, distG);
  const innerRadius = crossesAxis ? 0 : Math.min(distF, distG);
  const washerArea = Math.PI * (outerRadius * outerRadius - innerRadius * innerRadius);

  return {
    slicePos,
    outerRadius: Number(outerRadius.toFixed(6)),
    innerRadius: Number(innerRadius.toFixed(6)),
    washerArea: Number(washerArea.toFixed(6)),
    crossesAxis,
  };
}

export function sampleRevolutionMesh(
  fExpr: string,
  gExpr: string,
  interval: [number, number],
  angleAlpha = 2 * Math.PI,
  axis: RevolutionAxis = "x",
  samplesX = 25,
  samplesTheta = 25,
  scope: Readonly<Record<string, number>> = {},
): RevolutionMeshResult {
  const parsedAxis = parseAxis(axis);
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
      const yf = evaluateExpression(fCompiled, { ...scope, x });
      const yg = evaluateExpression(gCompiled, { ...scope, x });
      const r = Math.max(
        Math.abs(yf - parsedAxis.offset),
        Math.abs(yg - parsedAxis.offset),
      );

      if (parsedAxis.orientation === "x") {
        xRow.push(Number(x.toFixed(4)));
        yRow.push(Number((parsedAxis.offset + r * Math.cos(theta)).toFixed(4)));
        zRow.push(Number((r * Math.sin(theta)).toFixed(4)));
      } else {
        xRow.push(Number((parsedAxis.offset + r * Math.cos(theta)).toFixed(4)));
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
