import { compileExpression, evaluateExpression } from "./mathEngine.js";

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface Vector2D {
  x: number;
  y: number;
}

export interface CurveParametric {
  x: string;
  y: string;
  z?: string;
}

export interface KinematicsResult {
  t: number;
  position: Vector3D;
  velocity: Vector3D;
  speed: number;
  acceleration: Vector3D;
  tangentialAcceleration: number;
  normalAcceleration: number;
  tangent: Vector3D;
  normal: Vector3D;
  binormal: Vector3D;
  curvature: number;
  torsion: number;
  osculatingRadius: number;
  isStationary: boolean;
}

export interface VectorFieldPoint2D {
  x: number;
  y: number;
  fx: number;
  fy: number;
  magnitude: number;
}

export interface VectorFieldAnalysis2D {
  points: VectorFieldPoint2D[];
  divergenceAt: (x: number, y: number) => number;
  curlAt: (x: number, y: number) => number;
  isConservativeEstimate: boolean;
}

export interface LineIntegralResult {
  work: number;
  curveLength: number;
  circulationDensityAverage: number;
}

function evaluateVector(
  compiled: { x: (s: Record<string, number>) => number; y: (s: Record<string, number>) => number; z?: (s: Record<string, number>) => number },
  scope: Record<string, number>
): Vector3D {
  return {
    x: compiled.x(scope),
    y: compiled.y(scope),
    z: compiled.z ? compiled.z(scope) : 0,
  };
}

export function computeKinematics(
  curve: CurveParametric,
  t: number,
  scope: Record<string, number> = {}
): KinematicsResult {
  const compX = compileExpression(curve.x);
  const compY = compileExpression(curve.y);
  const compZ = curve.z ? compileExpression(curve.z) : undefined;

  const fnX = (s: Record<string, number>) => evaluateExpression(compX, s);
  const fnY = (s: Record<string, number>) => evaluateExpression(compY, s);
  const fnZ = compZ ? (s: Record<string, number>) => evaluateExpression(compZ, s) : undefined;

  const compiled = { x: fnX, y: fnY, z: fnZ };

  const h = 1e-4;
  const h3 = 1e-3;

  const r = evaluateVector(compiled, { ...scope, t });
  const rPlus = evaluateVector(compiled, { ...scope, t: t + h });
  const rMinus = evaluateVector(compiled, { ...scope, t: t - h });

  const r3Plus2 = evaluateVector(compiled, { ...scope, t: t + 2 * h3 });
  const r3Plus = evaluateVector(compiled, { ...scope, t: t + h3 });
  const r3Minus = evaluateVector(compiled, { ...scope, t: t - h3 });
  const r3Minus2 = evaluateVector(compiled, { ...scope, t: t - 2 * h3 });

  const vx = (rPlus.x - rMinus.x) / (2 * h);
  const vy = (rPlus.y - rMinus.y) / (2 * h);
  const vz = (rPlus.z - rMinus.z) / (2 * h);

  const speed = Math.sqrt(vx * vx + vy * vy + vz * vz);
  const isStationary = speed < 1e-7;

  const ax = (rPlus.x - 2 * r.x + rMinus.x) / (h * h);
  const ay = (rPlus.y - 2 * r.y + rMinus.y) / (h * h);
  const az = (rPlus.z - 2 * r.z + rMinus.z) / (h * h);

  const r3x = (r3Plus2.x - 2 * r3Plus.x + 2 * r3Minus.x - r3Minus2.x) / (2 * h3 * h3 * h3);
  const r3y = (r3Plus2.y - 2 * r3Plus.y + 2 * r3Minus.y - r3Minus2.y) / (2 * h3 * h3 * h3);
  const r3z = (r3Plus2.z - 2 * r3Plus.z + 2 * r3Minus.z - r3Minus2.z) / (2 * h3 * h3 * h3);

  const cx = vy * az - vz * ay;
  const cy = vz * ax - vx * az;
  const cz = vx * ay - vy * ax;
  const crossMag = Math.sqrt(cx * cx + cy * cy + cz * cz);

  const curvature = isStationary ? 0 : crossMag / Math.pow(speed, 3);
  const crossSq = crossMag * crossMag;
  const torsion = crossSq < 1e-9 ? 0 : (cx * r3x + cy * r3y + cz * r3z) / crossSq;

  const osculatingRadius = curvature > 1e-7 ? 1 / curvature : Infinity;

  const vDotA = vx * ax + vy * ay + vz * az;
  const aT = isStationary ? 0 : vDotA / speed;
  const aMagSq = ax * ax + ay * ay + az * az;
  const aN = Math.sqrt(Math.max(0, aMagSq - aT * aT));

  let tx = 0, ty = 0, tz = 0;
  let bx = 0, by = 0, bz = 0;
  let nx = 0, ny = 0, nz = 0;

  if (!isStationary) {
    tx = vx / speed;
    ty = vy / speed;
    tz = vz / speed;

    if (crossMag > 1e-7) {
      bx = cx / crossMag;
      by = cy / crossMag;
      bz = cz / crossMag;

      nx = by * tz - bz * ty;
      ny = bz * tx - bx * tz;
      nz = bx * ty - by * tx;
    } else {
      if (Math.abs(tz) < 0.9) {
        nx = -ty;
        ny = tx;
        nz = 0;
      } else {
        nx = 1;
        ny = 0;
        nz = 0;
      }
      const nMag = Math.sqrt(nx * nx + ny * ny + nz * nz);
      nx /= nMag;
      ny /= nMag;
      nz /= nMag;

      bx = ty * nz - tz * ny;
      by = tz * nx - tx * nz;
      bz = tx * ny - ty * nx;
    }
  }

  return {
    t,
    position: { x: Number(r.x.toFixed(6)), y: Number(r.y.toFixed(6)), z: Number(r.z.toFixed(6)) },
    velocity: { x: Number(vx.toFixed(6)), y: Number(vy.toFixed(6)), z: Number(vz.toFixed(6)) },
    speed: Number(speed.toFixed(6)),
    acceleration: { x: Number(ax.toFixed(6)), y: Number(ay.toFixed(6)), z: Number(az.toFixed(6)) },
    tangentialAcceleration: Number(aT.toFixed(6)),
    normalAcceleration: Number(aN.toFixed(6)),
    tangent: { x: Number(tx.toFixed(6)), y: Number(ty.toFixed(6)), z: Number(tz.toFixed(6)) },
    normal: { x: Number(nx.toFixed(6)), y: Number(ny.toFixed(6)), z: Number(nz.toFixed(6)) },
    binormal: { x: Number(bx.toFixed(6)), y: Number(by.toFixed(6)), z: Number(bz.toFixed(6)) },
    curvature: Number(curvature.toFixed(6)),
    torsion: Number(torsion.toFixed(6)),
    osculatingRadius: Number(osculatingRadius.toFixed(6)),
    isStationary,
  };
}

