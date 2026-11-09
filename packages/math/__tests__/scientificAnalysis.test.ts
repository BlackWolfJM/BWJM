import { describe, expect, it } from "vitest";
import { fitLinearRegression, generateFunctionTable, summarizeColumn } from "../src/scientificAnalysis.js";

describe("reproducible scientific analyses", () => {
  it("samples a parametrized circle with reusable data columns", () => {
    const data = generateFunctionTable({ variable: "t", domain: [0, 2 * Math.PI], samples: 5,
      columns: ["t", "x", "y"], expressions: ["cos(t)", "sin(t)"] });
    expect(data.rows).toHaveLength(5);
    expect(data.rows[0]).toEqual([0, 1, 0]);
    expect(data.rows[1][1]).toBeCloseTo(0, 9);
    expect(data.rows[1][2]).toBeCloseTo(1, 9);
  });
  it("leaves invalid-domain samples missing rather than displaying imaginary values", () => {
    const data = generateFunctionTable({ variable: "x", domain: [-1, 1], samples: 3,
      columns: ["x", "sqrt(x)"], expressions: ["sqrt(x)"] });
    expect(data.rows[0][1]).toBeNull();
    expect(data.rows[2][1]).toBe(1);
  });
  it("computes unbiased variance and quartiles", () => {
    const result = summarizeColumn([1, 2, 3, 4, 5]);
    expect(result?.mean).toBe(3);
    expect(result?.variance).toBeCloseTo(2.5);
    expect(result?.q1).toBe(2);
    expect(result?.q3).toBe(4);
  });
  it("fits a straight line exactly", () => {
    const result = fitLinearRegression([0, 1, 2, 3], [1, 3, 5, 7]);
    expect(result?.slope).toBeCloseTo(2);
    expect(result?.intercept).toBeCloseTo(1);
    expect(result?.r2).toBeCloseTo(1);
  });
  it("rejects degenerate regressions", () => {
    expect(fitLinearRegression([1, 1, 1], [2, 3, 4])).toBeNull();
  });
});
