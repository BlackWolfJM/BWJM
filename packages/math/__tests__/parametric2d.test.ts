import { describe, expect, it } from "vitest";
import { sampleParametric2D } from "../src/parametric2d.js";

describe("parametric2d motion", () => {
  it("samples a circle and computes a moving particle tangent", () => {
    const result = sampleParametric2D({ x: "cos(t)", y: "sin(t)", domain: [0, 2 * Math.PI], samples: 101 }, Math.PI / 2);
    expect(result.points).toHaveLength(101);
    expect(result.kinematics.position.x).toBeCloseTo(0, 3);
    expect(result.kinematics.position.y).toBeCloseTo(1, 3);
    expect(result.kinematics.velocity.x).toBeCloseTo(-1, 3);
    expect(result.kinematics.curvature).toBeCloseTo(1, 2);
  });
  it("includes finite samples from a constrained real domain", () => {
    const result = sampleParametric2D({ x: "t", y: "sqrt(t)", domain: [-1, 1], samples: 11 }, 0.5);
    expect(result.points.length).toBeLessThan(11);
  });
});