export function sampleParametricTrajectory(
  curve: CurveParametric,
  domain: [number, number],
  samples: number = 100,
  scope: Record<string, number> = {}
): Vector3D[] {
  const compX = compileExpression(curve.x);
  const compY = compileExpression(curve.y);
  const compZ = curve.z ? compileExpression(curve.z) : undefined;

  const [tMin, tMax] = domain;
  const count = Math.max(2, samples);
  const step = (tMax - tMin) / (count - 1);

  const points: Vector3D[] = [];

  for (let i = 0; i < count; i++) {
    const t = tMin + i * step;
    const s = { ...scope, t };
    const x = evaluateExpression(compX, s);
    const y = evaluateExpression(compY, s);
    const z = compZ ? evaluateExpression(compZ, s) : 0;
    points.push({
      x: Number(x.toFixed(6)),
      y: Number(y.toFixed(6)),
      z: Number(z.toFixed(6)),
    });
  }

  return points;
}

export function sampleVectorField2D(
  field: { P: string; Q: string },
  xDomain: [number, number],
  yDomain: [number, number],
  density: number = 15,
  scope: Record<string, number> = {}
): VectorFieldAnalysis2D {
  const compP = compileExpression(field.P);
  const compQ = compileExpression(field.Q);

  const [xMin, xMax] = xDomain;
  const [yMin, yMax] = yDomain;
  const cols = Math.max(2, density);
  const rows = Math.max(2, density);

  const dx = (xMax - xMin) / (cols - 1);
  const dy = (yMax - yMin) / (rows - 1);

  const points: VectorFieldPoint2D[] = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = xMin + c * dx;
      const y = yMin + r * dy;
      const s = { ...scope, x, y };

      const fx = evaluateExpression(compP, s);
      const fy = evaluateExpression(compQ, s);
      const mag = Math.sqrt(fx * fx + fy * fy);

      points.push({
        x: Number(x.toFixed(4)),
        y: Number(y.toFixed(4)),
        fx: Number(fx.toFixed(6)),
        fy: Number(fy.toFixed(6)),
        magnitude: Number(mag.toFixed(6)),
      });
    }
  }

  const h = 1e-4;

  const divergenceAt = (x: number, y: number): number => {
    const pRight = evaluateExpression(compP, { ...scope, x: x + h, y });
    const pLeft = evaluateExpression(compP, { ...scope, x: x - h, y });
    const qUp = evaluateExpression(compQ, { ...scope, x, y: y + h });
    const qDown = evaluateExpression(compQ, { ...scope, x, y: y - h });

    const dPdx = (pRight - pLeft) / (2 * h);
    const dQdy = (qUp - qDown) / (2 * h);
    return Number((dPdx + dQdy).toFixed(6));
  };

  const curlAt = (x: number, y: number): number => {
    const qRight = evaluateExpression(compQ, { ...scope, x: x + h, y });
    const qLeft = evaluateExpression(compQ, { ...scope, x: x - h, y });
    const pUp = evaluateExpression(compP, { ...scope, x, y: y + h });
    const pDown = evaluateExpression(compP, { ...scope, x, y: y - h });

    const dQdx = (qRight - qLeft) / (2 * h);
    const dPdy = (pUp - pDown) / (2 * h);
    return Number((dQdx - dPdy).toFixed(6));
  };

  let maxCurl = 0;
  for (let i = 0; i < Math.min(25, points.length); i++) {
    const pt = points[i];
    const cVal = Math.abs(curlAt(pt.x, pt.y));
    if (cVal > maxCurl) maxCurl = cVal;
  }

  return {
    points,
    divergenceAt,
    curlAt,
    isConservativeEstimate: maxCurl < 1e-3,
  };
}

