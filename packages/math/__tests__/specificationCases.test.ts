import { describe, expect, it } from "vitest";
import {
  compileExpression,
  evaluateExpression,
  findIntersections,
  computeExactArea,
  computePiecewiseArea,
  computeRevolutionVolume,
  computeCrossSection,
} from "../src/index.js";

describe("Casos de Prueba de la Especificación BWJM (Sección 15)", () => {
  it("Caso 1: f=x y g=x^2 calcula intersecciones (0,0), (1,1) y area exacta 1/6", () => {
    const intersections = findIntersections("x", "x^2", [-0.2, 1.5]);
    expect(intersections.length).toBeGreaterThanOrEqual(2);

    const p0 = intersections.find((pt) => Math.abs(pt.x) < 1e-4);
    const p1 = intersections.find((pt) => Math.abs(pt.x - 1) < 1e-4);

    expect(p0).toBeDefined();
    expect(p0?.y).toBeCloseTo(0, 4);
    expect(p1).toBeDefined();
    expect(p1?.y).toBeCloseTo(1, 4);

    const area = computeExactArea("x", "x^2", [0, 1]);
    expect(area.exactFraction).toBe("1/6");
    expect(area.value).toBeCloseTo(1 / 6, 4);
    expect(area.isBounded).toBe(true);
  });

  it("Caso 2: sustitucion automatica de g=x^2 por g=x^3 recalcula intersecciones y area 1/4", () => {
    const intersections = findIntersections("x", "x^3", [0, 1.5]);
    const p0 = intersections.find((pt) => Math.abs(pt.x) < 1e-4);
    const p1 = intersections.find((pt) => Math.abs(pt.x - 1) < 1e-4);

    expect(p0).toBeDefined();
    expect(p1).toBeDefined();

    const area = computeExactArea("x", "x^3", [0, 1]);
    expect(area.exactFraction).toBe("1/4");
    expect(area.value).toBeCloseTo(1 / 4, 4);
  });

  it("Caso 3: revolucion en torno a x de 0 a 3*pi no incrementa el volumen de la union tras 2*pi (2*pi/15)", () => {
    const vol2Pi = computeRevolutionVolume("x", "x^2", [0, 1], "x", 2 * Math.PI);
    const vol3Pi = computeRevolutionVolume("x", "x^2", [0, 1], "x", 3 * Math.PI);

    expect(vol2Pi.rationalGuessOfPi).toBe("2/15");
    expect(vol2Pi.volume).toBeCloseTo((2 * Math.PI) / 15, 5);
    expect(vol3Pi.volume).toBeCloseTo(vol2Pi.volume, 5);
    expect(vol3Pi.isFullTurn).toBe(true);
    expect(vol3Pi.effectiveAngularCoverage).toBeCloseTo(2 * Math.PI, 5);
    expect(vol3Pi.angularSweepTraveled).toBeCloseTo(3 * Math.PI, 5);
  });

  it("Caso 4: rotacion con eje desplazado y=-1 actualiza radios y advierte si cruza el eje", () => {
    const slice = computeCrossSection("x", "x^2", 0.5, "y = -1");
    expect(slice.outerRadius).toBeCloseTo(1.5, 4);
    expect(slice.innerRadius).toBeCloseTo(1.25, 4);

    const vol = computeRevolutionVolume("x", "x^2", [0, 1], "y = -1");
    expect(vol.rationalGuessOfPi).toBe("7/15");
    expect(vol.volume).toBeCloseTo((7 * Math.PI) / 15, 4);
    expect(vol.crossesAxis).toBe(false);

    const volCrossing = computeRevolutionVolume("x", "x^2", [0, 1], "y = 0.5");
    expect(volCrossing.crossesAxis).toBe(true);
    expect(volCrossing.warning).toBeDefined();
  });

  it("Caso 5: preservacion de parametros y descomposicion por subintervalos", () => {
    const piecewise = computePiecewiseArea("x", "x^2", [0, 1.2]);
    expect(piecewise.isBounded).toBe(true);
    expect(piecewise.subintervals.length).toBeGreaterThanOrEqual(1);
    expect(piecewise.subintervals[0].upperFunction).toBe("f");
    expect(piecewise.subintervals[0].lowerFunction).toBe("g");
    expect(piecewise.totalArea).toBeCloseTo(1 / 6, 4);
  });

  it("Caso 6: evaluacion local fuera de linea sin peticiones de red", () => {
    const compiled = compileExpression("sin(x) + cos(x)");
    const y = evaluateExpression(compiled, { x: 0 });
    expect(y).toBe(1);
  });

  it("Caso 7: manejo seguro de violaciones de dominio sin interrupcion de ejecucion", () => {
    const compiledDivZero = compileExpression("1 / x");
    const valInf = evaluateExpression(compiledDivZero, { x: 0 });
    expect(Number.isFinite(valInf)).toBe(false);

    const compiledLogZero = compileExpression("log(x)");
    const valNegInf = evaluateExpression(compiledLogZero, { x: 0 });
    expect(Number.isFinite(valNegInf)).toBe(false);
  });

  it("Caso 8: denegacion de ejecucion de codigo no confiable en el motor matematico", () => {
    expect(() => compileExpression("alert('xss')")).toThrow();
    expect(() => compileExpression("window.location")).toThrow();
    expect(() => compileExpression("eval('2+2')")).toThrow();
    expect(() => compileExpression("process.exit(1)")).toThrow();
  });
});

