import { describe, expect, it } from "vitest";
import { computeVectorStudy, type VectorStudyMode } from "../src/vectorStudy.js";

const a = [3, 2], b = [-1, 4], o = [0, 0];
const run = (mode: VectorStudyMode, extra: Record<string, unknown> = {}) =>
  computeVectorStudy({ mode, origin: o, vector: a, other: b, factor: 2, secondFactor: 3, ...extra });

describe("vector study numeric engine — lote 01", () => {
  it.each([
    "classify", "coordinates", "translate", "components", "displacement",
    "compare", "sum", "difference", "scale", "properties", "combination",
  ] as VectorStudyMode[])("supports %s with mathematical steps", mode => {
    const data = run(mode);
    expect(data.topic).toMatch(/^01\./);
    expect(data.steps.length).toBeGreaterThan(0);
    expect(data.arrows.length).toBeGreaterThan(0);
    expect(data.result.every(Number.isFinite)).toBe(true);
  });
  it("uses the parallelogram and head-to-tail for sums and differences", () => {
    expect(run("sum").result).toEqual([2, 6]);
    expect(run("difference").result).toEqual([4, -2]);
    expect(run("sum").arrows.some(v => v.dashed)).toBe(true);
  });
  it("handles endpoints instead of interpreting absolute B as vector", () => {
    const data = run("displacement", { origin:[1,1], other:[4,5] });
    expect(data.result).toEqual([3,4]);
    expect(data.steps[1].expression).toContain("5");
  });
  it("keeps all three components and tests collinear and zero cases", () => {
    expect(run("sum",{origin:[0,0,0],vector:[1,2,3],other:[4,5,6]}).result)
      .toEqual([5,7,9]);
    expect(run("combination",{origin:[0,0,0],vector:[1,2,3],other:[2,4,6]})
      .explanation).toMatch(/colineales/);
    expect(run("combination",{vector:[0,0],other:[2,3]}).explanation)
      .toMatch(/colineales/);
  });
  it("checks equality, quadrants and properties", () => {
    expect(run("compare",{other:[3,2]}).explanation).toMatch(/iguales/);
    expect(run("coordinates",{vector:[-2,3]}).explanation).toContain("II");
    expect(run("properties").steps.map(step=>step.title))
      .toEqual(["Conmutatividad","Asociatividad","Distributividad"]);
  });
  it("handles zero, negative scalars and invalid inputs", () => {
    expect(run("scale",{factor:0}).result).toEqual([0,0]);
    expect(run("scale",{factor:-2}).result).toEqual([-6,-4]);
    expect(() => run("sum",{other:[1,2,3]})).toThrow(/2 números/);
    expect(() => run("scale",{factor:Infinity})).toThrow(/finito/);
    expect(() => run("sum",{vector:[Number.NaN,2]})).toThrow(/finitos/);
  });
});