export function computeLineIntegral(
  field: { P: string; Q: string; R?: string },
  curve: CurveParametric,
  domain: [number, number],
  steps: number = 200,
  scope: Record<string, number> = {}
): LineIntegralResult {
  const compP = compileExpression(field.P);
  const compQ = compileExpression(field.Q);
  const compR = field.R ? compileExpression(field.R) : undefined;

  const compX = compileExpression(curve.x);
  const compY = compileExpression(curve.y);
  const compZ = curve.z ? compileExpression(curve.z) : undefined;

  const [tMin, tMax] = domain;
  const dt = (tMax - tMin) / steps;

  let totalWork = 0;
  let totalLength = 0;

  for (let i = 0; i < steps; i++) {
    const t = tMin + (i + 0.5) * dt;

    const s = { ...scope, t };
    const x = evaluateExpression(compX, s);
    const y = evaluateExpression(compY, s);
    const z = compZ ? evaluateExpression(compZ, s) : 0;

    const h = 1e-5;
    const sPlus = { ...scope, t: t + h };
    const sMinus = { ...scope, t: t - h };

    const dx = (evaluateExpression(compX, sPlus) - evaluateExpression(compX, sMinus)) / (2 * h);
    const dy = (evaluateExpression(compY, sPlus) - evaluateExpression(compY, sMinus)) / (2 * h);
    const dz = compZ
      ? (evaluateExpression(compZ, sPlus) - evaluateExpression(compZ, sMinus)) / (2 * h)
      : 0;

    const sField = { ...scope, x, y, z };
    const fx = evaluateExpression(compP, sField);
    const fy = evaluateExpression(compQ, sField);
    const fz = compR ? evaluateExpression(compR, sField) : 0;

    const ds = Math.sqrt(dx * dx + dy * dy + dz * dz) * dt;
    const dWork = (fx * dx + fy * dy + fz * dz) * dt;

    totalWork += dWork;
    totalLength += ds;
  }

  return {
    work: Number(totalWork.toFixed(6)),
    curveLength: Number(totalLength.toFixed(6)),
    circulationDensityAverage: totalLength > 0 ? Number((totalWork / totalLength).toFixed(6)) : 0,
  };
}
