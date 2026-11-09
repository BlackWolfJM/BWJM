import { compileExpression, evaluateExpression } from "./mathEngine.js";
import { computeKinematics } from "./vectorCalculus.js";

export function sampleParametric2D(
  spec: { x: string; y: string; domain: [number, number]; samples: number },
  currentT: number,
  scope: Readonly<Record<string, number>> = {},
) {
  if (!Number.isInteger(spec.samples) || spec.samples < 2 || spec.samples > 500) {
    throw new Error("Parametric sampling must be between 2 and 500");
  }
  const fx = compileExpression(spec.x), fy = compileExpression(spec.y);
  const points: number[][] = [];
  for (let i = 0; i < spec.samples; i++) {
    const t = spec.domain[0] + i / (spec.samples - 1) * (spec.domain[1] - spec.domain[0]);
    let x = NaN, y = NaN;
    try { x = evaluateExpression(fx, { ...scope, t }); y = evaluateExpression(fy, { ...scope, t }); }
    catch { /* skip points outside the real domain */ }
    if (Number.isFinite(x) && Number.isFinite(y)) points.push([x, y]);
  }
  const kinematics = computeKinematics({ x: spec.x, y: spec.y, z: "0" }, currentT, { ...scope, t: currentT });
  return { points, kinematics };
}
