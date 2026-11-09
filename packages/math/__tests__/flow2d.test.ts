import { describe, expect, it } from "vitest";
import { sampleFlow2D } from "../src/flow2d.js";

describe("vector-field streamline scenes", () => {
  it("integrates a rotating vector field using RK4", () => {
    const result = sampleFlow2D(["-y", "x"], [[1, 0]], Math.PI / 2, 0.02);
    const points = result.flowlines[0];
    expect(points.length).toBeGreaterThan(10);
    expect(points[points.length - 1][0]).toBeCloseTo(0, 1);
    expect(points[points.length - 1][1]).toBeCloseTo(1, 1);
  });
  it("rejects oversized integration horizons", () => {
    expect(() => sampleFlow2D(["x", "y"], [[1, 0]], 200, 0.02)).toThrow();
  });
});
