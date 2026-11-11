import { describe, expect, it } from "vitest";
import { chooseIntegrationMethod } from "../src/integrationDecision.js";

const allChecks = ["boundary", "orientation", "regularity"];

describe("41.08 · selección de un método de integración", () => {
  it.each([
    ["planar-circulation", "Green"],
    ["spatial-circulation", "Stokes"],
    ["flux", "Gauss"],
  ] as const)("recomienda %s únicamente con todas las hipótesis", (kind, theorem) => {
    expect(chooseIntegrationMethod(kind, allChecks).method).toBe(theorem);
    for (const omitted of allChecks) {
      const result = chooseIntegrationMethod(kind, allChecks.filter(id => id !== omitted));
      expect(result.method).toBe("Integración directa");
      expect(result.missing.map(check => check.id)).toEqual([omitted]);
    }
  });

  it("exige un potencial conocido antes de usar la diferencia de extremos", () => {
    expect(chooseIntegrationMethod("open-line", allChecks).method).toBe("Integración directa");
    expect(chooseIntegrationMethod("open-line", ["potential"])).toMatchObject({
      method: "Potencial",
      detail: "∫C F · dr = φ(B) − φ(A)",
      missing: [],
    });
  });
});
