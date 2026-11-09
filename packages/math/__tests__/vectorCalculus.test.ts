import { describe, expect, it } from "vitest";
import {
  computeGreensTheorem,
  computeKinematics,
  computeKinematicsSeries,
  computeLineIntegral,
  integrateFieldLine,
  sampleParametricTrajectory,
  sampleVectorField2D,
} from "../src/vectorCalculus.js";

describe("Cálculo Vectorial: Cinemática, Curvas y Campos (200 Funcionalidades BWJM)", () => {
  it("calcula cinemática en parábola r(t)=(t, t^2) en t=2 (Q01)", () => {
    const res = computeKinematics({ x: "t", y: "t^2" }, 2);

    expect(res.position.x).toBeCloseTo(2, 3);
    expect(res.position.y).toBeCloseTo(4, 3);
    expect(res.velocity.x).toBeCloseTo(1, 3);
    expect(res.velocity.y).toBeCloseTo(4, 3);
    expect(res.acceleration.x).toBeCloseTo(0, 3);
    expect(res.acceleration.y).toBeCloseTo(2, 3);
    expect(res.isStationary).toBe(false);
  });

  it("verifica circunferencia uniforme r(t)=(cos(t), sin(t)) con velocidad ortogonal a posición (Q02)", () => {
    const res = computeKinematics({ x: "cos(t)", y: "sin(t)" }, 1.0);

    expect(res.speed).toBeCloseTo(1.0, 3);
    const vDotR = res.velocity.x * res.position.x + res.velocity.y * res.position.y;
    expect(vDotR).toBeCloseTo(0, 3);
    expect(res.curvature).toBeCloseTo(1.0, 3);
  });

  it("calcula triedro Frenet TNB, curvatura y torsión de la hélice espacial r(t)=(cos(t), sin(t), t/3) (Q04)", () => {
    const res = computeKinematics({ x: "cos(t)", y: "sin(t)", z: "t / 3" }, 0.5);

    expect(res.speed).toBeCloseTo(Math.sqrt(10) / 3, 3);
    expect(res.curvature).toBeCloseTo(9 / 10, 3);
    expect(res.torsion).toBeCloseTo(3 / 10, 3);

    const tDotN = res.tangent.x * res.normal.x + res.tangent.y * res.normal.y + res.tangent.z * res.normal.z;
    const tDotB = res.tangent.x * res.binormal.x + res.tangent.y * res.binormal.y + res.tangent.z * res.binormal.z;
    const nDotB = res.normal.x * res.binormal.x + res.normal.y * res.binormal.y + res.normal.z * res.binormal.z;

    expect(tDotN).toBeCloseTo(0, 3);
    expect(tDotB).toBeCloseTo(0, 3);
    expect(nDotB).toBeCloseTo(0, 3);
  });

  it("identifica punto estacionario en r(t)=(t^2, t^3) cuando t=0 (Q05)", () => {
    const res = computeKinematics({ x: "t^2", y: "t^3" }, 0);
    expect(res.isStationary).toBe(true);
    expect(res.speed).toBeCloseTo(0, 4);
  });

  it("calcula trabajo de línea en campo de circulación F=(y, -x) sobre circunferencia CCW (Q25)", () => {
    const lineRes = computeLineIntegral(
      { P: "y", Q: "-x" },
      { x: "cos(t)", y: "sin(t)" },
      [0, 2 * Math.PI]
    );

    expect(lineRes.work).toBeCloseTo(-2 * Math.PI, 2);
    expect(lineRes.curveLength).toBeCloseTo(2 * Math.PI, 2);
  });

  it("evalúa campo conservativo F=(2x, 2y) con rotacional nulo (Q26)", () => {
    const fieldRes = sampleVectorField2D({ P: "2 * x", Q: "2 * y" }, [-2, 2], [-2, 2], 5);

    expect(fieldRes.isConservativeEstimate).toBe(true);
    expect(fieldRes.curlAt(1, 1)).toBeCloseTo(0, 3);
    expect(fieldRes.divergenceAt(1, 1)).toBeCloseTo(4, 3);
  });

  it("verifica Teorema de Green con P=-y/2 y Q=x/2 sobre circunferencia CCW (Q28)", () => {
    const greenRes = computeLineIntegral(
      { P: "-y / 2", Q: "x / 2" },
      { x: "cos(t)", y: "sin(t)" },
      [0, 2 * Math.PI]
    );

    expect(greenRes.work).toBeCloseTo(Math.PI, 2);
  });

  it("genera puntos de trayectoria 3D continua para visualizadores WebGL y Plotly", () => {
    const traj = sampleParametricTrajectory({ x: "cos(t)", y: "sin(t)", z: "t" }, [0, 6.28], 20);

    expect(traj.length).toBe(20);
    expect(traj[0].x).toBeCloseTo(1, 3);
    expect(traj[0].y).toBeCloseTo(0, 3);
  });

  it("verifica torsión nula en curva plana r(t)=(cos(t), sin(t), 0)", () => {
    const res = computeKinematics({ x: "cos(t)", y: "sin(t)", z: "0" }, 1.5);
    expect(res.torsion).toBeCloseTo(0, 3);
    expect(res.curvature).toBeCloseTo(1, 3);
  });

  it("verifica inversión de signo del trabajo según orientación antihoraria y horaria", () => {
    const ccw = computeLineIntegral(
      { P: "-y", Q: "x" },
      { x: "cos(t)", y: "sin(t)" },
      [0, 2 * Math.PI]
    );
    const cw = computeLineIntegral(
      { P: "-y", Q: "x" },
      { x: "cos(t)", y: "sin(t)" },
      [2 * Math.PI, 0]
    );

    expect(ccw.work).toBeCloseTo(2 * Math.PI, 2);
    expect(cw.work).toBeCloseTo(-2 * Math.PI, 2);
  });

  it("calcula serie temporal continua de cinemática con computeKinematicsSeries", () => {
    const series = computeKinematicsSeries({ x: "cos(t)", y: "sin(t)", z: "t" }, [0, Math.PI], 10);
    expect(series.t.length).toBe(10);
    expect(series.position.length).toBe(10);
    expect(series.curvature.length).toBe(10);
    expect(series.speed[0]).toBeCloseTo(Math.SQRT2, 2);
  });

  it("integra líneas de corriente con algoritmo RK4 en integrateFieldLine", () => {
    const res = integrateFieldLine({
      field: { P: "-y", Q: "x" },
      startPoint: [1, 0],
      tMax: Math.PI / 2,
      stepSize: 0.05,
    });

    expect(res.points.length).toBeGreaterThan(10);
    const lastPoint = res.points[res.points.length - 1];
    expect(lastPoint.x).toBeCloseTo(0, 1);
    expect(lastPoint.y).toBeCloseTo(1, 1);
  });

  it("verifica equivalencia numérica integral de línea vs doble integral con computeGreensTheorem", () => {
    const res = computeGreensTheorem({
      field: { P: "-y", Q: "x" },
      boundaryCurve: { x: "cos(t)", y: "sin(t)" },
      domain: [0, 2 * Math.PI],
      region: { type: "disk", center: [0, 0], radius: 1 },
      steps: 400,
    });

    expect(res.lineIntegral).toBeCloseTo(2 * Math.PI, 2);
    expect(res.doubleIntegral).toBeCloseTo(2 * Math.PI, 1);
    expect(res.relativeError).toBeLessThan(0.05);
  });
});

