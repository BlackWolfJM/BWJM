import { describe, it, expect } from "vitest";
import {
  crossProduct,
  crossMagnitude,
  computeCrossProductScene,
  computeCrossProductStudy,
  computeCrossProductOrientation,
  computeCrossProductArea,
  computeCrossProductAnticommutativity,
  computeCrossProductDistributivity,
  inspectCrossProductIdentities,
  verifyPerpendicularity,
  isParallel,
  tripleProduct,
  parallelepipedVolume,
  computeParallelepipedVolume,
  computeTripleProductStudy,
  testCoplanarity,
  interpolateCollapseVector,
  computeCollapseStudy,
  computeLine3DInfo,
  computePlane3DInfo,
  lineLineRelation,
  linePlaneIntersection,
  normalToPlaneFromVectors,
  crossProductWithSteps,
  type Vector3,
} from "../src/vectorOps.js";

describe("vectorOps", () => {
  it("explains the reference cross product and its reversed orientation", () => {
    const study = computeCrossProductStudy([2, 1, 3], [1, 4, -2]);
    expect(study.operation).toBe("u × v");
    expect(study.scene.normal).toEqual([-14, 7, 7]);
    expect(study.resultText).toBe("= (-14, 7, 7)");
    expect(study.steps.find(step => step.title === "Sustitución")?.expression).toContain("1 · (-2) − 3 · 4");
    expect(study.steps.at(-1)?.expression).toBe("u · n = 0; v · n = 0; det(u, v, n) = 294");

    const reverse = computeCrossProductStudy([2, 1, 3], [1, 4, -2], true);
    expect(reverse.operation).toBe("v × u");
    expect(reverse.scene.normal).toEqual([14, -7, -7]);
    expect(reverse.scene.area).toBe(study.scene.area);
    expect(reverse.steps.at(-1)?.expression).toBe("u · n = 0; v · n = 0; det(u, v, n) = -294");
  });

  it("develops 2x2 minors and cofactor signs preserving the exterior negative sign of j", () => {
    const study = computeCrossProductStudy([2, 3, 1], [4, 1, 5], false, true);
    expect(study.scene.normal).toEqual([14, -6, -10]);
    const step = study.steps.find(s => s.title === "Simplificación");
    expect(step?.cofactors).toHaveLength(3);
    const [ci, cj, ck] = step!.cofactors!;

    expect(ci).toEqual({
      axis: "i", columns: [2, 3], sign: 1,
      rows: [[3, 1], [1, 5]],
      substitution: "3 · 5 − 1 · 1",
      difference: "15 − (1)",
      minor: "14", minorRelation: "=",
      coefficient: "14", coefficientRelation: "=",
    });

    expect(cj).toEqual({
      axis: "j", columns: [1, 3], sign: -1,
      rows: [[2, 1], [4, 5]],
      substitution: "−(2 · 5 − 1 · 4)",
      difference: "−(10 − (4))",
      minor: "6", minorRelation: "=",
      coefficient: "-6", coefficientRelation: "=",
    });

    expect(ck).toEqual({
      axis: "k", columns: [1, 2], sign: 1,
      rows: [[2, 3], [4, 1]],
      substitution: "2 · 1 − 3 · 4",
      difference: "2 − (12)",
      minor: "-10", minorRelation: "=",
      coefficient: "-10", coefficientRelation: "=",
    });

    // Test reversed order:
    const reversed = computeCrossProductStudy([2, 3, 1], [4, 1, 5], true, true);
    expect(reversed.scene.normal).toEqual([-14, 6, 10]);
    const [, revJ] = reversed.steps.find(s => s.title === "Simplificación")!.cofactors!;
    expect(revJ.rows).toEqual([[4, 5], [2, 1]]);
    expect(revJ.substitution).toBe("−(4 · 1 − 5 · 2)");
    expect(revJ.difference).toBe("−(4 − (10))");
    expect(revJ.minor).toBe("-6");
    expect(revJ.coefficient).toBe("6");

    // Canonical case u=(1,0,0), v=(0,1,0):
    const canonical = computeCrossProductStudy([1, 0, 0], [0, 1, 0], false, true);
    expect(canonical.scene.normal).toEqual([0, 0, 1]);
    const [canI, canJ, canK] = canonical.steps.find(s => s.title === "Simplificación")!.cofactors!;
    expect(canI.minor).toBe("0");
    expect(canI.coefficient).toBe("0");
    expect(canJ.substitution).toBe("−(1 · 0 − 0 · 0)");
    expect(canJ.minor).toBe("0");
    expect(canJ.coefficient).toBe("0");
    expect(canK.minor).toBe("1");
    expect(canK.coefficient).toBe("1");

    // Degenerate parallel case:
    const parallel = computeCrossProductStudy([2, 1, 3], [4, 2, 6], false, true);
    expect(parallel.scene.normal).toEqual([0, 0, 0]);
    const parallelCofactors = parallel.steps.find(s => s.title === "Simplificación")!.cofactors!;
    expect(parallelCofactors.every(c => c.minor === "0" && c.coefficient === "0")).toBe(true);
    expect(parallelCofactors.every(c => c.minorRelation === "=" && c.coefficientRelation === "=")).toBe(true);
  });

  it("distinguishes exact integers from floating-point results", () => {
    const n = Number.MAX_SAFE_INTEGER;
    const exact = computeCrossProductStudy([n, n - 1, 0], [n - 1, n - 2, 0]);
    expect(exact.resultText).toBe("= (0, 0, -1)");

    const approximate = computeCrossProductStudy([0.5, 0, 0], [0, 0.25, 0]);
    expect(approximate.resultText).toBe("≈ (0, 0, 0.125)");
    expect(approximate.steps.at(-1)?.explanation).toContain("tolerancia 1e−12");
  });

  it("explains exact degeneracy without normalizing and reports unavailable results", () => {
    const parallel = computeCrossProductStudy([2, 1, 3], [4, 2, 6]);
    expect(parallel.resultText).toBe("= (0, 0, 0)");
    expect(parallel.steps.find(step => step.title === "Interpretación")?.explanation).toContain("paralelos");
    expect(parallel.steps.at(-1)?.explanation).toContain("sin normalizar");

    const outside = computeCrossProductStudy([1e200, 0, 0], [0, 1e200, 0]);
    expect(outside.scene.error).toBeDefined();
    expect(outside.resultText).toBe("indeterminado");
    expect(outside.steps.map(step => step.title)).toEqual(["Datos y condiciones", "Diagnóstico"]);
    expect(JSON.stringify(outside)).not.toMatch(/Infinity|NaN/);
  });

  it("keeps the cross-product scene oriented even for small orthogonal inputs", () => {
    expect(computeCrossProductScene([1, 0, 0], [0, 1, 0])).toEqual({
      normal: [0, 0, 1], area: 1, triangleArea: 0.5, opposite: [1, 1, 0],
    });
    const small = computeCrossProductScene([0, 1e-7, 0], [1e-7, 0, 0]);
    expect(small.normal?.[2]).toBeLessThan(0);
    expect(small.area).toBeCloseTo(1e-14, 25);
    expect(small.opposite).toEqual([1e-7, 1e-7, 0]);
  });

  it("distinguishes exact degeneracy from unrepresentable cross products", () => {
    const degenerate = {
      normal: [0, 0, 0],
      area: 0,
      triangleArea: 0,
      opposite: null,
      warning: "Los vectores son paralelos o nulos (u × v = 0): no hay normal única por esos vectores",
    };
    expect(computeCrossProductScene([0, 0, 0], [3, 4, 5])).toEqual(degenerate);
    expect(computeCrossProductScene([1, 2, 3], [-2, -4, -6])).toEqual(degenerate);
    expect(computeCrossProductScene([1e200, 1e200, 0], [1e200, 1e200, 0])).toEqual(degenerate);
    expect(computeCrossProductScene([1e200, 0, 0], [0, 1e200, 0]).error).toBeDefined();
    expect(computeCrossProductScene([1e300, 1e-300, 0], [1e-100, 0, 0]).error).toBeDefined();
  });

  it("crossProduct basic", () => {
    const a: [number, number, number] = [1, 0, 0];
    const b: [number, number, number] = [0, 1, 0];
    expect(crossProduct(a, b)).toEqual([0, 0, 1]);
  });

  it("crossProduct anti-commutative", () => {
    const a: [number, number, number] = [1, 2, 3];
    const b: [number, number, number] = [4, 5, 6];
    const c1 = crossProduct(a, b);
    const c2 = crossProduct(b, a);
    expect(c1[0]).toBeCloseTo(-c2[0]);
    expect(c1[1]).toBeCloseTo(-c2[1]);
    expect(c1[2]).toBeCloseTo(-c2[2]);
  });

  it("crossMagnitude area parallelogram", () => {
    const a: [number, number, number] = [1, 0, 0];
    const b: [number, number, number] = [0, 1, 0];
    expect(crossMagnitude(a, b)).toBeCloseTo(1);
  });

  it("isParallel detection", () => {
    const a: [number, number, number] = [2, 2, 2];
    const b: [number, number, number] = [1, 1, 1];
    expect(isParallel(a, b)).toBe(true);
    const c: [number, number, number] = [1, 0, 0];
    expect(isParallel(a, c)).toBe(false);
  });

  it("tripleProduct and volume", () => {
    const u: [number, number, number] = [1, 0, 0];
    const v: [number, number, number] = [0, 1, 0];
    const w: [number, number, number] = [0, 0, 1];
    expect(tripleProduct(u, v, w)).toBeCloseTo(1);
    expect(parallelepipedVolume(u, v, w)).toBeCloseTo(1);
  });

  it("normalToPlaneFromVectors null when parallel", () => {
    const a: [number, number, number] = [1, 0, 0];
    const b: [number, number, number] = [2, 0, 0];
    expect(normalToPlaneFromVectors(a, b)).toBeNull();
  });

  it("crossProductWithSteps returns steps", () => {
    const a: [number, number, number] = [1, 0, 0];
    const b: [number, number, number] = [0, 1, 0];
    const { result, steps } = crossProductWithSteps(a, b);
    expect(result).toEqual([0, 0, 1]);
    expect(steps.length).toBeGreaterThanOrEqual(3);
    expect(steps[0].title).toContain("Definición");
  });

  it("computes cross product orientation, right-hand rule, and anticommutative identity", () => {
    const u: [number, number, number] = [2, 3, 1];
    const v: [number, number, number] = [4, 1, 5];

    // Regular direct order u × v
    const direct = computeCrossProductOrientation(u, v, false);
    expect(direct.order).toBe("u × v");
    expect(direct.oppositeOrder).toBe("v × u");
    expect(direct.reversed).toBe(false);
    expect(direct.isDegenerate).toBe(false);
    expect(direct.normal).toEqual([14, -6, -10]);
    expect(direct.oppositeNormal).toEqual([-14, 6, 10]);
    expect(direct.anticommutativeIdentity).toBe("v × u = −(u × v)");
    expect(direct.anticommutativeValues).toBe("(-14, 6, 10) = −(14, -6, -10)");
    expect(direct.tripleProductDeterminant).toBe(332);
    expect(direct.handedness).toContain("dextrógira");
    expect(direct.curlDescription).toContain("u hacia v");
    expect(direct.thumbDescription).toContain("(14, -6, -10)");

    // Reversed order v × u
    const reversed = computeCrossProductOrientation(u, v, true);
    expect(reversed.order).toBe("v × u");
    expect(reversed.oppositeOrder).toBe("u × v");
    expect(reversed.reversed).toBe(true);
    expect(reversed.isDegenerate).toBe(false);
    expect(reversed.normal).toEqual([-14, 6, 10]);
    expect(reversed.oppositeNormal).toEqual([14, -6, -10]);
    expect(reversed.anticommutativeIdentity).toBe("u × v = −(v × u)");
    expect(reversed.anticommutativeValues).toBe("(14, -6, -10) = −(-14, 6, 10)");
    expect(reversed.tripleProductDeterminant).toBe(332);
    expect(reversed.curlDescription).toContain("v hacia u");

    // Degenerate parallel vectors
    const degenerate = computeCrossProductOrientation([1, 2, 3], [2, 4, 6], false);
    expect(degenerate.isDegenerate).toBe(true);
    expect(degenerate.normal).toEqual([0, 0, 0]);
    expect(degenerate.oppositeNormal).toEqual([0, 0, 0]);
    expect(degenerate.tripleProductDeterminant).toBe(0);
    expect(degenerate.handedness).toContain("degenerada");

    // Study integration
    const study = computeCrossProductStudy(u, v, false);
    expect(study.orientation).toBeDefined();
    expect(study.orientation.normal).toEqual([14, -6, -10]);
    const orientStep = study.steps.find(s => s.title === "Interpretación");
    expect(orientStep).toBeDefined();
    expect(orientStep?.orientation).toBeDefined();
    expect(orientStep?.expression).toContain("v × u = −(u × v)");
  });

  it("calculates parallelogram area depending on sine of angle and guards against zero division", () => {
    // Regular non-orthogonal vectors
    const regular = computeCrossProductArea([2, 3, 1], [4, 1, 5]);
    expect(regular.area).toBeCloseTo(Math.sqrt(332), 6);
    expect(regular.magU).toBeCloseTo(Math.sqrt(14), 6);
    expect(regular.magV).toBeCloseTo(Math.sqrt(42), 6);
    expect(regular.cosTheta).toBeCloseTo(16 / Math.sqrt(588), 6);
    expect(regular.thetaDeg).toBeCloseTo(48.713, 2);
    expect(regular.sinTheta).toBeCloseTo(Math.sqrt(332 / 588), 6);
    expect(regular.isParallel).toBe(false);
    expect(regular.isZero).toBe(false);
    expect(regular.magU * regular.magV * regular.sinTheta).toBeCloseTo(regular.area, 6);
    expect(regular.formula).toContain("‖u‖ · ‖v‖ · sen(θ)");

    // Orthogonal unit vectors
    const ortho = computeCrossProductArea([1, 0, 0], [0, 2, 0]);
    expect(ortho.area).toBe(2);
    expect(ortho.thetaDeg).toBeCloseTo(90, 5);
    expect(ortho.sinTheta).toBeCloseTo(1, 5);
    expect(ortho.isParallel).toBe(false);

    // Parallel vectors: area is strictly 0 and sin(theta) = 0
    const parallel = computeCrossProductArea([1, 2, 3], [2, 4, 6]);
    expect(parallel.area).toBe(0);
    expect(parallel.sinTheta).toBe(0);
    expect(parallel.thetaDeg).toBe(0);
    expect(parallel.isParallel).toBe(true);
    expect(parallel.formula).toContain("sen(θ) = 0");

    // Zero vector: zero division protection triggered cleanly
    const zeroU = computeCrossProductArea([0, 0, 0], [1, 2, 3]);
    expect(zeroU.area).toBe(0);
    expect(zeroU.isZero).toBe(true);
    expect(zeroU.isParallel).toBe(true);
    expect(Number.isFinite(zeroU.area)).toBe(true);
    expect(zeroU.formula).toContain("magnitud nula");
  });

  it("integrates area and module calculation into study steps and explains parallel case", () => {
    const study = computeCrossProductStudy([2, 3, 1], [4, 1, 5]);
    expect(study.area).toBeDefined();
    expect(study.area.area).toBeCloseTo(Math.sqrt(332), 6);

    const areaStep = study.steps.find(s => s.title === "Módulo y área del paralelogramo");
    expect(areaStep).toBeDefined();
    expect(areaStep?.area).toBeDefined();
    expect(areaStep?.expression).toContain("‖u‖ · ‖v‖ · sen(θ)");
    expect(areaStep?.explanation).toContain("18.2209");
    expect(areaStep?.explanation).toContain("48.71");

    // Parallel case in study
    const parallelStudy = computeCrossProductStudy([1, 2, 3], [2, 4, 6]);
    expect(parallelStudy.area.isParallel).toBe(true);
    expect(parallelStudy.area.area).toBe(0);
    const parAreaStep = parallelStudy.steps.find(s => s.title === "Módulo y área del paralelogramo");
    expect(parAreaStep?.explanation).toContain("sen(θ) = 0");
    expect(parAreaStep?.explanation).toContain("anula limpiamente");
  });

  it("verifies perpendicularity with zero dot products and warns on non-unique normal for parallel vectors", () => {
    const u = [2, 3, 1] as const;
    const v = [4, 1, 5] as const;
    const scene = computeCrossProductScene(u as never, v as never);
    expect(scene.normal).toEqual([14, -6, -10]);

    // Check perpendicularity: u · n = 0 and v · n = 0
    const perp = verifyPerpendicularity(u as never, v as never, scene.normal as never);
    expect(perp.isPerpendicular).toBe(true);
    expect(perp.dotU).toBe(0);
    expect(perp.dotV).toBe(0);
    expect(perp.explanation).toContain("u · n = 0");
    expect(perp.explanation).toContain("v · n = 0");

    // Check parallel vectors: warning on non-unique normal
    const parallelScene = computeCrossProductScene([1, 2, 3], [2, 4, 6]);
    expect(parallelScene.opposite).toBeNull();
    expect(parallelScene.normal).toEqual([0, 0, 0]);
    expect(parallelScene.warning).toContain("no hay normal única");

    const parPerp = verifyPerpendicularity([1, 2, 3], [2, 4, 6], [0, 0, 0]);
    expect(parPerp.isPerpendicular).toBe(false);
    expect(parPerp.explanation).toContain("no determinan una normal única");

    // Check study checkStep for parallel vectors
    const studyParallel = computeCrossProductStudy([1, 2, 3], [2, 4, 6]);
    const checkStep = studyParallel.steps.find(s => s.title === "Comprobación");
    expect(checkStep?.explanation).toContain("no hay normal única por esos vectores");
    expect(checkStep?.perpendicularity).toBeDefined();
    expect(checkStep?.perpendicularity?.isCollinear).toBe(true);
    expect(checkStep?.perpendicularity?.isPerpendicular).toBe(false);

    // Check study for regular vectors
    const regularStudy = computeCrossProductStudy([2, 3, 1], [4, 1, 5]);
    expect(regularStudy.perpendicularity).toBeDefined();
    expect(regularStudy.perpendicularity.isPerpendicular).toBe(true);
    expect(regularStudy.perpendicularity.dotU).toBe(0);
    expect(regularStudy.perpendicularity.dotV).toBe(0);
    expect(regularStudy.perpendicularity.dotUExpr).toContain("= 0");
    expect(regularStudy.perpendicularity.dotVExpr).toContain("= 0");
  });

  it("T011 MED-03.06-V: computes and validates anticommutativity and distributive expansion", () => {
    // 1. Anticommutativity: direct order
    const u: [number, number, number] = [1, 2, 0];
    const v: [number, number, number] = [0, 3, 1];
    const anti = computeCrossProductAnticommutativity(u, v, false);
    expect(anti.directOperation).toBe("u × v");
    expect(anti.reverseOperation).toBe("v × u");
    expect(anti.directNormal).toEqual([2, -1, 3]);
    expect(anti.oppositeNormal).toEqual([-2, 1, -3]);
    expect(anti.isNegationExact).toBe(true);
    expect(anti.isZero).toBe(false);
    expect(anti.identityLatex).toContain("v \\times u = -(u \\times v)");
    expect(anti.explanation).toContain("multiplica el determinante por -1");

    // 2. Anticommutativity: reversed order
    const antiRev = computeCrossProductAnticommutativity(u, v, true);
    expect(antiRev.directOperation).toBe("v × u");
    expect(antiRev.reverseOperation).toBe("u × v");
    expect(antiRev.directNormal).toEqual([-2, 1, -3]);
    expect(antiRev.oppositeNormal).toEqual([2, -1, 3]);
    expect(antiRev.isNegationExact).toBe(true);
    expect(antiRev.identityLatex).toContain("u \\times v = -(v \\times u)");

    // 3. Degenerate anticommutativity with collinear vectors
    const antiCollinear = computeCrossProductAnticommutativity([1, 2, 3], [2, 4, 6]);
    expect(antiCollinear.isZero).toBe(true);
    expect(antiCollinear.directNormal).toEqual([0, 0, 0]);
    expect(antiCollinear.oppositeNormal).toEqual([0, 0, 0]);
    expect(antiCollinear.explanation).toContain("vectores son colineales o nulos");

    // 4. Distributivity over vector sum u × (v + w) = (u × v) + (u × w)
    const w: [number, number, number] = [1, 0, 2];
    const dist = computeCrossProductDistributivity(u, v, w);
    expect(dist.vPlusW).toEqual([1, 3, 3]);
    expect(dist.uCrossV).toEqual([2, -1, 3]);
    expect(dist.uCrossW).toEqual([4, -2, -2]);
    expect(dist.uCrossSum).toEqual([6, -3, 1]);
    expect(dist.sumOfCrosses).toEqual([6, -3, 1]);
    expect(dist.difference).toEqual([0, 0, 0]);
    expect(dist.isDistributive).toBe(true);
    expect(dist.explanation).toContain("linealidad del determinante");

    // 5. Scene with third vector w
    const scene = computeCrossProductScene(u, v, false, w);
    expect(scene.distributive).toBeDefined();
    expect(scene.distributive?.isDistributive).toBe(true);
    expect(scene.distributive?.uCrossSum).toEqual([6, -3, 1]);

    // 6. Study with third vector w includes properties step
    const study = computeCrossProductStudy(u, v, false, false, w);
    expect(study.anticommutative).toBeDefined();
    expect(study.distributive).toBeDefined();
    const propStep = study.steps.find(s => s.title === "Propiedades algebraicas");
    expect(propStep).toBeDefined();
    expect(propStep?.expression).toContain("v × u = −(u × v)");
    expect(propStep?.anticommutative?.isNegationExact).toBe(true);
    expect(propStep?.distributive?.isDistributive).toBe(true);
  });

  it("T012 MED-03.06-C: inspects cross product identities with symbolic proofs and dot product warnings", () => {
    const u: [number, number, number] = [1, 2, 0];
    const v: [number, number, number] = [0, 3, 1];
    const w: [number, number, number] = [1, 0, 2];

    const report = inspectCrossProductIdentities(u, v, w, 3);
    expect(report.allPassed).toBe(true);
    expect(report.identities).toHaveLength(4);

    // 1. Anticommutativity
    const anti = report.identities.find(i => i.id === "anticommutativity");
    expect(anti).toBeDefined();
    expect(anti?.isExactMatch).toBe(true);
    expect(anti?.residualNorm).toBeLessThanOrEqual(1e-11);
    expect(anti?.scalarDotWarning).toContain("No confundir con el producto escalar");
    expect(anti?.steps.length).toBeGreaterThanOrEqual(4);

    // 2. Self-cross / Nilpotency
    const self = report.identities.find(i => i.id === "selfCross");
    expect(self).toBeDefined();
    expect(self?.isExactMatch).toBe(true);
    expect(self?.leftEvaluated).toEqual([0, 0, 0]);
    expect(self?.scalarDotWarning).toContain("u · u = ‖u‖²");

    // 3. Scalar associativity
    const scalar = report.identities.find(i => i.id === "scalarAssociativity");
    expect(scalar).toBeDefined();
    expect(scalar?.isExactMatch).toBe(true);
    expect(scalar?.leftEvaluated).toEqual([3 * 2, 3 * -1, 3 * 3]);

    // 4. Distributivity
    const dist = report.identities.find(i => i.id === "distributivity");
    expect(dist).toBeDefined();
    expect(dist?.isExactMatch).toBe(true);
    expect(dist?.leftEvaluated).toEqual(dist?.rightEvaluated);

    // 5. Degenerate collinear case: all identities still hold
    const degReport = inspectCrossProductIdentities([1, 2, 3], [2, 4, 6]);
    expect(degReport.allPassed).toBe(true);
    expect(degReport.identities.every(i => i.isExactMatch)).toBe(true);

    // 6. Zero vector case
    const zeroReport = inspectCrossProductIdentities([0, 0, 0], [0, 0, 0]);
    expect(zeroReport.allPassed).toBe(true);

    // 7. Verify study integration
    const study = computeCrossProductStudy(u, v, false, false, w, true);
    expect(study.identities).toBeDefined();
    expect(study.identities?.allPassed).toBe(true);
    const idStep = study.steps.find(s => s.title === "Inspector de identidades algebraicas");
    expect(idStep).toBeDefined();
    expect(idStep?.identities).toBeDefined();
    expect(idStep?.explanation).toContain("No confundir");
  });

  it.each([
    [1e-7, 1e-7],
    [1e-13, 1e14],
  ])("T013 keeps nonzero perpendicular areas consistent at scales %s and %s", (x, y) => {
    const u: Vector3 = [x, 0, 0];
    const v: Vector3 = [0, y, 0];
    const origin: Vector3 = [1, 1, 0];
    const study = computeCrossProductStudy(u, v, false, false, undefined, false, origin);
    expect(study.scene.area).toBe(x * y);
    expect(study.area).toMatchObject({
      area: study.scene.area,
      triangleArea: study.scene.triangleArea,
      thetaDeg: 90,
      sinTheta: 1,
      isParallel: false,
      isZero: false,
    });
    const areaStep = study.steps.find(step => step.area);
    expect(areaStep?.expression).toContain(String(Number((x * y / 2).toPrecision(5))));
    expect(areaStep?.explanation).not.toContain("paralelos");
  });

  it("T013 MED-03.07-V: calculates parallelogram and triangle areas with exact half-factor relationship and translation invariance", () => {
    const u: [number, number, number] = [2, 0, 1];
    const v: [number, number, number] = [0, 3, 2];
    const origin: [number, number, number] = [1, 1, 0];

    // 1. Regular computation: u x v = (-3, -4, 6), norm = sqrt(61)
    const areaCanonical = computeCrossProductArea(u, v);
    const expectedParallelogramArea = Math.sqrt(61);
    const expectedTriangleArea = expectedParallelogramArea / 2;

    expect(areaCanonical.area).toBeCloseTo(expectedParallelogramArea, 6);
    expect(areaCanonical.triangleArea).toBeCloseTo(expectedTriangleArea, 6);
    expect(areaCanonical.triangleArea).toBe(areaCanonical.area / 2);
    expect(areaCanonical.triangleFormula).toContain("1/2 · ‖u × v‖");
    expect(areaCanonical.isParallel).toBe(false);
    expect(areaCanonical.isZero).toBe(false);

    // 2. Translation invariance: translated origin preserves identical areas
    const areaTranslated = computeCrossProductArea(u, v, origin);
    expect(areaTranslated.area).toBe(areaCanonical.area);
    expect(areaTranslated.triangleArea).toBe(areaCanonical.triangleArea);
    expect(areaTranslated.origin).toEqual(origin);

    // 3. Collinear / parallel vectors: area collapses to 0
    const parArea = computeCrossProductArea([1, 2, 3], [2, 4, 6]);
    expect(parArea.isParallel).toBe(true);
    expect(parArea.area).toBe(0);
    expect(parArea.triangleArea).toBe(0);
    expect(parArea.formula).toContain("sen(θ) = 0");
    expect(parArea.triangleFormula).toContain("sen(θ) = 0");

    // 4. Zero vector protection
    const zeroArea = computeCrossProductArea([0, 0, 0], [1, 2, 3]);
    expect(zeroArea.isZero).toBe(true);
    expect(zeroArea.area).toBe(0);
    expect(zeroArea.triangleArea).toBe(0);

    // 5. Scene integration with origin and triangleArea
    const scene = computeCrossProductScene(u, v, false, undefined, origin);
    expect(scene.area).toBeCloseTo(expectedParallelogramArea, 6);
    expect(scene.triangleArea).toBeCloseTo(expectedTriangleArea, 6);
    expect(scene.origin).toEqual(origin);

    // 6. Study integration
    const study = computeCrossProductStudy(u, v, false, false, undefined, false, origin);
    expect(study.area.area).toBeCloseTo(expectedParallelogramArea, 6);
    expect(study.area.triangleArea).toBeCloseTo(expectedTriangleArea, 6);
    const areaStep = study.steps.find(s => s.title === "Módulo y área del paralelogramo");
    expect(areaStep).toBeDefined();
    expect(areaStep?.area?.triangleArea).toBeCloseTo(expectedTriangleArea, 6);
    expect(areaStep?.explanation).toContain("Área(triángulo) = 1/2");
  });

  it("T014 gives an exact radical and half-area after translating the common origin", () => {
    const u: Vector3 = [2, 0, 1];
    const v: Vector3 = [0, 3, 2];
    const study = computeCrossProductStudy(u, v, false, false, undefined, false, [1, 1, 0]);
    const exact = study.area.exact;
    expect(exact).toMatchObject({ radicand: "61", parallelogram: "√61", triangle: "√61/2" });
    expect(exact?.substitution).toContain("(-3)² + (-4)² + 6² = 61");
    expect(exact?.check).toContain("(2 · A_triángulo)² = 61");
    expect(exact?.translation).toContain("P₀ = (1, 1, 0)");
    expect(exact?.translation).toContain("(P₀ + u) − P₀ = u");
    expect(study.steps.find(step => step.area)?.area?.exact).toBe(exact);
    expect(study.area.area).toBe(study.scene.area);
    expect(study.area.triangleArea).toBe(study.scene.triangleArea);
    expect(computeCrossProductArea(u, v, [0, 0, 0]).exact).toMatchObject({
      parallelogram: exact?.parallelogram, triangle: exact?.triangle,
    });
    expect(() => JSON.stringify(study)).not.toThrow();
  });

  it("T014 reduces integer areas and their exact halves and keeps decimal inputs approximate", () => {
    const u: Vector3 = [1, 0, 0];
    expect(computeCrossProductArea(u, [0, 2, 0]).exact).toMatchObject({
      radicand: "4", parallelogram: "2", triangle: "1",
    });
    expect(computeCrossProductArea(u, [0, 3, 0]).exact).toMatchObject({
      radicand: "9", parallelogram: "3", triangle: "3/2",
    });
    expect(computeCrossProductArea(u, [2, 0, 0]).exact).toMatchObject({
      radicand: "0", parallelogram: "0", triangle: "0",
    });
    expect(computeCrossProductArea(u, [0, 0, 0]).exact?.triangle).toBe("0");
    const max = Number.MAX_SAFE_INTEGER;
    const largeArea = BigInt(max) ** 2n;
    expect(computeCrossProductArea([max, 0, 0], [0, max, 0]).exact).toMatchObject({
      radicand: String(largeArea ** 2n), parallelogram: String(largeArea), triangle: `${largeArea}/2`,
    });
    const decimal = computeCrossProductArea(u, [0, 0.5, 0]);
    expect(decimal.exact).toBeUndefined();
    expect(decimal.triangleArea).toBe(0.25);
    expect(computeCrossProductArea([1e200, 0, 0], [0, 1e200, 0])).toMatchObject({
      formula: "Fuera de rango numérico",
    });
  });

  describe("T015 - Parallelepiped volume and triple product", () => {
    it("computes signed volume for canonical basis vectors (u=i, v=j, w=k => V=1)", () => {
      const u: Vector3 = [1, 0, 0];
      const v: Vector3 = [0, 1, 0];
      const w: Vector3 = [0, 0, 1];
      const vol = computeParallelepipedVolume(u, v, w);
      expect(vol.volumeSigned).toBe(1);
      expect(vol.volumeAbsolute).toBe(1);
      expect(vol.orientation).toBe("positive");
      expect(vol.formula).toContain("V = u·(v×w) = 1.000000");
      expect(vol.explanation).toContain("dextrógira");
    });

    it("computes negative signed volume for reversed order (u=i, v=k, w=j => V=-1)", () => {
      const u: Vector3 = [1, 0, 0];
      const v: Vector3 = [0, 0, 1];
      const w: Vector3 = [0, 1, 0];
      const vol = computeParallelepipedVolume(u, v, w);
      expect(vol.volumeSigned).toBe(-1);
      expect(vol.volumeAbsolute).toBe(1);
      expect(vol.orientation).toBe("negative");
      expect(vol.explanation).toContain("latrongira");
    });

    it("returns degenerate for coplanar vectors", () => {
      const u: Vector3 = [1, 0, 0];
      const v: Vector3 = [0, 1, 0];
      const w: Vector3 = [1, 1, 0]; // coplanar with u,v
      const vol = computeParallelepipedVolume(u, v, w);
      expect(vol.volumeSigned).toBe(0);
      expect(vol.volumeAbsolute).toBe(0);
      expect(vol.orientation).toBe("degenerate");
      expect(vol.explanation).toContain("coplanares");
    });

    it("returns degenerate for zero vector", () => {
      const u: Vector3 = [1, 0, 0];
      const v: Vector3 = [0, 1, 0];
      const w: Vector3 = [0, 0, 0];
      const vol = computeParallelepipedVolume(u, v, w);
      expect(vol.volumeSigned).toBe(0);
      expect(vol.volumeAbsolute).toBe(0);
      expect(vol.orientation).toBe("degenerate");
    });

    it("computes volume for arbitrary integer vectors with exact formula", () => {
      const u: Vector3 = [2, 3, 1];
      const v: Vector3 = [4, 1, 5];
      const w: Vector3 = [1, 2, 3];
      // triple product = u·(v×w) = 2*(1*3-5*2) - 3*(4*3-5*1) + 1*(4*2-1*1)
      // = 2*(3-10) - 3*(12-5) + 1*(8-1)
      // = 2*(-7) - 3*(7) + 7
      // = -14 - 21 + 7 = -28
      const vol = computeParallelepipedVolume(u, v, w);
      expect(vol.volumeSigned).toBe(-28);
      expect(vol.volumeAbsolute).toBe(28);
      expect(vol.orientation).toBe("negative");
    });

    it("verifies cyclic permutations preserve absolute volume but may change sign", () => {
      const u: Vector3 = [1, 2, 3];
      const v: Vector3 = [4, 5, 6];
      const w: Vector3 = [7, 8, 10];
      const volUVW = computeParallelepipedVolume(u, v, w);
      const volVWU = computeParallelepipedVolume(v, w, u);
      const volWUV = computeParallelepipedVolume(w, u, v);
      // Cyclic permutations preserve the signed volume
      expect(volUVW.volumeSigned).toBe(volVWU.volumeSigned);
      expect(volUVW.volumeSigned).toBe(volWUV.volumeSigned);
      // Anti-cyclic (swap two) flips sign
      const volUWV = computeParallelepipedVolume(u, w, v);
      expect(volUWV.volumeSigned).toBe(-volUVW.volumeSigned);
    });
  });

  describe("T016 - Triple product study with permutations", () => {
    it("computes triple product study for canonical basis (i,j,k => V=1)", () => {
      const u: Vector3 = [1, 0, 0];
      const v: Vector3 = [0, 1, 0];
      const w: Vector3 = [0, 0, 1];
      const study = computeTripleProductStudy(u, v, w);
      expect(study.volumeSigned).toBe(1);
      expect(study.volumeAbsolute).toBe(1);
      expect(study.orientation).toBe("positive");
      expect(study.exact).toBe(true);
      expect(study.vCrossW).toEqual([1, 0, 0]);
      expect(study.determinant).toBe(1);
      // Cyclic permutations preserve value
      study.cyclicPermutations.forEach((p) => expect(p.isEqual).toBe(true));
      // Anti-cyclic flips sign
      study.antiCyclicPermutations.forEach((p) => expect(p.signFlipped).toBe(true));
    });

    it("computes negative triple product for anti-cyclic permutation", () => {
      const u: Vector3 = [1, 0, 0];
      const v: Vector3 = [0, 0, 1];
      const w: Vector3 = [0, 1, 0];
      const study = computeTripleProductStudy(u, v, w);
      expect(study.volumeSigned).toBe(-1);
      expect(study.volumeAbsolute).toBe(1);
      expect(study.orientation).toBe("negative");
    });

    it("returns degenerate for coplanar vectors", () => {
      const u: Vector3 = [1, 0, 0];
      const v: Vector3 = [0, 1, 0];
      const w: Vector3 = [1, 1, 0];
      const study = computeTripleProductStudy(u, v, w);
      expect(study.volumeSigned).toBe(0);
      expect(study.volumeAbsolute).toBe(0);
      expect(study.orientation).toBe("degenerate");
      expect(study.explanation).toContain("coplanares");
    });

    it("verifies cyclic permutations u·(v×w) = v·(w×u) = w·(u×v)", () => {
      const u: Vector3 = [2, 3, 1];
      const v: Vector3 = [4, 1, 5];
      const w: Vector3 = [1, 2, 3];
      const study = computeTripleProductStudy(u, v, w);
      const [c1, c2, c3] = study.cyclicPermutations;
      expect(c1.result).toBe(c2.result);
      expect(c1.result).toBe(c3.result);
      expect(c1.isEqual && c2.isEqual && c3.isEqual).toBe(true);
    });

    it("verifies anti-cyclic permutations flip sign", () => {
      const u: Vector3 = [2, 3, 1];
      const v: Vector3 = [4, 1, 5];
      const w: Vector3 = [1, 2, 3];
      const study = computeTripleProductStudy(u, v, w);
      study.antiCyclicPermutations.forEach((p) => {
        expect(p.signFlipped).toBe(true);
        expect(Math.abs(p.result + study.volumeSigned)).toBeLessThanOrEqual(1e-11);
      });
    });

    it("handles exact integer arithmetic for safe integers", () => {
      const max = Number.MAX_SAFE_INTEGER;
      const u: Vector3 = [max, 0, 0];
      const v: Vector3 = [0, max, 0];
      const w: Vector3 = [0, 0, max];
      const study = computeTripleProductStudy(u, v, w);
      expect(study.exact).toBe(true);
      expect(study.volumeSigned).toBe(max ** 3);
      expect(study.determinant).toBe(max ** 3);
    });
  });

  describe("T018 - Coplanarity test with exact arithmetic", () => {
    it("detects coplanar vectors (canonical basis: i, j, i+j)", () => {
      const u: Vector3 = [1, 0, 0];
      const v: Vector3 = [0, 1, 0];
      const w: Vector3 = [1, 1, 0]; // w = u + v, coplanar
      const test = testCoplanarity(u, v, w);
      expect(test.isCoplanar).toBe(true);
      expect(test.tripleProduct).toBe(0);
      expect(test.tripleProductExact).toBe(true);
      expect(test.explanation).toContain("coplanares");
    });

    it("detects non-coplanar vectors (canonical basis: i, j, k)", () => {
      const u: Vector3 = [1, 0, 0];
      const v: Vector3 = [0, 1, 0];
      const w: Vector3 = [0, 0, 1];
      const test = testCoplanarity(u, v, w);
      expect(test.isCoplanar).toBe(false);
      expect(test.tripleProduct).toBe(1);
      expect(test.explanation).toContain("NO son coplanares");
    });

    it("detects coplanar vectors with integer arithmetic (exact zero)", () => {
      const u: Vector3 = [2, 3, 1];
      const v: Vector3 = [4, 1, 5];
      const w: Vector3 = [6, 4, 6]; // w = u + v, coplanar
      const test = testCoplanarity(u, v, w);
      expect(test.isCoplanar).toBe(true);
      expect(test.tripleProduct).toBe(0);
      expect(test.tripleProductExact).toBe(true);
    });

    it("detects non-coplanar with exact integer arithmetic", () => {
      const u: Vector3 = [2, 3, 1];
      const v: Vector3 = [4, 1, 5];
      const w: Vector3 = [1, 2, 3];
      const test = testCoplanarity(u, v, w);
      expect(test.isCoplanar).toBe(false);
      expect(test.tripleProduct).toBe(-28);
      expect(test.tripleProductExact).toBe(true);
    });

    it("handles floating-point vectors with tolerance", () => {
      const u: Vector3 = [1.0, 0.0, 0.0];
      const v: Vector3 = [0.0, 1.0, 0.0];
      const w: Vector3 = [0.5, 0.5, 0.0]; // coplanar in XY plane
      const test = testCoplanarity(u, v, w);
      expect(test.isCoplanar).toBe(true);
      expect(test.tripleProductExact).toBe(false);
    });

    it("includes pedagogical steps in explanation", () => {
      const u: Vector3 = [1, 0, 0];
      const v: Vector3 = [0, 1, 0];
      const w: Vector3 = [1, 1, 0];
      const test = testCoplanarity(u, v, w);
      expect(test.steps).toHaveLength(4);
      expect(test.steps[0].title).toBe("Datos y condiciones");
      expect(test.steps[1].title).toBe("Paso 1: Calcular v × w");
      expect(test.steps[2].title).toBe("Paso 2: Calcular u · (v × w)");
      expect(test.steps[3].title).toBe("Paso 3: Verificar coplanaridad");
    });
  });

  describe("T021-T022 - Line3D info", () => {
    it("computes line3D info for canonical line", () => {
      const info = computeLine3DInfo([1, 2, 3], [2, -1, 1]);
      expect(info.isValid).toBe(true);
      expect(info.point).toEqual([1, 2, 3]);
      expect(info.direction).toEqual([2, -1, 1]);
      expect(info.parametric).toContain("x = 1 + 2·t");
      expect(info.parametric).toContain("y = 2 + -1·t");
      expect(info.parametric).toContain("z = 3 + 1·t");
      expect(info.vectorForm).toContain("r(t) = (1, 2, 3) + t·(2, -1, 1)");
      expect(info.symmetric).toContain("(x − 1) / 2");
      expect(info.symmetric).toContain("(y − 2) / -1");
      expect(info.symmetric).toContain("(z − 3) / 1");
    });

    it("handles zero direction vector (invalid)", () => {
      const info = computeLine3DInfo([1, 2, 3], [0, 0, 0]);
      expect(info.isValid).toBe(false);
      expect(info.explanation).toContain("nulo");
    });

    it("handles symmetric equation with zero components", () => {
      const info = computeLine3DInfo([0, 0, 0], [1, 0, 2]);
      expect(info.symmetric).toContain("(x − 0) / 1");
      expect(info.symmetric).not.toContain("y"); // vy = 0
      expect(info.symmetric).toContain("(z − 0) / 2");
    });
  });

  describe("T031-T032 - Plane3D info", () => {
    it("computes plane3D info for canonical plane", () => {
      const info = computePlane3DInfo([1, 2, 3], [1, 1, 1]);
      expect(info.isValid).toBe(true);
      expect(info.point).toEqual([1, 2, 3]);
      expect(info.normal).toEqual([1, 1, 1]);
      expect(info.generalEquation).toContain("1·x + 1·y + 1·z");
      expect(info.normalEquation).toContain("(1)·(x − 1)");
      expect(info.intercepts).toBeDefined();
      if (info.intercepts) {
        expect(info.intercepts.x).toBeCloseTo(6);
        expect(info.intercepts.y).toBeCloseTo(6);
        expect(info.intercepts.z).toBeCloseTo(6);
      }
    });

    it("handles zero normal vector (invalid)", () => {
      const info = computePlane3DInfo([1, 2, 3], [0, 0, 0]);
      expect(info.isValid).toBe(false);
      expect(info.explanation).toContain("nulo");
    });

    it("computes intercepts correctly", () => {
      const info = computePlane3DInfo([0, 0, 0], [2, 3, 6]);
      // Ecuación: 2x + 3y + 6z = 0
      // Interceptos en el origen (0, 0, 0)
      expect(info.intercepts).toEqual({ x: 0, y: 0, z: 0 });

      const info2 = computePlane3DInfo([1, 0, 0], [1, 0, 0]);
      // Ecuación: 1(x-1) = 0 => x = 1
      // No intercepts con y, z
      expect(info2.intercepts).toBeUndefined();
    });
  });

  describe("T029-T030 - Line-line relation", () => {
    it("detects parallel lines", () => {
      const rel = lineLineRelation([0, 0, 0], [1, 1, 1], [1, 0, 0], [2, 2, 2]);
      expect(rel.type).toBe("parallel");
      expect(rel.explanation).toContain("paralelas");
    });

    it("detects coincident lines", () => {
      const rel = lineLineRelation([0, 0, 0], [1, 1, 1], [2, 2, 2], [1, 1, 1]);
      expect(rel.type).toBe("coincident");
      expect(rel.explanation).toContain("coincidentes");
    });

    it("detects intersecting (secant) lines", () => {
      // Rectas que se intersectan en el origen
      const rel = lineLineRelation([0, 0, 0], [1, 0, 0], [0, 0, 0], [0, 1, 0]);
      expect(rel.type).toBe("secant");
      expect(rel.intersectionPoint).toEqual([0, 0, 0]);
    });

    it("detects skew (alabeadas) lines", () => {
      // r1: x-axis, r2: line parallel to y-axis at z=1
      const rel = lineLineRelation([0, 0, 0], [1, 0, 0], [0, 0, 1], [0, 1, 0]);
      expect(rel.type).toBe("skew");
      expect(rel.distance).toBeCloseTo(1, 3);
    });
  });

  describe("T043 - Line-plane intersection", () => {
    it("intersects line with plane at a point", () => {
      // Line through origin along x-axis, plane passing through origin with normal [1, 1, 1]
      const inter = linePlaneIntersection([0, 0, 0], [1, 0, 0], [0, 0, 0], [1, 1, 1]);
      expect(inter.type).toBe("point");
      expect(inter.intersectionPoint).toEqual([0, 0, 0]);
    });

    it("detects line contained in plane", () => {
      // Line in plane z=0, plane z=0
      const inter = linePlaneIntersection([0, 0, 0], [1, 1, 0], [0, 0, 0], [0, 0, 1]);
      expect(inter.type).toBe("line");
    });

    it("detects parallel line not in plane", () => {
      // Line parallel to xy-plane at z=1, plane z=0
      const inter = linePlaneIntersection([0, 0, 1], [1, 0, 0], [0, 0, 0], [0, 0, 1]);
      expect(inter.type).toBe("none");
    });
  });
});

  describe("T017 - Parallelepiped collapse animation", () => {
    it("interpolates w towards coplanar with u,v", () => {
      const u: Vector3 = [1, 0, 0];
      const v: Vector3 = [0, 1, 0];
      const w: Vector3 = [0, 0, 2];
      
      const collapsed = interpolateCollapseVector(w, u, v, 0.5, "coplanar");
      expect(collapsed[2]).toBe(1); // z = 2 * (1 - 0.5) = 1
      expect(collapsed[0]).toBe(0);
      expect(collapsed[1]).toBe(0);
    });

    it("interpolates w towards zero", () => {
      const u: Vector3 = [1, 0, 0];
      const v: Vector3 = [0, 1, 0];
      const w: Vector3 = [0, 0, 2];
      
      const collapsed = interpolateCollapseVector(w, u, v, 0.5, "zero");
      expect(collapsed[2]).toBe(1); // z = 2 * (1 - 0.5) = 1
      expect(collapsed[0]).toBe(0);
      expect(collapsed[1]).toBe(0);
    });

    it("collapses to zero at factor=1 (coplanar)", () => {
      const u: Vector3 = [1, 0, 0];
      const v: Vector3 = [0, 1, 0];
      const w: Vector3 = [0, 0, 2];
      
      const collapsed = interpolateCollapseVector(w, u, v, 1.0, "coplanar");
      expect(collapsed).toEqual([0, 0, 0]);
    });

    it("collapses to zero at factor=1 (zero target)", () => {
      const u: Vector3 = [1, 0, 0];
      const v: Vector3 = [0, 1, 0];
      const w: Vector3 = [0, 0, 2];
      
      const collapsed = interpolateCollapseVector(w, u, v, 1.0, "zero");
      expect(collapsed).toEqual([0, 0, 0]);
    });

    it("computeCollapseStudy returns correct volume at factor", () => {
      const u: Vector3 = [1, 0, 0];
      const v: Vector3 = [0, 2, 0];
      const w: Vector3 = [0, 0, 3];
      
      // Volumen original = |1·(2×3)| = 6
      const study = computeCollapseStudy(u, v, w, 0.5, "coplanar");
      expect(study.volumeOriginal).toBe(6);
      expect(study.volumeAtFactor).toBe(3); // mitad
      expect(study.factor).toBe(0.5);
      expect(study.isCollapsed).toBe(false);
      expect(study.explanation).toContain("50.0%");
    });

    it("collapses completely at factor=1", () => {
      const u: Vector3 = [1, 0, 0];
      const v: Vector3 = [0, 2, 0];
      const w: Vector3 = [0, 0, 3];
      
      const study = computeCollapseStudy(u, v, w, 1.0, "coplanar");
      expect(study.volumeAtFactor).toBe(0);
      expect(study.isCollapsed).toBe(true);
      expect(study.explanation).toContain("colapsado");
    });
  });
