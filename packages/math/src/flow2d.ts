import { compileExpression, evaluateExpression } from "./mathEngine.js";
import { integrateFieldLine } from "./vectorCalculus.js";

/** Deterministic streamline integration; bounded to prevent huge browser workloads. */
export function sampleFlow2D(
  field: [string, string],
  seeds: Array<[number, number]>,
  tMax: number,
  stepSize: number,
  scope: Readonly<Record<string, number>> = {},
  xDomain: [number, number] = [-3, 3],
  yDomain: [number, number] = [-3, 3],
) {
  if (seeds.length < 1 || seeds.length > 12 || !(stepSize >= 0.01 && stepSize <= 1) ||
    !(tMax > 0 && tMax <= 20)) throw new Error("Flow scene is outside supported bounds");
  const P = compileExpression(field[0]), Q = compileExpression(field[1]);
  const vectors: Array<{ position: [number, number]; vector: [number, number] }> = [];
  const samples = 11;
  for (let row = 0; row < samples; row++) for (let col = 0; col < samples; col++) {
    const x = xDomain[0] + (xDomain[1] - xDomain[0]) * col / (samples - 1);
    const y = yDomain[0] + (yDomain[1] - yDomain[0]) * row / (samples - 1);
    try {
      const fx = evaluateExpression(P, { ...scope, x, y });
      const fy = evaluateExpression(Q, { ...scope, x, y });
      if (Number.isFinite(fx) && Number.isFinite(fy)) vectors.push({ position: [x, y], vector: [fx, fy] });
    } catch { /* non-finite sample */ }
  }
  const flowlines = seeds.map(seed => {
    const result = integrateFieldLine({
      field: { P: field[0], Q: field[1] },
      startPoint: seed, tMax, stepSize, maxSteps: 2000, scope,
    });
    return result.points.map(p => [p.x, p.y]);
  });
  return { flowlines, vectors };
}
